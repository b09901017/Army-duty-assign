// 261 排勤務板 — 雲端同步後端（Google Apps Script）
// 用法：在 Google 試算表 → 擴充功能 → Apps Script，把整段貼進去，存檔後部署成網頁應用程式（存取權：任何人）。
// 它會把整包資料存到試算表的 data 分頁 A1（一格 JSON），全隊共用同一份。

function doGet(e) {
  return ContentService
    .createTextOutput(read_())
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  if (e && e.postData && e.postData.contents) {
    sheet_().getRange("A1").setValue(e.postData.contents);
  }
  return ContentService
    .createTextOutput('{"ok":true}')
    .setMimeType(ContentService.MimeType.JSON);
}

function sheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName("data");
  if (!sh) { sh = ss.insertSheet("data"); }
  return sh;
}

function read_() {
  var v = sheet_().getRange("A1").getValue();
  return v ? String(v) : "{}";
}
