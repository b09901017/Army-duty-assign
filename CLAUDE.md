# CLAUDE.md

給之後接手這個 repo 的 Claude 看的操作守則。

## 這是什麼

「261 排勤務板」— 幫台灣陸軍 261 梯 8 人班排每日勤務、整週站哨、看行程、看統計的手機用 App。
零依賴、純原生 HTML/JS 單一檔案，部署在 GitHub Pages。

## 檔案結構

```
index.html            唯一要編輯的 App 本體（HTML+CSS+JS 全塞在一個檔案）
sync_AppsScript.gs     後端，貼進 Google 試算表的「擴充功能 → Apps Script」用
data/
  action-guides/       每日「行動準據」原文（時間軸：起床、升旗、用餐…），YYYY-MM-DD.txt
  duty-templates/      每日完整「勤務公版」原文（含別班/別梯人名），YYYY-MM-DD.txt
  guard-template.txt   站哨填空公版
docs/
  roster.txt           班級名冊（代號=本名）
  duty-rules.md         AI 幫忙「填公版」時要遵守的規則
  handover_v1~v6.md     歷次專案交接說明，v6 為最新
```

## ⚠️ 修改 index.html / sync_AppsScript.gs 前

**先讀 `docs/handover_v6.md`**（若之後版本更新，永遠讀編號最大的那份）。裡面有完整的資料模型、雲端同步機制、已知 bug 修復紀錄、尚未做的事項。**v4 第七節「資料安全」尤其重要**——那是真實發生過的資料損毀事故換來的保護機制（逐日合併＋墓碑、pull 過才准 push），改 `payload / applyRemote / pushSync / pullSync` 之前必讀，別把保護機制退回去（v5/v6 都沒動這塊，仍以 v4 為準）。

不要只看 index.html 原始碼猜架構；handover 裡記錄了很多「為什麼這樣寫」的 debug 血淚史，原始碼本身看不出來。

## 修改後

1. **語法檢查**：
   ```bash
   sed -n '/<script>/,/<\/script>/p' index.html | sed '1d;$d' > /tmp/app.js
   node --check /tmp/app.js
   ```
   `sync_AppsScript.gs` 也可比照（重新命名副檔名成 .js 再 `node --check`）。
2. 有能力的話做功能測試（stub `localStorage/document/navigator/fetch` 呼叫內部函式驗證），handover_v4 第九節有 harness 寫法可照抄。
3. **更新 handover**：在最新版 handover 檔案（或新開一份 `handover_v{N+1}.md`，`docs/README.md` 也要同步改「v{N} 為最新」）記下這次改了什麼、為什麼改、新的資料模型/欄位、還有哪些已知未做的事項。這份文件是給下一個接手的 AI 看的，寫清楚勝過簡短。
4. **commit + push** 到 GitHub。
5. 回應使用者時提醒：「記得上傳覆蓋 GitHub Pages 部署、網址加 `?v=N` 避快取」；雲端同步／複製功能只能在部署後的 https 網址測，預覽環境會被擋。若改了 `.gs`，提醒需要「管理部署作業 → 編輯 → 新版本 → 部署」（網址不變）。

## 溝通風格

全程繁體中文＋台灣軍中用語，簡潔、先做再解釋。
