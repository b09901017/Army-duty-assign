/************************************************************************
 * 261 排勤務板 — LINE webhook / 公版 inbox（獨立 Apps Script）
 *
 * 這是「LINE bot 後端」，跟管資料的 sync_AppsScript.gs 分開部署、互不干擾。
 * 功能：
 *   1) 轉傳「空白公版」→ 存 inbox 配 key，回 Flex 按鈕「排班」（連 LIFF）。
 *   2) 轉傳「行動準據」→ 存 inbox（type=guide），回 Flex 按鈕「上傳準據」
 *      （連 LIFF ?type=guide；點了在 LIFF 端解析日期、上傳雲端）。
 *   3) liff.html 用 doGet?key=xxx 拿回原文（回 {text,type}）。
 *   4) 查詢指令：「7/21 公版」「7/21 分工」「公版」「分工」→ 讀 sync 試算表
 *      data 分頁的 texts[日期] 回文字（要 App 先排好按發送才有）。
 *   5) 「whoami」回 userId；「指令/help」回說明。
 *   6) 白名單（ALLOW_UIDS）控管：名單外的人不給按鈕、不給查詢。
 *   · 公版/準據的判斷：classifyText_（🔷/勤務→公版；行動準據/時間軸→準據）。
 *
 * ── 部署步驟 ──────────────────────────────────────────────
 * A. 開一個「新的」Apps Script 專案（script.google.com → 新專案），
 *    把這整個檔案貼進去（不要動 sync_AppsScript.gs）。
 * B. 專案設定 → 指令碼屬性（Script Properties）新增：
 *      CHANNEL_TOKEN = LINE Messaging API 的 Channel access token(long-lived)
 *      SHEET_ID      = 你那份 Google 試算表的 ID（網址 /d/ 後面那串）
 *      LIFF_ID       = LINE 的 LIFF ID（例 1234567890-abcdef）
 *      ALLOW_UIDS    = 允許排班的 LINE userId，逗號分隔；先留空＝全部允許
 * C. 部署 → 新增部署作業 → 類型「網頁應用程式」：
 *      執行身分＝我；存取權＝任何人 → 部署，取得 /exec 網址。
 * D. 把 /exec 網址：
 *      - 貼到 LINE Developers → Messaging API → Webhook URL，並開 Use webhook。
 *      - 貼到 liff.html 的 GONGBAN_FETCH_URL。
 * E. 拿 userId：先不填 ALLOW_UIDS，傳「whoami」給 bot → 它回你的 userId，
 *      複製貼進 ALLOW_UIDS（多人用逗號分隔）→ 重新部署（新版本）。
 * ── 改完 .gs 要「管理部署作業 → 編輯 → 新版本 → 部署」，網址不變 ──
 ***********************************************************************/

function props_(){ return PropertiesService.getScriptProperties(); }
function prop_(k){ return props_().getProperty(k) || ''; }

function ss_(){ return SpreadsheetApp.openById(prop_('SHEET_ID')); }
function inbox_(){
  var ss = ss_(), sh = ss.getSheetByName('inbox');
  if(!sh){ sh = ss.insertSheet('inbox'); sh.appendRow(['key','text','ts','uid']); }
  return sh;
}

/* ---------- doGet：liff.html 用 ?key= 取原文（回 {text,type}）；沒帶 key 就回存活訊息 ---------- */
function doGet(e){
  var p = (e && e.parameter) || {};
  if(p.key){
    var sh = inbox_(), data = sh.getDataRange().getValues();
    for(var i = data.length - 1; i >= 1; i--){            // 由新到舊找
      if(String(data[i][0]) === String(p.key)) return json_({ text: String(data[i][1] || ''), type: String(data[i][4] || 'gongban') });
    }
    return json_({ text: '', type: '' });                  // 找不到（key 過期或錯）
  }
  return json_({ ok: true, msg: 'LINE webhook alive' });
}

/* ---------- doPost：LINE webhook 進來這裡 ---------- */
function doPost(e){
  var body = {};
  try{ body = JSON.parse(e.postData.contents); }catch(err){ return json_({ ok:false }); }
  var events = body.events || [];
  for(var i = 0; i < events.length; i++){
    try{ handleEvent_(events[i]); }catch(err){ /* 單則失敗不影響其它 */ }
  }
  return json_({ ok: true });                              // LINE 只在意 HTTP 200
}

