# 261 排勤務板 — 交接說明 v3（對應 index.html v27 · Apps Script v2）

給下一個 AI：先讀完本檔＋現有 `index.html` 再動手。使用者是台灣四個月兵、二階段下部隊排勤務，全程**繁體中文＋台灣軍中用語**、偏好「先做出來、每步驗證、簡潔」。改完**先 `node --check` 再功能測**，回應附上「上傳覆蓋 GitHub、網址加 `?v=N`」。**雲端同步／複製只能部署後在 https 測**，預覽沙盒擋 fetch。

> v2→v3 期間新增：雲端網址寫死＋自動連線、Apps Script 重寫成 6 張漂亮分頁、parseFilled 大強化、行程頁改版（時間軸合併＋每人卡片）、**唯讀分享模式**、**刪這天**。詳見第八節。

---

## 一、這是什麼
零依賴、純原生 HTML/JS 的**單一檔案 App**（`index.html`），手機用，部署在 GitHub Pages。幫「261 梯 8 人班」排每日勤務、整週站哨、看當天行程、看統計。主檔就是唯一要編輯的檔。後端 `雲端同步_AppsScript.gs`（Google Apps Script，貼進試算表）。

**班級名冊（代號=本名，寫死在 `PEOPLE`）**：1 李愷宸、2 江偉綸、3 陳柏翰、4 鄧旭辰、5 廖翊滕、6 陳俊穎、7 林柏宇、8 林崇浩。公版裡的「261」＝我們班要填人的位置。

**四個分頁（底部 nav）**：排班 / 站哨 / 行程 / 統計。單一 `render()` 依 `state.page` 重繪，事件用委派（`data-action`）。底層面板在 `#overlay`（sheet：picker 指派 / person 統計明細 / guard 站哨 / absence 排休）。

---

## 二、核心資料模型（`state`）
- **本機儲存** key `duty-board-v3`：`names, log, mealQueue, guard, guardTally, schedule, plans, absence, boards, activeDate`。
- **雲端同步**（payload）：`names, log, mealQueue, guard, guardTally, plans, absence`（**boards / schedule 不同步**，只存本機；同步的是「結果快照 plans＋統計 log＋站哨＋排休」）。覆蓋規則＝最後存的贏。

### log（統計來源）
`state.log = [{id, date:"M/D", entries:[{p:人id, c:細項名, g:群組, t?:時間}]}]`
- **群組 g** 共 6 種：`打掃 / 公差 / 大公差 / 小公差 / 打飯 / 分菜`（行程另有 `站哨` 顏色但不進統計）。
- **細項 c** 保留真名；`t`（v3 新增，可空）＝從公版抓到的 4 碼時間，供匯入時帶進行程。
- log **id 一律 `"b_"+date`**（同日期覆蓋、不重複計數）。
- `getHistory()`→`HIST`；卡片正面用群組總數，明細用 `HIST.h`。

### boards（可編輯板，每天一份，本機、**不同步**）
`state.boards[date] = {raw, meta, duties, schedule, wd, committed, imported}`；`activeDate` 目前載入編輯日；`boardMode=edit|view`；`boardOpen`（不持久、預設 false）。`saveBoard/loadBoard/boardDates`。duty 物件結構見 v2（欄位不變）。

### 行程 / absence / 站哨 / 準則
大致同 v2：`planForBoard(date)`→`{date,weekday,schedule,events,rests,outs}`；`events=eventsFromDuties+guardEventsFor`；站哨代碼是起訖時（`0608`=06–08，`guardRange/shiftHM`）。`absence[md][pid]={reason,range}`（補休=區間、只擋重疊；大公差/休假/其他=整天）。`state.schedule` 準則＋`DEFAULT_SCHED`＋`autoTagTimes()`。

---

