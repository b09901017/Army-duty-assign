/*******************************************************************
 * 261 排勤務板 — 雲端同步 + 漂亮試算表後端（Google Apps Script）v2
 *
 * 【安裝 / 更新】
 *  1. Google 試算表 → 擴充功能 → Apps Script，整段貼上蓋掉舊的、存檔。
 *  2. 管理部署作業 → 編輯 → 版本「新版本」→ 部署（網址不變）。首次要授權。
 *  3. 想立刻看到全部表格：編輯器選 rebuildFromData 執行一次。
 *
 * 【產生的分頁】
 *   data          原始 JSON（第一頁，App 復原用；E1 有更新狀態診斷）
 *   統計總表        每人 × 群組 次數
 *   每人每日勤務     ★矩陣：橫軸=1~8號，縱軸=日期(小→大)，含累計列；同格多類別分行、各自顏色
 *   勤務明細        誰做過哪些勤務
 *   站哨            每人累積 + 本週衛哨班表
 *   每日行程        各天時間軸（時間 / 分類 / 項目 / 人員）
 *   排休不在        排休、整天不在紀錄
 *
 * 每張表獨立建立，一張出錯不影響其他；出錯訊息會寫到 data!E1。
 *******************************************************************/

var DATA_SHEET = "data";
var _TZ = null;

var STAT_GROUPS = ["打掃", "公差", "大公差", "小公差", "打飯", "分菜"];
var GCOLORS = {
  "打掃": "#4F8A6A", "公差": "#5479A6", "大公差": "#9C4A6E",
  "小公差": "#6B5B95", "打飯": "#C08743", "分菜": "#B06A3C", "站哨": "#3E7B8C"
};
// 矩陣同格用的字體色（比背景色深一點，白底上舒適好讀）
var CATCOLOR = {
  "打掃": "#3F7A5A", "公差": "#456C93", "大公差": "#8C4A64", "小公差": "#5E5090",
  "打飯": "#A9762F", "分菜": "#9A5730", "站哨": "#367283",
  "補休": "#8A6011", "休假": "#3F7168", "其他": "#6C7268"
};
var INK = "#20261E", SUB = "#6C7268", LINE = "#D8DCD2",
    GREEN_DEEP = "#2A4634", GREEN_SOFT = "#E9EFE8", BAND = "#F2F5EF", MUTE = "#B8BDB2";

/* ================= Web 入口 ================= */
function doGet(e) {
  return ContentService.createTextOutput(read_()).setMimeType(ContentService.MimeType.JSON);
}
function doPost(e) {
  var lock = LockService.getScriptLock();
  try { lock.waitLock(25000); } catch (err) { return json_('{"ok":false,"err":"busy"}'); }
  try {
    if (e && e.postData && e.postData.contents) {
      var raw = e.postData.contents;
      var prev = read_();
      write_(raw);
      dataSheet_().getRange("C1").setValue("← A 欄是 App 復原碼（自動更新、可能分成多格，請勿手改）").setFontColor(SUB);
      if (raw !== prev) { try { rebuild_(JSON.parse(raw)); } catch (err2) { logStatus_(["rebuild 例外：" + err2]); } }
    }
    return json_('{"ok":true}');
  } finally { try { lock.releaseLock(); } catch (e3) {} }
}
function json_(s) { return ContentService.createTextOutput(s).setMimeType(ContentService.MimeType.JSON); }

/* ================= data 分頁 ================= */
function ss_() { return SpreadsheetApp.getActiveSpreadsheet(); }
function tz_() { if (!_TZ) { _TZ = ss_().getSpreadsheetTimeZone() || "Asia/Taipei"; } return _TZ; }
function dataSheet_() {
  var ss = ss_(), sh = ss.getSheetByName(DATA_SHEET);
  if (!sh) { sh = ss.insertSheet(DATA_SHEET, 0); }
  return sh;
}
/* A 欄分片存放：Google 試算表單格上限 50000 字元，排班板資料會超過，故切成多格 */
var CHUNK = 40000, MAX_CHUNKS = 30;
function read_() {
  var ds = dataSheet_(), vals = ds.getRange(1, 1, MAX_CHUNKS, 1).getValues(), s = "";
  for (var i = 0; i < vals.length; i++) { var v = vals[i][0]; if (v === "" || v === null) break; s += String(v); }
  return s ? s : "{}";
}
function write_(raw) {
  var ds = dataSheet_(), parts = [];
  for (var i = 0; i < raw.length; i += CHUNK) parts.push([raw.substr(i, CHUNK)]);
  if (parts.length > MAX_CHUNKS) throw new Error("資料過大：" + raw.length + " 字元");
  var rng = ds.getRange(1, 1, MAX_CHUNKS, 1);
  rng.setNumberFormat("@");                       // 純文字，避免被當公式或數字
  while (parts.length < MAX_CHUNKS) parts.push([""]);  // 清掉上次殘留的舊分片
  rng.setValues(parts);
}
function logStatus_(lines) {
  try {
    dataSheet_().getRange("E1").setValue("更新 " + stamp_() + "\n" + lines.join("\n"))
      .setWrap(true).setVerticalAlignment("top").setFontColor(SUB).setFontSize(10);
  } catch (e) {}
}