function handleEvent_(ev){
  if(!ev || ev.type !== 'message' || !ev.message || ev.message.type !== 'text') return;
  var uid  = (ev.source && ev.source.userId) || '';
  var text = ev.message.text || '';
  var token = ev.replyToken;

  // 查 id 模式（白名單前先放行，讓你能拿到自己的 userId）
  if(/^\s*whoami\s*$/i.test(text)){ reply_(token, [textMsg_('你的 userId：\n' + uid)]); return; }

  if(!allowed_(uid)){ reply_(token, [textMsg_('你沒有排班權限（userId 不在白名單）。傳「whoami」可查自己的 id。')]); return; }

  // 指令說明
  if(/^\s*(help|指令|說明|？|\?)\s*$/i.test(text)){ reply_(token, [textMsg_(helpText_())]); return; }

  // 查詢指令（單行，如「7/21 公版」「分工」）→ 讀雲端 texts 回文字
  if(tryQuery_(text, token)) return;

  // 分類：行動準據 or 公版
  var kind = classifyText_(text);
  if(kind === 'unknown'){
    reply_(token, [textMsg_('看不懂這則訊息。\n· 轉傳「空白公版」→ 我給你排班按鈕\n· 轉傳「行動準據」→ 我給你上傳按鈕\n· 傳「7/21 公版」或「7/21 分工」→ 查已排好的\n· 傳「指令」看說明')]); return;
  }

  var md = extractDate_(text);
  var key = Utilities.getUuid();
  inbox_().appendRow([key, text, new Date().getTime(), uid, kind]);   // 第 5 欄存 type
  trimInbox_(300);

  var baseUrl = 'https://liff.line.me/' + prop_('LIFF_ID') + '?key=' + encodeURIComponent(key);
  if(kind === 'guide'){
    reply_(token, [flexGuide_(baseUrl + '&type=guide', md)]);
  }else{
    reply_(token, [flexGongban_(baseUrl, text, md)]);
  }
}

/* ---------- 分類：公版 vs 行動準據 ---------- */
function classifyText_(t){
  t = String(t || '');
  var first = (t.split('\n')[0] || '');
  if(/行動準[據則]/.test(t)) return 'guide';                 // 標題就寫了
  if(/🔷/.test(t) || /勤務/.test(first)) return 'gongban';   // 公版強特徵：🔷 區塊、標題「勤務」
  // fallback 計分（用於沒有標題的殘缺轉傳）
  var lines = t.split('\n'), flow = 0;
  for(var i = 0; i < lines.length; i++){ if(/^\s*\d{3,4}(\D|$)/.test(lines[i])) flow++; }   // 「HHMM 事件」時間軸行
  var keycap = (t.match(/⃣/g) || []).length;            // 1️⃣2️⃣… 圓圈數字
  var guideKw = /(部隊起床|部隊就寢|升旗|用餐|打飯作業|水電管制|點名|開庫取裝|操課|莒光)/.test(t);
  var gongKw  = /(衛哨|261|260|258|分菜)/.test(t);
  var gs = (flow >= 3 ? 2 : 0) + (keycap >= 1 ? 1 : 0) + (guideKw ? 2 : 0);
  var bs = (gongKw ? 2 : 0);
  if(gs > bs) return 'guide';
  if(bs > 0)  return 'gongban';
  return 'unknown';
}
function extractDate_(t){ var m = String(t || '').match(/(\d{1,2})\s*[\/月]\s*(\d{1,2})/); return m ? (parseInt(m[1], 10) + '/' + parseInt(m[2], 10)) : ''; }

/* ---------- 日期相對描述（bot 按鈕文字用） ---------- */
function tz_(){ return ss_().getSpreadsheetTimeZone() || 'Asia/Taipei'; }
function shiftMD_(n){ var d = new Date(); d.setDate(d.getDate() + n); return Utilities.formatDate(d, tz_(), 'M/d'); }
function todayMD_(){ return shiftMD_(0); }
function relDay_(md){ if(!md) return ''; if(md === todayMD_()) return '今天'; if(md === shiftMD_(1)) return '明天'; if(md === shiftMD_(-1)) return '昨天'; return md; }