## 三、雲端同步（v3 重點）
- **網址寫死**：檔案最上面 `var DEFAULT_SYNC_URL="https://script.google.com/.../exec";`（已填好使用者的網址）。載入時 `syncUrl` 若偵測到這是 script.google.com 就採用它並**自動連線＋輪詢**，統計頁不再顯示輸入框（`syncBlock()` 走 `bakedUrl()` 分支，只剩狀態卡＋「立即同步」）。留空字串則退回舊的手動輸入流程。
- **Apps Script v2**（`雲端同步_AppsScript.gs`）：`doPost` 存原始 JSON 到 `data!A1`，若內容有變就 `rebuild_(JSON.parse(raw))`。`rebuild_` 把 6 張分頁**整張清空重建**（`freshSheet_`）：
  1. `統計總表`（每人×群組次數） 2. `每人每日勤務`（★矩陣，見下） 3. `勤務明細` 4. `站哨`（累積＋本週班表） 5. `每日行程`（時間軸） 6. `排休不在`。
  - **每張表獨立 `try/catch`**（`rebuild_` 內的 jobs 陣列），一張壞不影響其他；狀態（哪張 ✓／✗＋錯誤）寫到 **`data!E1`**（除錯看這格）。
  - 用**手動交錯底色 `bandRows_`** 取代 `applyRowBanding`（舊版就是它衝突導致整個 rebuild 中止、只剩 data＋統計總表）。
  - 矩陣同格多類別用 **RichText**（`richCell_`：`newRichTextValue`＋逐段 `setTextStyle` 上色、`\n` 分行、`setWrap(true)`＋依行數設列高）。顏色表 `CATCOLOR`。
  - `rebuildFromData()`＝手動用目前 `data!A1` 立即重建全部（編輯器可直接執行）。
  - **重點**：因為每次都整張重建，App 端**刪除某天後把新 JSON 推上去，試算表就會同步刪掉**（`.gs` 不用改）。
- 部署：改 `.gs` 後「管理部署作業→編輯→新版本→部署」，**網址不變**。

---

## 四、三個解析器
- `parseGongban(text)`（排班板）：同 v2（261 各寫法、分菜家族 head/早中晚、🚨→small、打飯 meal、embedded time）。
- **`parseFilled(text)`（統計「貼已填公版」）— v3 大強化**：
  - **🔵 不再當段落標題**（只有 🔷 換段）→ `🔵0900倒垃圾*4:` 這種帶勤務的行會被解析。
  - **接續行名字**：冒號後空白時，往下 1–3 行找名字（遇空行／冒號行／🔷🚨🔵 停）→ 抓到 `🚨1600籃球比賽選手：` 換行的人。
  - **名字變體字**：`NAME_ALIASES`（白名單）`{"廖翊縢":5,"江偉倫":2}`，`filledNameMap()` 併入。**刻意不做模糊比對**（陳柏翰↔陳柏凱、陳俊穎↔陳俊宏 會誤判）；遇新變體往這裡加。
  - **抓時間**：`extractLabelTime()` 取開頭或內文 4 碼 HHMM（驗證時分）→ 存進 entry `t`，`boardFromImport/planFromImport` 用它當 `schedTime/range`（0900、1600 等會進行程時間軸）。
  - **排除**：`^(衛哨|站哨|衛哨表|本週衛哨)$` 段標題（站哨另計）、`回診|看診|門診|就診|返診`（就醫屬不在）。
  - `do-import`：寫 log（`b_日期` 覆蓋）＋建可編輯板＋寫 plans。
- `parseSched(text)`（準則）：同 v2。

---

## 五、各頁重點行為
- **排班頁**：同 v2（貼框＋日期標籤、`boardOpen`、閱讀/編輯鉛筆、計入可重複按、分菜列）。
- **站哨頁**：同 v2。
- **行程頁（v3 改版）**：日期 chips＋A/B＋今日狀態列。
  - **A（modeA）＝時間軸**：由「準則 ∪ 勤務事件時間 ∪ 補休時間」聯集出列——**排勤務只要有時間，就算準則沒那刻也自成一列**（`ensureRow` 依分鐘合併）。分菜、補休比照打掃/公差上色 tag。無時間的事件收在「未標時間」。
  - **B（modeB）＝每人一張卡片**（重寫）：每人只列自己「時間＋分類＋做啥」；沒特別勤務顯示「跟課表」；整天不在顯示原因。helper：`dayGroupColor / personDayItems / itemWhat`。`dayLegend` 已含分菜、補休。
- **統計頁**：卡片＋person sheet 明細（同 v2）。下方區塊：`syncBlock`（狀態卡）、`importBlock`（匯入）、`daysBlock`（各天紀錄＋刪這天）、`backupBlock`、清空全部。**唯讀時**只保留狀態卡＋各天紀錄（隱藏匯入／備份／清空）。