/* ================= 小工具 ================= */
function code_(id) { return ("0" + id).slice(-2); }
function personIds_(names) {
  names = names || {};
  var ids = Object.keys(names).map(function (k) { return parseInt(k, 10); }).filter(function (n) { return n >= 1 && n <= 8; });
  [1, 2, 3, 4, 5, 6, 7, 8].forEach(function (n) { if (ids.indexOf(n) < 0) ids.push(n); });
  ids.sort(function (a, b) { return a - b; });
  return ids;
}
function nameOf_(names, id) { return (names && names[id]) ? names[id] : code_(id); }
function deriveGroup_(cat) {
  if (cat === "大公差") return "大公差";
  if (cat === "小公差") return "小公差";
  if (/分菜/.test(cat)) return "分菜";
  if (/(早打|午打|晚打)/.test(cat) || cat === "打飯") return "打飯";
  if (/公差|車場|鋁床|經理|保槍|安官|衛哨|哨/.test(cat)) return "公差";
  return "打掃";
}
function dnum_(md) { var m = ("" + md).match(/(\d{1,2})\/(\d{1,2})/); return m ? parseInt(m[1], 10) * 100 + parseInt(m[2], 10) : 0; }
function mealSlot_(c) { return /早/.test(c) ? "早" : /午/.test(c) ? "午" : /晚/.test(c) ? "晚" : ""; }
function fencaSlot_(c) { return /早/.test(c) ? "早" : /(中|午)/.test(c) ? "中" : /晚/.test(c) ? "晚" : ""; }
function hm_(code4) {
  code4 = ("" + code4).replace(/[^0-9]/g, "");
  if (code4.length >= 4) { var a = code4.slice(0, 2), b = code4.slice(2, 4); return (a === "24" ? "00" : a) + ":00–" + (b === "24" ? "00" : b) + ":00"; }
  return code4;
}
function fmtSpan_(str) {
  var p = ("" + str).replace(/\s/g, "").split(/[-~–〜～]/);
  function f(t) { t = ("" + t).replace(/[^0-9]/g, "").slice(0, 4); if (t.length < 4) return t; var h = t.slice(0, 2); return (h === "24" ? "00" : h) + ":" + t.slice(2, 4); }
  return p[1] ? (f(p[0]) + "–" + f(p[1])) : f(p[0]);
}
function stamp_() { return Utilities.formatDate(new Date(), tz_(), "M/d HH:mm"); }

