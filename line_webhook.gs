/************************************************************************
 * 261 排勤務板 — LINE webhook / 公版 inbox（獨立 Apps Script）
 *
 * 這是「LINE bot 後端」，跟管資料的 sync_AppsScript.gs 分開部署、互不干擾。
 * 功能：
 *   1) 轉傳「空白公版」→（限編輯者）回 Flex 按鈕「排班」（連 LIFF）。
 *   2) 轉傳「行動準據」→（限編輯者）回 Flex「上傳準據」（連 LIFF ?type=guide）。
 *   3) liff.html 用 doGet?key=xxx 拿回原文（回 {text,type}）；doGet?canedit=uid
 *      回 {edit:bool}（liff 動態問這個人能不能編輯）。
 *   4) 查詢（看結果，全群開放）：「公版」「分工」回文字；「行程」回 carousel
 *      三頁，每頁「預覽內容」（八人時段表/當天流程/八人分工）＋「看完整」開
 *      LIFF 唯讀檢視。可加日期。
 *   5) 情境：群組預設安靜，只回查詢/指令/@提及/語音；一對一你一句他一句。
 *   6) 權限拆分：看結果全開；排班/上傳＝owner(ALLOW_UIDS)＋機器人管理的
 *      editors 名單。隊友打「開通編輯權限」→拿隨機碼→貼給班頭→班頭打
 *      「開通 K-XXXX」。
 *   7) @提及機器人／「指令」→ 選單(quick reply)；語音→「浩ㄏㄠˇ～」；
 *      「app」→ 完整版 App 網址；「關燈」→ 隨機抽班上一人 @他去關燈。
 *   · 公版/準據判斷：classifyText_（🔷/勤務→公版；行動準據/時間軸→準據）。
 *
 * ── 部署步驟 ──────────────────────────────────────────────
 * A. 開一個「新的」Apps Script 專案（script.google.com → 新專案），
 *    把這整個檔案貼進去（不要動 sync_AppsScript.gs）。
 * B. 專案設定 → 指令碼屬性（Script Properties）新增：
 *      CHANNEL_TOKEN = LINE Messaging API 的 Channel access token(long-lived)
 *      SHEET_ID      = 你那份 Google 試算表的 ID（網址 /d/ 後面那串）
 *      LIFF_ID       = LINE 的 LIFF ID（例 1234567890-abcdef）
 *      ALLOW_UIDS    = 「班頭」的 LINE userId，逗號分隔；空＝測試全開。其他編輯者
 *                      不用填這裡，用「開通 代碼」由機器人加進 editors 分頁。
 *      APP_URL       =（選填）完整版 App 網址；不填用預設 github.io 那條。
 *      OWNER_NAME    =（選填）班頭名字，隨機碼提示「請貼給 XXX」用；預設「旭辰」。
 *      SCHED_IMG_URL =（選填）行程 carousel「八人時段表」那張的固定圖片網址；
 *                      不填用預設 github.io 上的 data/schedule8.jpg。改值即時生效、
 *                      不用重部署。要退回文字預覽卡：把值設成 none（或 off）。
 *   分頁：inbox、codes（代碼↔uid）、editors（編輯者）、members（群組認人）自動建。
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

/* 261 班名冊（關燈抽人、名字清理用）；班頭名字可用 OWNER_NAME 屬性覆蓋 */
var ROSTER = [
  { code:'01', name:'李愷宸' }, { code:'02', name:'江偉綸' }, { code:'03', name:'陳柏翰' }, { code:'04', name:'鄧旭辰' },
  { code:'05', name:'廖翊滕' }, { code:'06', name:'陳俊穎' }, { code:'07', name:'林柏宇' }, { code:'08', name:'林崇浩' }
];
function ownerName_(){ return prop_('OWNER_NAME') || '旭辰'; }