/* ---------- 查詢指令：讀雲端 texts 回文字 ---------- */
function helpText_(){
  return '📋 261 排勤務板 bot 指令：\n\n· 轉傳空白公版 → 給你排班按鈕\n· 轉傳行動準據 → 給你上傳按鈕\n· 「7/21 公版」→ 回那天填好的公版\n· 「7/21 分工」→ 回那天的個人分工\n· 只打「公版」「分工」→ 預設今天\n· 「whoami」→ 查你的 userId';
}
function tryQuery_(text, token){
  if(/[\r\n]/.test(text)) return false;                     // 多行＝貼上的原文，不是查詢
  if(!/公版|分工|個人分工|排班表/.test(text)) return false;
  var md = extractDate_(text) || todayMD_();
  var wantPersons = /分工/.test(text);
  var data = syncData_(), texts = (data && data.texts) || {};
  var rec = texts[md];
  if(!rec){ reply_(token, [textMsg_('還沒有 ' + md + ' 的資料。\n先在排班頁排好、按「發送」就會存起來，之後就查得到了。')]); return true; }
  var out = wantPersons ? (rec.persons || '') : (rec.filled || '');
  if(!out){ reply_(token, [textMsg_(md + ' 目前沒有' + (wantPersons ? '個人分工' : '填好的公版') + '。')]); return true; }
  reply_(token, [textMsg_(out)]);
  return true;
}
/* 讀 sync 試算表 data 分頁的分片 JSON（跟 sync_AppsScript.gs 的 read_ 一樣：A1..A30 串接） */
function syncData_(){
  try{
    var sh = ss_().getSheetByName('data'); if(!sh) return {};
    var vals = sh.getRange(1, 1, 30, 1).getValues(), s = '';
    for(var i = 0; i < vals.length; i++){ var v = vals[i][0]; if(v === '' || v == null) break; s += String(v); }
    return JSON.parse(s || '{}');
  }catch(e){ return {}; }
}

/* ---------- 白名單 ---------- */
function allowed_(uid){
  var raw = prop_('ALLOW_UIDS');
  if(!raw || !raw.replace(/\s/g,'')) return true;          // 沒設＝全部允許（測試用）
  var list = raw.split(',').map(function(s){ return s.trim(); });
  return list.indexOf(uid) >= 0;
}

/* ---------- inbox 清理 ---------- */
function trimInbox_(keep){
  var sh = inbox_(), n = sh.getLastRow();                  // 含表頭
  var extra = n - 1 - keep;
  if(extra > 0) sh.deleteRows(2, extra);                   // 刪最舊的（第 2 列起）
}

/* ---------- LINE reply API ---------- */
function reply_(token, messages){
  if(!token) return;
  UrlFetchApp.fetch('https://api.line.me/v2/bot/message/reply', {
    method: 'post',
    contentType: 'application/json',
    headers: { Authorization: 'Bearer ' + prop_('CHANNEL_TOKEN') },
    payload: JSON.stringify({ replyToken: token, messages: messages }),
    muteHttpExceptions: true
  });
}
function textMsg_(t){ return { type: 'text', text: t }; }
function dateTag_(md){ var r = relDay_(md); return md ? (r === md ? md : (r + '　' + md)) : ''; }
function flexBubble_(altText, title, subtitle, btnLabel, btnColor, url){
  var body = [{ type: 'text', text: title, weight: 'bold', size: 'lg', color: '#2A4634' }];
  if(subtitle) body.push({ type: 'text', text: subtitle, size: 'sm', color: '#6C7268', wrap: true });
  body.push({ type: 'button', style: 'primary', color: btnColor, action: { type: 'uri', label: btnLabel, uri: url } });
  return { type: 'flex', altText: altText, contents: { type: 'bubble', body: { type: 'box', layout: 'vertical', spacing: 'md', contents: body } } };
}
function flexGongban_(url, gongban, md){
  var dt = dateTag_(md);
  return flexBubble_('接到公版了，點我排班', '接到公版了', (dt ? (dt + ' 的公版') : '空白公版'),
                     (md ? ('排 ' + relDay_(md) + ' 的班') : '點我排班'), '#2A4634', url);
}
function flexGuide_(url, md){
  var dt = dateTag_(md);
  return flexBubble_('收到行動準據，點我上傳', '收到行動準據', (dt ? (dt) : '（未標日期）'),
                     (md ? ('上傳 ' + relDay_(md) + ' 準據') : '點我上傳'), '#A9793F', url);
}

/* ---------- 工具 ---------- */
function json_(o){
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}