/* ================= 排版工具 ================= */
function freshSheet_(name) {
  var ss = ss_(), sh = ss.getSheetByName(name);
  if (!sh) { sh = ss.insertSheet(name); }
  try { sh.getRange(1, 1, Math.max(sh.getMaxRows(), 1), Math.max(sh.getMaxColumns(), 1)).breakApart(); } catch (e) {}
  sh.clear();
  try { sh.getBandings().forEach(function (b) { b.remove(); }); } catch (e) {}
  try { sh.clearNotes(); } catch (e) {}
  return sh;
}
function titleRow_(sh, ncol, text) {
  sh.getRange(1, 1, 1, ncol).merge().setValue(text)
    .setBackground(GREEN_DEEP).setFontColor("#FFFFFF").setFontWeight("bold").setFontSize(13)
    .setVerticalAlignment("middle").setHorizontalAlignment("left");
  sh.setRowHeight(1, 34);
}
function headerRow_(sh, row, headers) {
  sh.getRange(row, 1, 1, headers.length).setValues([headers])
    .setFontWeight("bold").setFontColor(INK).setBackground(GREEN_SOFT)
    .setHorizontalAlignment("center").setVerticalAlignment("middle");
  sh.setRowHeight(row, 26);
}
function banner_(sh, row, ncol, text, color) {
  sh.getRange(row, 1, 1, ncol).merge().setValue(text)
    .setBackground(color).setFontColor("#FFFFFF").setFontWeight("bold")
    .setHorizontalAlignment("left").setVerticalAlignment("middle");
  sh.setRowHeight(row, 24);
}
function frame_(sh, top, left, rows, cols) {
  if (rows <= 0 || cols <= 0) return;
  sh.getRange(top, left, rows, cols).setBorder(true, true, true, true, true, true, LINE, SpreadsheetApp.BorderStyle.SOLID);
}
function bandRows_(sh, top, rows, cols) {
  for (var i = 0; i < rows; i++) if (i % 2 === 1) sh.getRange(top + i, 1, 1, cols).setBackground(BAND);
}
function tidyCols_(sh, lastCol) {
  var maxC = sh.getMaxColumns();
  if (maxC > lastCol) { try { sh.hideColumns(lastCol + 1, maxC - lastCol); } catch (e) {} }
}

/* ================= 重建全部分頁（各自容錯） ================= */
function rebuild_(obj) {
  obj = obj || {};
  var names = obj.names || {};
  var ids = personIds_(names);
  var st = computeStats_(obj, ids);
  var status = [], jobs = [
    ["統計總表", function () { buildSummary_(st, obj, ids, names); }],
    ["每人每日勤務", function () { buildMatrix_(obj, ids, names); }],
    ["勤務明細", function () { buildDetail_(st, ids, names); }],
    ["站哨", function () { buildGuard_(obj, ids, names); }],
    ["每日行程", function () { buildDaily_(obj, names); }],
    ["排休不在", function () { buildAbsence_(obj, names); }]
  ];
  jobs.forEach(function (j) { try { j[1](); status.push(j[0] + " ✓"); } catch (err) { status.push(j[0] + " ✗ " + err); } });
  try { reorder_(); } catch (e) {}
  logStatus_(status);
}
function reorder_() {
  var order = [DATA_SHEET, "統計總表", "每人每日勤務", "勤務明細", "站哨", "每日行程", "排休不在"];
  var ss = ss_();
  order.forEach(function (nm, i) { var sh = ss.getSheetByName(nm); if (sh) { try { ss.setActiveSheet(sh); ss.moveActiveSheet(i + 1); } catch (e) {} } });
}
function computeStats_(obj, ids) {
  var g = {}, detail = {};
  ids.forEach(function (id) { g[id] = {}; detail[id] = {}; });
  (obj.log || []).forEach(function (day) {
    (day.entries || []).forEach(function (x) {
      var pid = x.p; if (g[pid] === undefined) { g[pid] = {}; detail[pid] = {}; }
      var grp = x.g || deriveGroup_(x.c), cat = x.c;
      g[pid][grp] = (g[pid][grp] || 0) + 1;
      if (!detail[pid][cat]) detail[pid][cat] = { group: grp, n: 0 };
      detail[pid][cat].n++;
    });
  });
  return { g: g, detail: detail };
}

/* ---------- 1. 統計總表 ---------- */
function buildSummary_(st, obj, ids, names) {
  var gt = obj.guardTally || {};
  var headers = ["代號", "姓名"].concat(STAT_GROUPS).concat(["勤務總計", "站哨"]);
  var W = headers.length, sh = freshSheet_("統計總表");
  titleRow_(sh, W, "261 排勤務統計總表　·　更新 " + stamp_());
  headerRow_(sh, 2, headers);
  STAT_GROUPS.forEach(function (grp, i) { sh.getRange(2, 3 + i).setBackground(GCOLORS[grp]).setFontColor("#FFFFFF"); });
  sh.getRange(2, W).setBackground(GCOLORS["站哨"]).setFontColor("#FFFFFF");
  var data = ids.map(function (id) {
    var row = [code_(id), nameOf_(names, id)], total = 0;
    STAT_GROUPS.forEach(function (grp) { var v = (st.g[id] && st.g[id][grp]) || 0; total += v; row.push(v || ""); });
    row.push(total); row.push(gt[id] || ""); return row;
  });
  if (data.length) {
    sh.getRange(3, 1, data.length, W).setValues(data).setVerticalAlignment("middle");
    sh.getRange(3, 1, data.length, 1).setHorizontalAlignment("center");
    sh.getRange(3, 2, data.length, 1).setHorizontalAlignment("left").setFontWeight("bold");
    sh.getRange(3, 3, data.length, W - 2).setHorizontalAlignment("center");
    sh.getRange(3, 2 + STAT_GROUPS.length + 1, data.length, 1).setFontWeight("bold").setFontColor(GREEN_DEEP);
    bandRows_(sh, 3, data.length, W);
    frame_(sh, 2, 1, data.length + 1, W);
  }
  sh.setColumnWidth(1, 54); sh.setColumnWidth(2, 96);
  for (var c = 3; c <= W; c++) sh.setColumnWidth(c, 66);
  sh.setFrozenRows(2); sh.setFrozenColumns(2);
  tidyCols_(sh, W);
}

