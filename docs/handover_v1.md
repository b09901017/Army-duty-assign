# 261 排勤務板 — 專案交接說明

給下一個 AI 對話：這是一個已經做到一半的專案，請先讀完本檔再動手。使用者是台灣四個月兵、二階段下部隊要排勤務，全程用**繁體中文＋台灣軍中用語**溝通，偏好「先做出來、每步驗證、簡潔」。

---

## 一、這是什麼
一個**零依賴、純原生 HTML/JS 的單一檔案 App**（`index.html`），手機用。功能是幫「261 梯 8 人班」排每日勤務與整週站哨，並輸出可一鍵複製的文字給班長／給同學。

- 主檔：`/mnt/user-data/outputs/index.html`（**唯一要編輯的檔案**；使用者部署到 GitHub Pages）
- 後端：`/mnt/user-data/outputs/雲端同步_AppsScript.gs`（Google Apps Script，貼進試算表用）
- （舊）`排勤務_Project指示.md` 已被 App 取代，可忽略。

**部署**：GitHub Pages（public repo → 傳 index.html → Settings→Pages）。更新後網址加 `?v=N` 避快取。目前約在 **v12**。
**重要**：Claude 預覽沙盒會擋外部 fetch，所以**雲端同步／複製功能只能在部署後的 https 網址測**，預覽裡測不出來。

---

## 二、班級名冊（代號=本名，寫死在 PEOPLE）
1 李愷宸、2 江偉綸、3 陳柏翰、4 鄧旭辰、5 廖翊滕、6 陳俊穎、7 林柏宇、8 林崇浩。
「4號／04／4」都指同一人。公版裡的「261」就是要我們班填人的位置。

---

## 三、架構（vanilla JS，單一 `render()` 重繪）
- `render()` 依 `state.page`（`board` 排班 / `guard` 站哨 / `stats` 統計）組字串塞進 `#root`，底部 `#nav` 三顆切換。事件用**委派**（`data-action`）。
- 底層面板（sheet）在獨立 `#overlay`，避免重繪時重播動畫；可拖曳灰橫桿下滑關閉。`state.sheet={type,id}`，type 有 `picker`（指派勤務）/`person`（統計明細）/`guard`（指派站哨）。
- 顏色 `C`（紙白+松綠+黃銅）。三類群組色 `GCOLORS={打飯:#C08743,公差:#5479A6,打掃:#4F8A6A}`。
- 圖示 `ICON`（inline SVG path）。

### 儲存與同步
- 本機：`localStorage` key `duty-board-v3`，存 `{names,log,mealQueue,guard,guardTally}`。
- `persistLocal()` 只寫本機；`persist()` = 本機 + `pushSync()`。
- 雲端：Google Apps Script（doGet 讀 / doPost 寫試算表 data 分頁 A1 的一整包 JSON）。用 `POST text/plain` 避 CORS preflight，部署選「任何人」。`state.syncUrl` 存在 `duty-sync-url`。
- `pushSync()`（debounce 400ms）、`pullSync()`（每 20 秒 + 切回前景；推送後 3 秒內不拉，避免蓋掉剛存的）、`applyRemote()`（比對後才套用，含 guard/guardTally）、`connectSync()`（首次連線：雲端有資料就載入、沒有就上傳本機）。header 有雲端小圓點。
- 覆蓋規則＝最後存的贏（勸使用者一人主排）。排班板（當天 duties）**不同步**，只有 log/名字/隊列/站哨會同步。

---

## 四、核心資料模型
- `state.log = [{id,date:"M/D",entries:[{p:personId,c:類別,g:群組}]}]`，`g` ∈ {打飯,公差,打掃}。統計由 log 推導：`getHistory()`→`HIST={h:{id:{cat:count}},cg:{cat:群組}}`。`total()/nonMealTotal()` 用 `HIST.h`。`sortCats()` 依 打掃→公差→打飯 排序。`deriveGroup()` 供舊資料推群組。
- 勤務物件 `duty`：`{id,kind:'meal'|'fill'|'manual',mode:'replace'|'append',label(去編號去時間),time,period(AM/NOON/AFT/PM/GC),block(衝突用),count,assigned:[ids],keepAll,removed,original,tok261?}`。
- `mealQueue`＝打飯輪流隊列 [1..8]；被排到的移到隊尾（commit 時），補休者留原位。
- `state.guard = {raw,meta,days:[{date:"M/D",range,shifts:[{id,code,loc,assigned:[]}]}],loaded,committed}`；`state.guardTally={id:累積站哨次數}`。