---

## 六、唯讀分享模式（v3 新增）
給鄰兵「只能看」。**兩層**：
- **試算表**：Google 分享設為**檢視者（Viewer）**＝真正防線（Apps Script 用擁有者身分跑，同步照常）。別把 /exec 網址或 Script 專案分享出去。
- **App**（前端鎖，防手滑、非防駭）：
  - `var EDIT_CODE="0000";`；`checkUnlock()`＝本機旗標 `localStorage["duty-edit-ok"]` 或網址 `?edit=0000`（`?edit=lock` 清旗標切回唯讀）。
  - `state.readOnly=!checkUnlock()`（**預設鎖住**，所以分享任何網址都只能看）。
  - `pushSync()` 開頭 `if(state.readOnly)return;`（唯讀只 pull 不 push）。
  - `handle()` 開頭 **VIEW_OK 白名單**：只放行瀏覽/複製/立即同步/解鎖；其餘 mutating action 一律擋（toast）。`onInput` 唯讀直接 return。
  - header 顯示「🔒 唯讀」膠囊（`data-action="unlock"`→`window.prompt` 密碼）。`pasteCard`、`statsPage`、行程頁刪鈕都對唯讀隱藏。
  - 擁有者上新版後自己也會先是唯讀，需開一次 `?edit=0000` 或點膠囊解鎖（本機永久記住）。

---

## 七、刪這天（v3 新增）
`delDayAll(md)`：移除 `log(b_md)`＋`plans[md]`＋`boards[md]`，若刪到 activeDate 則重置板，`persist()` 自動推雲端 → 試算表整張重建時該天消失。**不動 guard 與 absence**（那天若還有衛哨/休假會殘留在站哨/排休/矩陣，需各自面板處理）。
- 兩段式確認 `state.confirmDelDay`（存 md）。動作：`del-day-ask / del-day-cancel / del-day-go`。
- 入口：統計頁 `daysBlock` 每列、行程頁底部按鈕。唯讀隱藏＋被 handle 擋。

---

## 八、測試方法（node harness，每次大改都跑）
```bash
cd /tmp && sed -n '/<script>/,/<\/script>/p' /mnt/user-data/outputs/index.html | sed '1d;$d' > app.js
node --check app.js
```
功能測：stub `localStorage / location / window / document(FakeEl) / navigator / fetch / setInterval…`，**把 `"use strict";` 拿掉再 eval**；可用 `(function(){ ...src...; return {state,handle,parseFilled,delDayAll,payload,...};})()` 包起來取內部函式。**唯讀測記得先塞 `store["duty-edit-ok"]="1"` 才非唯讀**。`.gs` 也能 node 測：stub `SpreadsheetApp（含 newRichTextValue/newTextStyle/setRichTextValues）、Utilities、LockService、ContentService`，直接呼叫 `rebuild_(payload)` 收集寫入。前面對話有多個完整 harness 可照抄。

---

## 九、尚未做 / 待議（等使用者開口）
1. **排班頁日期標籤**上的刪除鈕（目前刪這天只在統計頁與行程頁；boardTabs 上還沒放）。
2. 站哨**自動分配跳過整天不在**（大公差/休假）的人（仍不看排休）。
3. 使用者早期「第三點」曾被截斷，內容不明，待補。
4. 名字變體字目前靠 `NAME_ALIASES` 白名單（只有 2 筆）；沒做通用模糊比對（易誤判）。遇新變體要手動加。
5. 「刪這天」是否要**連同 guard/absence** 一起刪——使用者說再決定。
6. **boards 不同步**（換裝置看不到可編輯板；但 plans/log/站哨/排休有同步，行程頁看得到結果）。
7. 矩陣「累計」目前放表頭下第一列；顏色深淺、擺法可再調。

---

## 十、注意事項
- 一律先讀本檔＋現有 index.html 再動；改完先 `node --check` 再功能測。
- 全程繁體中文、台灣軍中用語、簡潔、先做再解釋。
- 回應提醒：上傳覆蓋 GitHub、`?v=N`；雲端／複製部署後 https 測；`.gs` 若有改要重新部署（新版本、網址不變）。
- 目前 **index.html ≈ v27、Apps Script v2**。