/* ---------- 2. 每人每日勤務（矩陣，同格多類別分行上色） ---------- */
function seg_(t, c) { return { t: t, c: c }; }
function richCell_(segs) {
  if (!segs || !segs.length) {
    return SpreadsheetApp.newRichTextValue().setText("–")
      .setTextStyle(SpreadsheetApp.newTextStyle().setForegroundColor(MUTE).build()).build();
  }
  var full = segs.map(function (s) { return s.t; }).join("\n");
  var b = SpreadsheetApp.newRichTextValue().setText(full), pos = 0;
  segs.forEach(function (s) {
    var style = SpreadsheetApp.newTextStyle().setForegroundColor(s.c).setBold(true).build();
    b.setTextStyle(pos, pos + s.t.length, style);
    pos += s.t.length + 1;
  });
  return b.build();
}
function dayBreakdown_(obj, date, pid) {
  var groups = {}, meal = [], fenca = [];
  (obj.log || []).forEach(function (d) {
    if (String(d.date) !== String(date)) return;
    (d.entries || []).forEach(function (x) {
      if (x.p !== pid) return;
      var g = x.g || deriveGroup_(x.c);
      groups[g] = (groups[g] || 0) + 1;
      if (g === "打飯") { var s = mealSlot_(x.c); if (s && meal.indexOf(s) < 0) meal.push(s); }
      if (g === "分菜") { var s2 = fencaSlot_(x.c); if (s2 && fenca.indexOf(s2) < 0) fenca.push(s2); }
    });
  });
  var guard = false;
  (obj.guard && obj.guard.days ? obj.guard.days : []).forEach(function (day) {
    if (day.date !== date) return;
    (day.shifts || []).forEach(function (sh) { if ((sh.assigned || []).indexOf(pid) >= 0) guard = true; });
  });
  var abs = null, rec = obj.absence && obj.absence[date] && obj.absence[date][pid];
  if (rec) abs = (typeof rec === "string") ? { reason: rec, range: "" } : { reason: rec.reason || "", range: rec.range || "" };
  return { groups: groups, meal: meal, fenca: fenca, guard: guard, abs: abs };
}
function daySegs_(bd) {
  var segs = [];
  ["打掃", "公差", "大公差", "小公差"].forEach(function (g) { if (bd.groups[g]) segs.push(seg_(g + " " + bd.groups[g], CATCOLOR[g])); });
  if (bd.meal.length) segs.push(seg_("打飯 " + bd.meal.join(""), CATCOLOR["打飯"]));
  if (bd.fenca.length) segs.push(seg_("分菜 " + bd.fenca.join(""), CATCOLOR["分菜"]));
  if (bd.guard) segs.push(seg_("站哨", CATCOLOR["站哨"]));
  if (bd.abs) {
    if (bd.abs.range) segs.push(seg_("補休 " + fmtSpan_(bd.abs.range), CATCOLOR["補休"]));
    else segs.push(seg_(bd.abs.reason || "不在", CATCOLOR[bd.abs.reason] || CATCOLOR["其他"]));
  }
  return segs;
}
function cumSegs_(obj, pid) {
  var tot = {};
  (obj.log || []).forEach(function (d) { (d.entries || []).forEach(function (x) { if (x.p !== pid) return; var g = x.g || deriveGroup_(x.c); tot[g] = (tot[g] || 0) + 1; }); });
  var segs = [];
  STAT_GROUPS.forEach(function (g) { if (tot[g]) segs.push(seg_(g + " " + tot[g], CATCOLOR[g])); });
  var gt = (obj.guardTally && obj.guardTally[pid]) || 0; if (gt) segs.push(seg_("站哨 " + gt, CATCOLOR["站哨"]));
  var ac = {};
  Object.keys(obj.absence || {}).forEach(function (dt) {
    var rec = obj.absence[dt] && obj.absence[dt][pid]; if (!rec) return;
    var v = (typeof rec === "string") ? { reason: rec } : rec; var rs = v.reason || "其他"; ac[rs] = (ac[rs] || 0) + 1;
  });
  ["補休", "休假", "其他"].forEach(function (rs) { if (ac[rs]) segs.push(seg_(rs + " " + ac[rs], CATCOLOR[rs] || CATCOLOR["其他"])); });
  return segs;
}
function buildMatrix_(obj, ids, names) {
  var W = 1 + ids.length, sh = freshSheet_("每人每日勤務");
  titleRow_(sh, W, "每人每日勤務整理　·　更新 " + stamp_());
  var hdr = ["日期"].concat(ids.map(function (id) { return code_(id) + " " + nameOf_(names, id); }));
  headerRow_(sh, 2, hdr);

  var dset = {};
  (obj.log || []).forEach(function (d) { if (d.date) dset[String(d.date).replace(/[（(].*$/, "")] = 1; });
  Object.keys(obj.plans || {}).forEach(function (d) { dset[d] = 1; });
  Object.keys(obj.absence || {}).forEach(function (d) { dset[d] = 1; });
  (obj.guard && obj.guard.days ? obj.guard.days : []).forEach(function (day) { if (day.date) dset[day.date] = 1; });
  var dates = Object.keys(dset).sort(function (a, b) { return dnum_(a) - dnum_(b); });

  var labels = [["累計"]].concat(dates.map(function (d) { return [d]; }));
  var rich = [], heights = [];
  var cumRow = ids.map(function (id) { return cumSegs_(obj, id); });
  rich.push(cumRow.map(richCell_));
  heights.push(cumRow.reduce(function (m, s) { return Math.max(m, s.length); }, 1));
  dates.forEach(function (dt) {
    var rowSegs = ids.map(function (id) { return daySegs_(dayBreakdown_(obj, dt, id)); });
    rich.push(rowSegs.map(richCell_));
    heights.push(rowSegs.reduce(function (m, s) { return Math.max(m, s.length); }, 1));
  });

  var nRows = labels.length; // 累計 + 各日期
  sh.getRange(3, 1, nRows, 1).setValues(labels).setFontWeight("bold").setHorizontalAlignment("center").setVerticalAlignment("top");
  sh.getRange(3, 1).setBackground(GREEN_SOFT);
  if (ids.length) sh.getRange(3, 2, nRows, ids.length).setRichTextValues(rich).setWrap(true).setVerticalAlignment("top");
  // 累計列淡底
  sh.getRange(3, 1, 1, W).setBackground(GREEN_SOFT);
  for (var i = 0; i < nRows; i++) sh.setRowHeight(3 + i, Math.max(24, 8 + heights[i] * 15));
  frame_(sh, 2, 1, nRows + 1, W);

  sh.setColumnWidth(1, 62);
  for (var c = 2; c <= W; c++) sh.setColumnWidth(c, 120);
  sh.setFrozenRows(3); sh.setFrozenColumns(1);
  tidyCols_(sh, W);
}

/* ---------- 3. 勤務明細 ---------- */
function buildDetail_(st, ids, names) {
  var headers = ["代號", "姓名", "群組", "項目", "次數"], W = headers.length, sh = freshSheet_("勤務明細");
  titleRow_(sh, W, "勤務明細（誰做過哪些勤務）　·　更新 " + stamp_());
  headerRow_(sh, 2, headers);
  var rows = [], grpOfRow = [];
  ids.forEach(function (id) {
    var det = st.detail[id] || {}, cats = Object.keys(det);
    cats.sort(function (a, b) { var ga = STAT_GROUPS.indexOf(det[a].group), gb = STAT_GROUPS.indexOf(det[b].group); if (ga < 0) ga = 99; if (gb < 0) gb = 99; return ga - gb || det[b].n - det[a].n || (a < b ? -1 : 1); });
    if (!cats.length) { rows.push([code_(id), nameOf_(names, id), "—", "（尚無紀錄）", ""]); grpOfRow.push(null); }
    else cats.forEach(function (cat, idx) { rows.push([idx === 0 ? code_(id) : "", idx === 0 ? nameOf_(names, id) : "", det[cat].group, cat, det[cat].n]); grpOfRow.push(det[cat].group); });
  });
  if (rows.length) {
    sh.getRange(3, 1, rows.length, W).setValues(rows).setVerticalAlignment("middle");
    sh.getRange(3, 1, rows.length, 1).setHorizontalAlignment("center");
    sh.getRange(3, 2, rows.length, 1).setFontWeight("bold");
    sh.getRange(3, 5, rows.length, 1).setHorizontalAlignment("center").setFontWeight("bold").setFontColor(GREEN_DEEP);
    grpOfRow.forEach(function (grp, i) { if (grp && GCOLORS[grp]) sh.getRange(3 + i, 3).setFontColor(GCOLORS[grp]).setFontWeight("bold"); });
    frame_(sh, 2, 1, rows.length + 1, W);
  }
  sh.setColumnWidth(1, 54); sh.setColumnWidth(2, 96); sh.setColumnWidth(3, 76); sh.setColumnWidth(4, 190); sh.setColumnWidth(5, 60);
  sh.setFrozenRows(2); tidyCols_(sh, W);
}

/* ---------- 4. 站哨 ---------- */
function buildGuard_(obj, ids, names) {
  var gt = obj.guardTally || {}, guard = obj.guard || {}, W = 5, sh = freshSheet_("站哨");
  titleRow_(sh, W, "站哨　·　更新 " + stamp_());
  var r = 2;
  banner_(sh, r, W, "每人站哨累積", GCOLORS["站哨"]); r++;
  headerRow_(sh, r, ["代號", "姓名", "站哨次數"]); var hdrA = r; r++;
  var tally = ids.map(function (id) { return [code_(id), nameOf_(names, id), gt[id] || 0]; });
  tally.sort(function (a, b) { return b[2] - a[2]; });
  sh.getRange(r, 1, tally.length, 3).setValues(tally).setVerticalAlignment("middle");
  sh.getRange(r, 1, tally.length, 1).setHorizontalAlignment("center");
  sh.getRange(r, 2, tally.length, 1).setFontWeight("bold");
  sh.getRange(r, 3, tally.length, 1).setHorizontalAlignment("center").setFontWeight("bold").setFontColor(GCOLORS["站哨"]);
  frame_(sh, hdrA, 1, tally.length + 1, 3);
  r += tally.length + 1;
  banner_(sh, r, W, "本週衛哨班表", GCOLORS["站哨"]); r++;
  headerRow_(sh, r, ["日期", "時段", "時間", "地點", "人員"]); var hdrB = r; r++;
  var brows = [];
  (guard.days || []).forEach(function (day) {
    (day.shifts || []).forEach(function (shf) {
      var ppl = (shf.assigned || []).map(function (pid) { return nameOf_(names, pid); }).join("、");
      brows.push([day.range || day.date || "", shf.code || "", hm_(shf.code), shf.loc || "", ppl]);
    });
  });
  if (brows.length) {
    sh.getRange(r, 1, brows.length, W).setValues(brows).setVerticalAlignment("middle");
    sh.getRange(r, 2, brows.length, 2).setHorizontalAlignment("center");
    frame_(sh, hdrB, 1, brows.length + 1, W);
  } else sh.getRange(r, 1).setValue("（本週尚未貼衛哨表）").setFontColor(SUB);
  sh.setColumnWidth(1, 130); sh.setColumnWidth(2, 64); sh.setColumnWidth(3, 120); sh.setColumnWidth(4, 80); sh.setColumnWidth(5, 230);
  sh.setFrozenRows(1); tidyCols_(sh, W);
}

/* ---------- 5. 每日行程 ---------- */
function buildDaily_(obj, names) {
  var plans = obj.plans || {}, headers = ["日期", "星期", "時間", "分類", "項目", "人員"], W = headers.length, sh = freshSheet_("每日行程");
  titleRow_(sh, W, "每日行程紀錄　·　更新 " + stamp_());
  headerRow_(sh, 2, headers);
  var dates = Object.keys(plans).sort(function (a, b) { return dnum_(a) - dnum_(b); });
  var rows = [], grpOfRow = [];
  dates.forEach(function (d) {
    var p = plans[d] || {};
    var evs = (p.events || []).slice().sort(function (a, b) { var ma = (a.min == null ? 99999 : a.min), mb = (b.min == null ? 99999 : b.min); return ma - mb; });
    if (!evs.length) return;
    evs.forEach(function (ev, idx) {
      var ppl = ev.keepAll ? "全班" : (ev.people || []).map(function (pid) { return nameOf_(names, pid); }).join("、");
      rows.push([idx === 0 ? d : "", idx === 0 ? (p.weekday || "") : "", ev.range ? fmtSpan_(ev.range) : "", ev.group || "", ev.label || "", ppl]);
      grpOfRow.push(ev.group);
    });
  });
  if (rows.length) {
    sh.getRange(3, 1, rows.length, W).setValues(rows).setVerticalAlignment("middle");
    sh.getRange(3, 1, rows.length, 1).setHorizontalAlignment("center").setFontWeight("bold");
    sh.getRange(3, 2, rows.length, 1).setHorizontalAlignment("center");
    sh.getRange(3, 3, rows.length, 1).setHorizontalAlignment("center").setFontColor(GREEN_DEEP).setFontWeight("bold");
    grpOfRow.forEach(function (grp, i) { if (grp && GCOLORS[grp]) sh.getRange(3 + i, 4).setFontColor(GCOLORS[grp]).setFontWeight("bold"); });
    frame_(sh, 2, 1, rows.length + 1, W);
  } else sh.getRange(3, 1).setValue("（尚無每日行程；在 App 排班並「計入」後就會出現）").setFontColor(SUB);
  sh.setColumnWidth(1, 64); sh.setColumnWidth(2, 48); sh.setColumnWidth(3, 120); sh.setColumnWidth(4, 72); sh.setColumnWidth(5, 150); sh.setColumnWidth(6, 240);
  sh.setFrozenRows(2); tidyCols_(sh, W);
}

/* ---------- 6. 排休不在 ---------- */
function buildAbsence_(obj, names) {
  var absence = obj.absence || {}, headers = ["日期", "代號", "姓名", "原因", "時段"], W = headers.length, sh = freshSheet_("排休不在");
  titleRow_(sh, W, "排休／不在紀錄　·　更新 " + stamp_());
  headerRow_(sh, 2, headers);
  var rows = [];
  Object.keys(absence).forEach(function (md) {
    var rec = absence[md] || {};
    Object.keys(rec).forEach(function (pid) {
      var v = rec[pid], reason, range;
      if (typeof v === "string") { reason = v; range = ""; }
      else { reason = v.reason || ""; range = v.range || (v.until ? ("0530-" + v.until) : ""); }
      rows.push([md, code_(pid), nameOf_(names, pid), reason, range ? fmtSpan_(range) : "整天"]);
    });
  });
  rows.sort(function (a, b) { return dnum_(a[0]) - dnum_(b[0]) || (a[1] < b[1] ? -1 : 1); });
  if (rows.length) {
    sh.getRange(3, 1, rows.length, W).setValues(rows).setVerticalAlignment("middle");
    sh.getRange(3, 1, rows.length, 1).setHorizontalAlignment("center").setFontWeight("bold");
    sh.getRange(3, 2, rows.length, 1).setHorizontalAlignment("center");
    sh.getRange(3, 5, rows.length, 1).setHorizontalAlignment("center");
    bandRows_(sh, 3, rows.length, W);
    frame_(sh, 2, 1, rows.length + 1, W);
  } else sh.getRange(3, 1).setValue("（目前沒有排休／不在紀錄）").setFontColor(SUB);
  sh.setColumnWidth(1, 64); sh.setColumnWidth(2, 54); sh.setColumnWidth(3, 96); sh.setColumnWidth(4, 80); sh.setColumnWidth(5, 120);
  sh.setFrozenRows(2); tidyCols_(sh, W);
}

/* ================= 手動：用目前 data!A 欄立即重建全部分頁 ================= */
function rebuildFromData() {
  try { rebuild_(JSON.parse(read_())); }
  catch (e) { throw new Error("data!A 欄不是有效 JSON：" + e); }
}