---

## 五、公版格式（班長每天略有不同，已詳讀 7/1–7/3＋站哨）
### 勤務公版
分區：`🔷打掃`（上午/晚間/`🔵下午`子區）→ `🔷公差` → `🔷打飯`。`🔷`與`🔵`都當區段標記，並在標記行同步更新時段（上午/下午/晚/午）。
- 261 各寫法都認得且能判斷人數：`261`、`+261`、`261*3`、`258+261`、`（261）`、`261梯（8）`、`261梯8員`。有 261 token→replace 模式（存 `tok261` 精準取代）；沒有→append 模式（名字接在該行尾）。
- 空白待填（冒號後空）或尾端「、」＝我方接在後面。
- 多行公差（`(1)0800槍箱公差：` 換行後才寫 `258梯（1）261梯（2）` 再換行寫名字）：標籤 rhs 空時會往下 peek 抓 261 人數；輸出時我方名字接在標籤冒號後。
- 時間前綴 `0800`/`0830-0900`：表單 label 去掉時間、輸出 `original` 保留時間；`block=timeBlock(time)`（同一時間才互擋）。
- 打飯 `早打：2 名字、名字`：前導數字＝人數（count），可多人。

### 站哨公版
`本週衛哨請填空` → 日期範圍 `7/5(日)-7/6(一)`（有 `-` 且開頭是 M/D）→ 時段 `2402(c)`、`1214(c)`（4 碼＝起訖時；`2402`=今天 00:00 站到隔天 02:00，`1214`=12:00–14:00）。排整週、需記憶、依日期對應到當天。

---

## 六、已完成功能（都用 node 測過）
排班：貼公版自動抓所有含冒號勤務、261 多樣式辨識、時間擷取與同時段衝突鎖定、打飯多人（早午晚）、上午/午/下午/晚/公差分組、手動增刪勤務改人數/八人一起、**自動分配**（打飯照隊列輪流補休保留順位；其他勤務「同項做過最少的人優先」）、複製填好公版（給班長）＋複製個人分工（給大家，含站哨、分行清楚）＋預覽兩者。
統計：雙欄卡片、三類顏色（淺底彩字＋色點＋比例條，固定 打掃/公差/打飯 順序）、點卡片改名/扣單項/清空該人、按天刪紀錄、貼已填公版匯入（含公差群組判定）、備份/還原、清空全部。分配表單副標顯示「該項做過幾次」（非總累積）並依此排序。
站哨（第三頁）：貼衛哨公版解析整週、看懂 2402/1214、點班次指派（可複選，依 guardTally 少者優先）、自動平均分配、複製填好衛哨表（給班長）、計入本週站哨（一次，`committed` 防重複）、「本週每人站哨」一覽。
雲端：Google Apps Script 即時同步（含 guard/guardTally），robust 複製（clipboard 失敗時 fallback 用隱藏 textarea + execCommand）。

---

## 七、測試方法（node harness，強烈建議每次大改都跑）
```bash
cd /tmp && sed -n '/<script>/,/<\/script>/p' /mnt/user-data/outputs/index.html | sed '1d;$d' > app.js
node --check app.js   # 語法檢查
```
功能測試：stub `localStorage`/`document`(fakeEl)/`navigator`/`fetch`，接 app.js 後直接呼叫 `parseGongban`/`autoAssign`/`buildFilled`/`buildPersonList`/`parseGuard`/`guardAuto`/`buildGuardFilled` 印結果。（前面對話有完整範例，照抄即可。）

---

## 八、可能的下一步（使用者尚未決定，等他開口）
- 站哨想不想跟勤務「同時段互擋」（目前站哨與勤務衝突不連動，只在個人分工並列顯示）。
- 站哨視覺化想不想做成時間軸圖。
- 個人分工用詞/emoji 微調。
- 多人同時編輯的衝突處理目前是「最後存的贏」，若要更嚴謹可做 log 依 id 合併。
- 排班板目前不同步（只同步結果）；若要多人即時看到同一天排班進度需另設計。

---

## 九、注意事項
- 一律**先讀本檔＋現有 index.html** 再動；改完**先 `node --check` 再功能測**。
- 回應附上「上傳覆蓋 GitHub、網址加 ?v=N」提醒。
- 雲端／複製只能在部署後 https 測，別在預覽裡判定壞掉。
- 全程繁體中文、台灣軍中用語、簡潔、先做再解釋。