function ss_(){ return SpreadsheetApp.openById(prop_('SHEET_ID')); }
function inbox_(){
  var ss = ss_(), sh = ss.getSheetByName('inbox');
  if(!sh){ sh = ss.insertSheet('inbox'); sh.appendRow(['key','text','ts','uid']); }
  return sh;
}

/* ---------- doGet：liff.html 用 ?key= 取原文（回 {text,type}）；沒帶 key 就回存活訊息 ---------- */
function doGet(e){
  var p = (e && e.parameter) || {};
  if(p.canedit){ return json_({ edit: allowedEdit_(String(p.canedit)) }); }   // liff 動態問「這個 userId 能不能編輯」
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
  if(!ev || ev.type !== 'message') return;
  var src = ev.source || {}, ctype = src.type || 'user', isGroup = (ctype === 'group' || ctype === 'room');
  var gid = src.groupId || src.roomId || '';
  var uid = src.userId || '', token = ev.replyToken, msg = ev.message || {};

  // 語音訊息 → 彩蛋（群組＋一對一都回）
  if(msg.type === 'audio'){ reply_(token, [textMsg_('浩ㄏㄠˇ～～～')]); return; }
  if(msg.type !== 'text') return;
  var text = (msg.text || '').trim();

  // 被動認人：群組裡有人講話就記下 uid↔顯示名（給「關燈」@人用；已記過就跳過不再打 API）
  if(ctype === 'group' && gid && uid) learnMember_(gid, uid);

  // @提及機器人 → 出來說話 + 指令快捷（主要用在群組）
  if(isMentioned_(msg)){ reply_(token, [introMsg_()]); return; }

  // 關燈 → 隨機抽一個班上的人 @他去關燈
  if(/^(關燈|關電燈|關個燈|誰去?關燈)$/.test(text)){ lightsOut_(gid, ctype, token); return; }

  // ── 身分／管理指令（不分群組或一對一）──
  if(/^(開通編輯權限|申請(編輯|排班)?權限|代碼|我要排班|whoami|我的(id|userid|代碼|碼))$/i.test(text)){ reply_(token, [textMsg_(myCode_(uid))]); return; }
  if(/^開通\s+\S/.test(text)){ grantCmd_(text, uid, token, isGroup); return; }        // 開通 K-XXXX（要空格＋代碼）
  if(/^(移除|停權)\s+\S/.test(text)){ revokeCmd_(text, uid, token, isGroup); return; }
  if(/^(名單|編輯名單|editors)$/i.test(text)){ listEditorsCmd_(uid, token, isGroup); return; }

  // ── 說明／App 連結 ──
  if(/^(help|指令|說明|選單|menu|？|\?)$/i.test(text)){ reply_(token, [introMsg_()]); return; }
  if(/^(app|完整版|完整app|網址|連結|app網址)$/i.test(text)){ reply_(token, [textMsg_(appUrlText_())]); return; }

  // ── 查詢（看結果，全群開放）──
  var q = parseQuery_(text);
  if(q){ answerQuery_(q, token); return; }

  // ── 貼原文（公版／行動準據）→ 需要編輯權限 ──
  var kind = classifyText_(text);
  if(kind === 'unknown'){
    if(isGroup) return;                        // 群組閒聊 → 安靜，不回「看不懂」
    reply_(token, [introMsg_()]);              // 一對一 → 給選單引導
    return;
  }
  // 群組：貼上完整公版／行動準據一律不回覆（群組只提供查詢資訊，不洗版）。
  // 要拿排班／上傳按鈕，請私訊 bot（一對一）貼公版。
  if(isGroup) return;
  if(!allowedEdit_(uid)){
    reply_(token, [textMsg_('你不是排班負責人。看結果可以打「公版」「分工」「行程」；想排班就打「代碼」拿代碼給班頭開通。')]);
    return;
  }
  var md = extractDate_(text);
  var key = Utilities.getUuid();
  inbox_().appendRow([key, text, new Date().getTime(), uid, kind]);   // 第 5 欄存 type
  trimInbox_(300);
  var baseUrl = 'https://liff.line.me/' + prop_('LIFF_ID') + '?key=' + encodeURIComponent(key);
  reply_(token, [ kind === 'guide' ? flexGuide_(baseUrl + '&type=guide', md) : flexGongban_(baseUrl, text, md) ]);
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

/* ---------- 查詢（看結果）：公版/分工回文字、行程回 carousel 三頁 ---------- */
function parseQuery_(text){
  if(/[\r\n]/.test(text)) return null;                      // 多行＝貼上的原文，不是查詢
  var md = extractDate_(text) || todayMD_();
  if(/分工|個人分工/.test(text))      return { kind: 'persons',  md: md };
  if(/公版|填好/.test(text))          return { kind: 'gongban',  md: md };
  if(/行程|流程|時段|八人/.test(text)) return { kind: 'schedule', md: md };
  return null;
}
function answerQuery_(q, token){
  var data = syncData_();
  if(q.kind === 'schedule'){
    var has = (data.texts && data.texts[q.md]) || (data.boards && data.boards[q.md]) || (data.plans && data.plans[q.md]);
    if(!has){ reply_(token, [textMsg_('還沒有 ' + q.md + ' 的行程。先在 App 排好、按發送就會有了。')]); return; }
    reply_(token, [carouselSchedule_(q.md, data)]); return;
  }
  var rec = (data.texts || {})[q.md];
  if(!rec){ reply_(token, [textMsg_('還沒有 ' + q.md + ' 的資料。先在排班頁排好、按「發送」就會存起來，之後就查得到了。')]); return; }
  var out = q.kind === 'persons' ? (rec.persons || '') : (rec.filled || '');
  if(!out){ reply_(token, [textMsg_(q.md + ' 目前沒有' + (q.kind === 'persons' ? '個人分工' : '填好的公版') + '。')]); return; }
  reply_(token, [textMsg_(out)]);
}
/* ---------- 行程 carousel：三頁 kilo bubble，各自「預覽內容」＋按鈕開 LIFF 唯讀完整檢視 ---------- */
function nm_(names, id){ return (names && names[id]) ? names[id] : ('0' + id).slice(-2); }
function short_(s){ s = String(s || ''); return s.length <= 2 ? s : s.slice(-2); }
function hm2_(range){ var t = String(range || '').replace(/[^0-9]/g, '').slice(0, 4); if(t.length < 4) return t; var h = t.slice(0, 2); return (h === '24' ? '00' : h) + ':' + t.slice(2, 4); }
function dayPreview_(data, md){
  var names = data.names || {}, plan = (data.plans || {})[md] || null, board = (data.boards || {})[md] || null;
  var sched = (plan && plan.schedule) || (board && board.schedule && board.schedule.items) || [];
  var events = (plan && plan.events) || [];
  var schedRows = sched.filter(function(it){ return it && it.min != null; }).sort(function(a, b){ return a.min - b.min; })
    .map(function(it){ return { t: hm2_(it.range), text: String(it.text || '') }; });
  var evs = events.slice().filter(function(e){ return e && ((e.people && e.people.length) || e.keepAll); })
    .sort(function(a, b){ return (a.min == null ? 9999 : a.min) - (b.min == null ? 9999 : b.min); });
  var byTime = evs.map(function(e){
    var who = e.keepAll ? '全班' : (e.people || []).map(function(id){ return short_(nm_(names, id)); }).join(' ');
    return { t: e.range ? hm2_(e.range) : '', label: String(e.label || ''), who: who };
  });
  var byPerson = [];
  for(var pi = 1; pi <= 8; pi++){
    var items = [];
    evs.forEach(function(e){ if(e.keepAll || (e.people || []).indexOf(pi) >= 0) items.push(String(e.label || '')); });
    byPerson.push({ code: ('0' + pi).slice(-2), name: nm_(names, pi), items: items });
  }
  return { schedRows: schedRows, byTime: byTime, byPerson: byPerson };
}
function rowTimeText_(t, text, tcol){
  return { type: 'box', layout: 'baseline', spacing: 'sm', contents: [
    { type: 'text', text: (t || '—'), size: 'sm', color: (tcol || '#2A4634'), flex: 3, weight: 'bold' },
    { type: 'text', text: (text || '—'), size: 'sm', color: '#20261E', flex: 7, wrap: true }
  ]};
}
function rowPerson_(code, name, items){
  return { type: 'box', layout: 'baseline', spacing: 'sm', contents: [
    { type: 'text', text: code, size: 'sm', color: '#2A4634', flex: 2, weight: 'bold' },
    { type: 'text', text: name + '　' + (items.length ? items.join('、') : '—'), size: 'sm', color: '#20261E', flex: 8, wrap: true }
  ]};
}
function previewBubble_(md, title, rows, url, accent){
  var body = [
    { type: 'text', text: dateTag_(md), size: 'xs', color: '#6C7268' },
    { type: 'text', text: title, weight: 'bold', size: 'lg', color: accent },
    { type: 'separator', margin: 'md' }
  ];
  if(rows.length) rows.forEach(function(r){ body.push(r); });
  else body.push({ type: 'text', text: '（這天沒有內容）', size: 'sm', color: '#6C7268', margin: 'md' });
  return {
    type: 'bubble', size: 'kilo',
    body: { type: 'box', layout: 'vertical', spacing: 'sm', contents: body },
    footer: { type: 'box', layout: 'vertical', contents: [
      { type: 'button', style: 'primary', color: accent, height: 'sm', action: { type: 'uri', label: '看完整', uri: url } }
    ]}
  };
}
/* 時間範圍格式化：0600-0630→06:00-06:30、0530→05:30、無→'' */
function fmtRange_(range){
  var s = String(range || '').replace(/\s/g, '');
  var m = s.match(/(\d{3,4})\s*[-~]\s*(\d{3,4})/); if(m) return hm2_(m[1]) + '-' + hm2_(m[2]);
  var m2 = s.match(/(\d{3,4})/);                    return m2 ? hm2_(m2[1]) : '';
}
/* 行動準據完整重建：讀 plans/boards 的 schedule items（含無時間的行），還原成班長給的時間軸文字 */
function guideText_(data, md){
  var plan = (data.plans || {})[md] || null, board = (data.boards || {})[md] || null;
  var sched = (plan && plan.schedule) || (board && board.schedule && board.schedule.items) || [];
  if(!sched.length) return '';
  return sched.map(function(it){
    var t = fmtRange_(it.range || ''), tx = String(it.text || '');
    return t ? (t + '　' + tx) : tx;
  }).filter(function(s){ return s.replace(/\s/g, ''); }).join('\n');
}
/* 純文字整段卡（完整勤務／行動準據／個人分工）：一整塊 wrap 文字＋底部「視覺化呈現」按鈕連 LIFF */
function textBubbleBtn_(md, title, bodyText, btnLabel, url, accent){
  return {
    type: 'bubble', size: 'kilo',
    body: { type: 'box', layout: 'vertical', spacing: 'sm', contents: [
      { type: 'text', text: dateTag_(md), size: 'xs', color: '#6C7268' },
      { type: 'text', text: title, weight: 'bold', size: 'lg', color: accent },
      { type: 'separator', margin: 'md' },
      { type: 'text', text: (bodyText || '（目前沒有內容）'), size: 'sm', color: '#20261E', wrap: true, margin: 'md' }
    ]},
    footer: { type: 'box', layout: 'vertical', contents: [
      { type: 'button', style: 'primary', color: accent, height: 'sm', action: { type: 'uri', label: btnLabel, uri: url } }
    ]}
  };
}
/* 圖片卡（八人時段表）：上面標題→中間固定圖片→底部「看完整」按鈕（圖放 body、不放 hero，才能標題在上） */
function imageBubble_(md, title, imgUrl, btnLabel, url, accent){
  return {
    type: 'bubble', size: 'kilo',
    body: { type: 'box', layout: 'vertical', spacing: 'sm', contents: [
      { type: 'text', text: dateTag_(md), size: 'xs', color: '#6C7268' },
      { type: 'text', text: title, weight: 'bold', size: 'lg', color: accent },
      { type: 'image', url: imgUrl, size: 'full', aspectRatio: '543:1280', aspectMode: 'cover', margin: 'md', action: { type: 'uri', uri: url } }
    ]},
    footer: { type: 'box', layout: 'vertical', contents: [
      { type: 'button', style: 'primary', color: accent, height: 'sm', action: { type: 'uri', label: btnLabel, uri: url } }
    ]}
  };
}
function carouselSchedule_(md, data){
  data = data || syncData_();
  var pv = dayPreview_(data, md);
  var base = 'https://liff.line.me/' + prop_('LIFF_ID') + '?type=view&date=' + encodeURIComponent(md), MAX = 7;
  var cRows = pv.byTime.slice(0, MAX).map(function(e){ return rowTimeText_(e.t, e.label + (e.who ? ('　' + e.who) : ''), '#2A4634'); });

  var texts   = (data.texts || {})[md] || {};
  var filled  = texts.filled  || '（' + md + ' 還沒排好勤務，先在排班頁排好、按發送）';
  var guide   = guideText_(data, md) || '（' + md + ' 還沒有行動準據，先上傳準據）';
  var persons = texts.persons || '（' + md + ' 還沒有個人分工，先在排班頁排好、按發送）';
  // 固定圖片網址可用 Script Property SCHED_IMG_URL 覆蓋（換圖不用重部署）
  var imgUrl = prop_('SCHED_IMG_URL');
  if(imgUrl === '') imgUrl = 'https://b09901017.github.io/Army-duty-assign/data/schedule8.jpg';   // 沒設＝用預設圖
  if(/^(none|off|no|文字|預覽)$/i.test(imgUrl)) imgUrl = '';                                        // 明確設 none/off＝退回文字預覽卡
  var card4 = imgUrl
    ? imageBubble_(md, '八人時段表', imgUrl, '看完整', base + '&view=C', '#2A4634')
    : previewBubble_(md, '八人時段表', cRows, base + '&view=C', '#2A4634');

  // 4 張：①完整勤務→視覺化(八人時段表 view=C) ②行動準據→視覺化(當天流程 view=A)
  //       ③個人分工→視覺化(八人分工 view=B) ④八人時段表(圖)→看完整(view=C)
  var bubbles = [
    textBubbleBtn_(md, '完整勤務', filled,  '視覺化呈現', base + '&view=C', '#2A4634'),
    textBubbleBtn_(md, '行動準據', guide,   '視覺化呈現', base + '&view=A', '#A9793F'),
    textBubbleBtn_(md, '個人分工', persons, '視覺化呈現', base + '&view=B', '#5479A6'),
    card4
  ];
  return { type: 'flex', altText: md + ' 行程', contents: { type: 'carousel', contents: bubbles } };
}
/* 選單（@提及／help／一對一看不懂時）：介紹 + quick reply 指令快捷 */
function introMsg_(){
  return {
    type: 'text',
    text: '到底是哪裡有問題 🤨\n看結果打「公版」「分工」「行程」（可加日期，例：7/21 公版）。要完整版打「app」。',
    quickReply: { items: [
      qr_('今日公版', '公版'), qr_('今日分工', '分工'), qr_('今日行程', '行程'),
      qr_('完整App', 'app'), qr_('開通編輯權限', '開通編輯權限'), qr_('關燈', '關燈')
    ]}
  };
}
function qr_(label, text){ return { type: 'action', action: { type: 'message', label: label, text: text } }; }
function appUrlText_(){
  var u = prop_('APP_URL') || 'https://b09901017.github.io/Army-duty-assign/';
  return '📱 完整版 App（行程／統計／站哨全都有，預設唯讀、看不會改壞）：\n' + u;
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

/* ---------- 權限：看結果全開；排班/上傳＝owner(ALLOW_UIDS) ＋ editors 分頁 ---------- */
function isOwner_(uid){
  var raw = prop_('ALLOW_UIDS');
  if(!raw || !raw.replace(/\s/g,'')) return false;
  return raw.split(',').map(function(s){ return s.trim(); }).indexOf(uid) >= 0;
}
function allowedEdit_(uid){
  var raw = prop_('ALLOW_UIDS');
  if(!raw || !raw.replace(/\s/g,'')) return true;          // 還沒設 owner＝測試模式全開
  if(!uid) return false;
  return isOwner_(uid) || isEditorSheet_(uid);
}

/* ---------- 友善代碼（codes 分頁：code↔uid）＋ 編輯者名單（editors 分頁） ---------- */
function codes_(){ var ss = ss_(), sh = ss.getSheetByName('codes'); if(!sh){ sh = ss.insertSheet('codes'); sh.appendRow(['code','uid','ts']); } return sh; }
function editors_(){ var ss = ss_(), sh = ss.getSheetByName('editors'); if(!sh){ sh = ss.insertSheet('editors'); sh.appendRow(['uid','ts','code']); } return sh; }
function isEditorSheet_(uid){ var d = editors_().getDataRange().getValues(); for(var i = 1; i < d.length; i++){ if(String(d[i][0]) === uid) return true; } return false; }
function getOrMakeCode_(uid){
  var sh = codes_(), d = sh.getDataRange().getValues();
  for(var i = 1; i < d.length; i++){ if(String(d[i][1]) === uid) return String(d[i][0]); }
  var code = 'K-' + Utilities.getUuid().replace(/[^0-9A-Za-z]/g, '').slice(0, 4).toUpperCase();
  sh.appendRow([code, uid, new Date().getTime()]);
  return code;
}
function uidOfCode_(code){
  code = String(code || '').toUpperCase();
  var sh = codes_(), d = sh.getDataRange().getValues();
  for(var i = 1; i < d.length; i++){ if(String(d[i][0]).toUpperCase() === code) return String(d[i][1]); }
  return '';
}
function myCode_(uid){
  if(!uid) return '抓不到你的 LINE 身分（要用文字訊息，且我要在這個聊天室裡）。';
  if(allowedEdit_(uid)) return '你已經有排班權限了 👍';
  var code = getOrMakeCode_(uid);
  return '為您生成隨機碼：' + code + '\n請貼給 ' + ownerName_();
}
function grantCmd_(text, uid, token, isGroup){
  if(!isOwner_(uid)){ if(!isGroup) reply_(token, [textMsg_('只有班頭能開通別人。')]); return; }
  var code = text.replace(/^開通\s*/, '').trim().toUpperCase();
  if(!code){ reply_(token, [textMsg_('用法：開通 K-XXXX（請對方先打「代碼」拿到）')]); return; }
  var tuid = uidOfCode_(code);
  if(!tuid){ reply_(token, [textMsg_('找不到代碼 ' + code + '。請對方重打「代碼」拿新的貼給你。')]); return; }
  if(isEditorSheet_(tuid) || isOwner_(tuid)){ reply_(token, [textMsg_(code + ' 已經有排班權限了。')]); return; }
  editors_().appendRow([tuid, new Date().getTime(), code]);
  reply_(token, [textMsg_('✅ 已開通 ' + code + ' 的排班權限。')]);
}
function revokeCmd_(text, uid, token, isGroup){
  if(!isOwner_(uid)){ if(!isGroup) reply_(token, [textMsg_('只有班頭能移除。')]); return; }
  var code = text.replace(/^(移除|停權)\s*/, '').trim().toUpperCase();
  var tuid = uidOfCode_(code);
  if(!tuid){ reply_(token, [textMsg_('找不到代碼 ' + code + '。')]); return; }
  var sh = editors_(), d = sh.getDataRange().getValues(), removed = false;
  for(var i = d.length - 1; i >= 1; i--){ if(String(d[i][0]) === tuid){ sh.deleteRow(i + 1); removed = true; } }
  reply_(token, [textMsg_(removed ? ('已移除 ' + code + ' 的排班權限。') : (code + ' 本來就不是編輯者。'))]);
}
function listEditorsCmd_(uid, token, isGroup){
  if(!isOwner_(uid)){ if(!isGroup) reply_(token, [textMsg_('只有班頭能看名單。')]); return; }
  var d = editors_().getDataRange().getValues(), codes = [];
  for(var i = 1; i < d.length; i++){ codes.push(String(d[i][2] || '?')); }
  reply_(token, [textMsg_('額外編輯者：' + (codes.length ? codes.join('、') : '（無）') + '\n（你本人一直都是編輯者）')]);
}

/* ---------- @提及機器人偵測（新版 LINE API mentionees[].isSelf） ---------- */
function isMentioned_(msg){
  try{
    var m = msg.mention; if(!m || !m.mentionees) return false;
    for(var i = 0; i < m.mentionees.length; i++){ if(m.mentionees[i].isSelf === true) return true; }
  }catch(e){}
  return false;
}

/* ---------- 關燈：被動認人 + 隨機抽班上的人 @他 ---------- */
function members_(){ var ss = ss_(), sh = ss.getSheetByName('members'); if(!sh){ sh = ss.insertSheet('members'); sh.appendRow(['gid','uid','name','ts']); } return sh; }
function groupMemberName_(gid, uid){   // 呼叫 LINE getGroupMemberProfile 拿群組內顯示名
  try{
    var r = UrlFetchApp.fetch('https://api.line.me/v2/bot/group/' + gid + '/member/' + uid, {
      headers: { Authorization: 'Bearer ' + prop_('CHANNEL_TOKEN') }, muteHttpExceptions: true
    });
    var o = JSON.parse(r.getContentText() || '{}');
    return o.displayName || '';
  }catch(e){ return ''; }
}
function cleanName_(dn){   // 「261-05廖翊滕」→「廖翊滕」；比對名冊，比對不到就原樣
  dn = String(dn || '');
  for(var i = 0; i < ROSTER.length; i++){ if(dn.indexOf(ROSTER[i].name) >= 0) return ROSTER[i].name; }
  var m = dn.match(/261[\-\s]?\d{2}\s*(.+)$/); if(m) return m[1].trim();
  return dn;
}
function learnMember_(gid, uid){
  var sh = members_(), d = sh.getDataRange().getValues();
  for(var i = 1; i < d.length; i++){ if(String(d[i][0]) === gid && String(d[i][1]) === uid) return; }   // 記過就跳過
  var dn = groupMemberName_(gid, uid);
  if(!dn) return;
  sh.appendRow([gid, uid, dn, new Date().getTime()]);
}
function lightsOut_(gid, ctype, token){
  var picks = [];
  if(ctype === 'group' && gid){
    var d = members_().getDataRange().getValues();
    for(var i = 1; i < d.length; i++){ if(String(d[i][0]) === gid) picks.push({ uid: String(d[i][1]), name: String(d[i][2]) }); }
  }
  if(picks.length){
    var p = picks[Math.floor(Math.random() * picks.length)], shown = cleanName_(p.name);
    reply_(token, [{ type: 'text', text: '@' + shown + ' 去關燈💡', mention: { mentionees: [{ index: 0, length: shown.length + 1, userId: p.uid }] } }]);
  }else{
    var r = ROSTER[Math.floor(Math.random() * ROSTER.length)];
    reply_(token, [textMsg_('抽到 ' + r.name + '，去關燈💡\n（他還沒在群組講過話，我 tag 不到本人，先靠你們喊他）')]);
  }
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
