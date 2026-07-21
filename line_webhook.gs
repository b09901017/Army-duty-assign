/************************************************************************
 * 261 排勤務板 — LINE webhook / 公版 inbox（獨立 Apps Script）
 *
 * 這是「LINE bot 後端」，跟管資料的 sync_AppsScript.gs 分開部署、互不干擾。
 * 功能：
 *   1) 你把班長的空白公版轉傳給 bot → 存進試算表 inbox 分頁、配一把 key，
 *      回一則 Flex 訊息（一顆按鈕「點我排班」連到 LIFF）。
 *   2) liff.html 用 doGet?key=xxx 跟這裡拿回公版原文。
 *   3) 傳「whoami」給 bot → 回你的 userId（設白名單用）。
 *   4) 白名單（ALLOW_UIDS）控管：名單外的人轉公版不給按鈕。
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

/* ---------- doGet：liff.html 用 ?key= 取公版；沒帶 key 就回存活訊息 ---------- */
function doGet(e){
  var p = (e && e.parameter) || {};
  if(p.key){
    var sh = inbox_(), data = sh.getDataRange().getValues();
    for(var i = data.length - 1; i >= 1; i--){            // 由新到舊找
      if(String(data[i][0]) === String(p.key)) return json_({ text: String(data[i][1] || '') });
    }
    return json_({ text: '' });                            // 找不到（key 過期或錯）
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

  if(!looksLikeGongban_(text)){
    reply_(token, [textMsg_('把班長的「空白公版」整份轉傳給我，我就給你排班按鈕。')]); return;
  }

  var key = Utilities.getUuid();
  inbox_().appendRow([key, text, new Date().getTime(), uid]);
  trimInbox_(300);                                         // 只留最近 300 筆，避免無限長

  var url = 'https://liff.line.me/' + prop_('LIFF_ID') + '?key=' + encodeURIComponent(key);
  reply_(token, [flexButton_(url, text)]);
}

/* ---------- 判斷／白名單 ---------- */
function looksLikeGongban_(t){ return /261|打飯|打掃|公差|🔷|🔵/.test(t || ''); }
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
function flexButton_(url, gongban){
  var preview = String(gongban || '').split('\n').map(function(s){ return s.trim(); })
                  .filter(String).slice(0, 3).join('　');
  if(preview.length > 60) preview = preview.slice(0, 60) + '…';
  return {
    type: 'flex',
    altText: '接到公版了，點我排班',
    contents: {
      type: 'bubble',
      body: {
        type: 'box', layout: 'vertical', spacing: 'md',
        contents: [
          { type: 'text', text: '接到公版了', weight: 'bold', size: 'lg', color: '#2A4634' },
          { type: 'text', text: (preview || '（空白公版）'), size: 'sm', color: '#6C7268', wrap: true },
          { type: 'button', style: 'primary', color: '#2A4634',
            action: { type: 'uri', label: '點我排班', uri: url } }
        ]
      }
    }
  };
}

/* ---------- 工具 ---------- */
function json_(o){
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}
