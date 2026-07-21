# CLAUDE.md

給之後接手這個 repo 的 Claude 看的操作守則。

## 這是什麼

「261 排勤務板」— 幫台灣陸軍 261 梯 8 人班排每日勤務、整週站哨、看行程、看統計的手機用 App。
零依賴、純原生 HTML/JS，部署在 GitHub Pages。另有一個給 LINE 用的精簡排班頁（LIFF）。

## 檔案結構（⚠️ v9 起變了，不再是單一檔案）

```
index.html            App 外殼（85 行）：HTML + <style> + <script src="core.js"> + 自己的 render()/DOM綁定/init
core.js               ★邏輯層全部在這★（~1770 行）：常數/解析/分配/同步/統計/時間軸/面板/事件層(handle/onInput/onClick)
liff.html             LINE 用的精簡排班頁（共用 core.js；只有清單/時間軸+發送鈕）
sync_AppsScript.gs     資料同步後端，貼進 Google 試算表的「擴充功能 → Apps Script」
line_webhook.gs        LINE bot 後端（★獨立的第二個 Apps Script★，不是貼在試算表那個；用 openById 存同一份表）
data/
  action-guides/       每日「行動準據」原文（時間軸：起床、升旗、用餐…），YYYY-MM-DD.txt
  duty-templates/      每日完整「勤務公版」原文（含別班/別梯人名），YYYY-MM-DD.txt
  guard-template.txt   站哨填空公版
docs/
  roster.txt           班級名冊（代號=本名）
  duty-rules.md         AI 幫忙「填公版」時要遵守的規則
  handover_v1~v9.md     歷次專案交接說明，v9 為最新
  line-liff-plan.md     LINE/LIFF 串接規劃書
  line-qa.md            LINE 串接施工問答
```

### 改哪個檔？（v9 起「index.html 是唯一要編輯的檔」已作廢）
- 改**邏輯／解析／分配／同步／統計／時間軸／面板／事件** → 改 **`core.js`**。
- 改主 App 的頁面組合（header/四頁 nav/各頁 render）→ 改 **`index.html`** 的 `render()`。
- 改 LINE 排班頁 → 改 **`liff.html`**。
- 改 LINE bot 行為 → 改 **`line_webhook.gs`**。
- `index.html` 與 `liff.html` 都 `<script src="core.js">` 共用同一套邏輯（classic script，top-level var/function 變全域共用）。**core.js 不定義 `render()`，由每頁各自定義**——這是共用架構的關鍵，別把 render 搬進 core.js。

## ⚠️ 修改前

**先讀 `docs/handover_v9.md`**（永遠讀編號最大的那份）。v9 記錄了最大的結構改動（抽出 core.js、串接 LINE/LIFF），還有完整資料模型、同步機制、已知 bug、未做事項。**v4 第七節「資料安全」尤其重要**——真實資料損毀事故換來的保護（逐日合併＋墓碑、pull 過才准 push），改 `payload / applyRemote / pushSync / pullSync` 前必讀，別把保護退回去（v5~v9 都沒動這塊，仍以 v4 為準）。

不要只看原始碼猜架構；handover 裡記錄了很多「為什麼這樣寫」的 debug 血淚史，原始碼本身看不出來。

## 修改後

1. **語法檢查**（core.js 是主體，別漏）：
   ```bash
   node --check core.js
   # index.html / liff.html 的內嵌 script 各自抽出來檢查：
   #   把 <script>...</script> 內容存檔再 node --check
   ```
   `.gs` 可比照（重新命名副檔名成 .js 再 `node --check`）。
2. **動 core.js/index.html 必跑等價性測試**：同 stub 環境比對「原始版 vs 改後版」的 state/render 輸出/parseGongban 逐字元相同，證明主 App 行為不變（handover_v9 第二節有作法；handover_v4 第九節有 stub harness 寫法）。liff 另有 `?raw=` 功能測。
3. **更新 handover**：新開 `handover_v{N+1}.md`、`docs/README.md` 同步改「v{N} 為最新」，記下改了什麼、為什麼、新資料模型/欄位、未做事項。寫清楚勝過簡短。
4. **commit + push**；GitHub Pages 服務 **`main` 分支**，工作分支的 commit **要 merge 進 main 才會上線**（`git checkout main && git merge <分支> --no-edit && git push origin main`；main 有 merge 歷史，別用 --ff-only）。
5. 回應使用者時提醒：**`index.html`／`core.js`／`liff.html` 三個要一起上傳**（只傳 index.html 會白畫面）、引用的 `core.js?v=N` 版號要跟著改避快取；雲端同步／LIFF 只能在部署後的 https / 手機 LINE 內測。改 `.gs` 要在**各自的 Apps Script** 專案「管理部署作業 → 編輯 → 新版本 → 部署」（網址不變；Script Properties 改值即時生效不用重部署）。

## 溝通風格

全程繁體中文＋台灣軍中用語，簡潔、先做再解釋。
