# 261 排勤務板 — 交接說明 v2（對應 index.html v22）

給下一個 AI：先讀完本檔＋現有 `index.html` 再動手。使用者是台灣四個月兵、二階段下部隊排勤務，全程**繁體中文＋台灣軍中用語**、偏好「先做出來、每步驗證、簡潔」。改完**先 `node --check` 再功能測**，回應附上「上傳覆蓋 GitHub、網址加 `?v=N`」。**雲端同步／複製只能部署後在 https 測**，預覽沙盒擋 fetch。

---

## 一、這是什麼
零依賴、純原生 HTML/JS 的**單一檔案 App**（`index.html`），手機用，部署在 GitHub Pages。幫「261 梯 8 人班」排每日勤務、整週站哨、看當天行程、看統計。主檔就是唯一要編輯的檔。後端 `雲端同步_AppsScript.gs`（Google Apps Script，貼進試算表）。

**班級名冊（代號=本名，寫死在 `PEOPLE`）**：1 李愷宸、2 江偉綸、3 陳柏翰、4 鄧旭辰、5 廖翊滕、6 陳俊穎、7 林柏宇、8 林崇浩。公版裡的「261」＝我們班要填人的位置。

**四個分頁（底部 nav）**：排班 / 站哨 / 行程 / 統計。單一 `render()` 依 `state.page` 重繪，事件用委派（`data-action`）。底層面板在 `#overlay`（sheet：picker 指派 / person 統計明細 / guard 站哨 / absence 排休）。

---

## 二、核心資料模型（`state`）
- **本機儲存** key `duty-board-v3`：`names, log, mealQueue, guard, guardTally, schedule, plans, absence, boards, activeDate`。
- **雲端同步**（payload）：`names, log, mealQueue, guard, guardTally, plans, absence`（**boards / schedule 不同步**，跟排班板一樣只存本機；同步的是「結果快照 plans＋統計 log＋站哨＋排休」）。覆蓋規則＝最後存的贏。

### log（統計來源）
`state.log = [{id, date:"M/D", entries:[{p:人id, c:細項名, g:群組}]}]`
- **群組 g** 共 6 種：`打掃 / 公差 / 大公差 / 小公差 / 打飯 / 分菜`（行程另有 `站哨` 顏色但不進統計）。
- **細項 c** 保留真名：打掃/公差=勤務名；打飯=早打/午打/晚打；分菜=分菜早/中/晚；大小公差=實際勤務名（如「補庫公差」）。
- 由排班「計入」或統計「匯入」產生的 log，**id 一律用 `"b_"+date`**（同日期覆蓋、不會重複計數）。
- `getHistory()`→`HIST={h:{id:{細項:次}}, cg:{細項:群組}, g:{id:{群組:次}}}`。卡片正面用 `HIST.g`（群組總數）；明細用 `HIST.h`。`groupTotal(id,群組)`、`nonMealTotal=total-打飯`。

### boards（可編輯的板，每天一份，本機）
`state.boards[date] = {raw, meta, duties, schedule, wd, committed, imported}`
`state.activeDate`＝目前載入編輯的日期；`state.boardMode`＝`edit|view`；`state.boardOpen`＝板內容是否展開（不持久化，預設 false）。
- `saveBoard()`（在 `persistLocal` 頂部呼叫，把目前 working state 寫回 `boards[activeDate]`）、`loadBoard(date)`、`boardDates()`。
- **勤務物件 duty**：`{id, kind:'fill'|'meal'|'manual', mode:'replace'|'append', label(去編號/emoji/*N/括號), time, period(AM/NOON/AFT/PM/GC), block(衝突用), count, assigned:[ids], keepAll, removed, original, tok261?, extra:null|'big'|'small', schedTime, timeSrc:''|'auto'|'manual', fenca:'head'|'AM'|'NOON'|'PM'?}`。

### 行程（統一取數）
`planForBoard(date)`：正在排的那天用**即時 `state.duties`**、其他天用 `state.boards[date]`、都沒有才 fallback `state.plans[date]`。回傳 `{date,weekday,schedule,events,rests,outs}`。
- `events`＝`eventsFromDuties(duties)` ＋ `guardEventsFor(md)`。event=`{range,min,label,group,people,keepAll}`。
- 站哨代碼是**起訖時**：`0608`=06:00–08:00、`1416`=14:00–16:00、`2402`=00:00–02:00（跨夜）。用 `guardRange(code)` 轉成 `"0600-0800"`，label 內含 `shiftHM(code)`。
- `rests`＝補休（時間區間，見下）、`outs`＝整天不在。

### absence（排休/不在）
`state.absence[md][pid] = {reason, range}`：
- **補休**＝`range` 時間區間（如 `"1220-1430"`），只擋跟該段**重疊**的勤務（`restBlock`），其他時間可排。單日。
- **大公差 / 休假 / 其他**＝`range:""`＝整天不排（`fullDayOut`），可一次記多天。
- `syncAvail()` 依「整天不在」設 `state.available`（板 render 時呼叫）；`absenceRec/absentReason/restBlock/spanMin/fmtSpan`。
- 出勤卡點掉某人＝記一筆當天「其他」整天不排。排休面板 sheet（type `absence`）可選人、選原因、補休填區間、整天選天數。

### 站哨 / 準則
- `state.guard = {raw,meta,days:[{date,range,shifts:[{id,code,loc,assigned}]}],loaded,committed}`；`guardTally`。
- `state.schedule = {raw,items:[{id,time,range,text,min}],title,loaded,date}`（準則；本機）。`DEFAULT_SCHED` 內建固定時間（起床0530…燈火2130、三餐0600/1100/1700、外掃0630-0740、分菜早0430-0630/中0830-1130/晚1500-1730），`effectiveSchedule()`＝準則有就用準則、沒有用內建。`autoTagTimes()`：公版embedded time > 準則關鍵字對應 > 內建預設；`timeSrc==='manual'` 不覆蓋。

---

## 三、三個解析器（重點）
- `parseGongban(text)`（排班板）：抓含冒號的勤務。261 各寫法（`261 / +261 / 261*3 / 261（3）/ 261梯（8）/（261）/ 258+261`）、`find261/count261Token`。**分菜家族**：`分菜*2：` 標題→`fenca:'head'`（不可指派），底下 `早：/中：/晚：` →分菜早/中/晚（append 綁各自行，輸出填回正確位置）。**🚨 開頭**→自動 `extra:'small'`（小公差）、清 emoji、`*N`當人數、括號內時間帶入。`早打/午打/晚打`→meal。
- `parseFilled(text)`（統計「貼已填公版來記錄」）：只認我們 8 人名字。分菜獨立群組＋早中晚、打飯早中晚、🚨→小公差、🔷🔵當區段、清 emoji。`do-import` 會：寫 log（id `b_日期`，覆蓋）＋`boardFromImport()` 建可編輯板＋`planFromImport()` 寫 plans。→ 排班日期標籤點得進去、行程 A/B 同步。
- `parseSched(text)`（準則）：時間軸；4碼或區間；時間單獨一行接下一行。

---

## 四、各頁重點行為
- **排班頁**：主畫面只有「貼公版框＋日期標籤 `boardTabs()`」。按解析或點日期標籤才展開板（`boardOpen`）。日期標籤點＝載入該天並進**閱讀**模式；左上**鉛筆**切編輯。閱讀模式版面跟編輯一樣（看得到排好的人與所有表單），但 `handle()` 開頭會擋掉會改人/改勤務的 action。**計入按鈕可重複按**（依日期覆蓋 log、打飯輪序只在第一次計入前進、板不清空）。有分菜列 `fencaRow()`（早中晚橫向選人，填回各自行）。
- **站哨頁**：貼衛哨公版解析整週、指派、自動平均、複製、計入 `guardTally`。
- **行程頁**：日期 chips（來自 boards∪plans，去重）＋A/B 切換＋「今日狀態」列（誰整天不在、誰補休X區間）。A=當天流程時間軸（準則/內建）；B=每時段八人分工（勤務/站哨/補休/跟課表/待命）。
- **統計頁**：卡片正面只顯示各**群組×次**（縮合）；點卡片開 person sheet→**群組可各自收合**（預設收起），展開看細項（大小公差看實名、打飯/分菜看早中晚）。可扣單項/改名/清空。貼已填公版匯入（見上）。雲端同步設定、備份還原、清空全部。

---

## 五、測試方法（node harness，每次大改都跑）
```bash
cd /tmp && sed -n '/<script>/,/<\/script>/p' /mnt/user-data/outputs/index.html | sed '1d;$d' > app.js
node --check app.js
```
功能測：stub `localStorage/document(FakeEl)/navigator/fetch/setInterval...`，**把 `"use strict";` 拿掉再 eval**（strict 下 eval 宣告不外洩），接 app.js 後直接呼叫 `parseGongban/parseFilled/parseSched/autoTagTimes/planForBoard/boardFromImport/commit/loadBoard/dayDates/restBlock/...` 印結果。（前面對話有多個完整 harness 範例可照抄。）

---

## 六、尚未做（等使用者開口）
1. 日期標籤的**刪除鈕**（天數多了想清掉某天的板）。
2. 站哨**自動分配跳過整天不在（大公差/休假）**的人（目前不看排休）。
3. 使用者第三點曾被截斷（「第三 每個人可能…」），內容不明，待補。
4. **名字變體字**（例：公版打「廖翊縢」vs 名冊「廖翊滕」）匹配不到，目前需手動改；可考慮寬鬆比對但小心誤判。
5. 行程頁站哨若起始時間撞到課表項會併格（只在該行顯示區間），可考慮讓站哨自成一格。
6. 板本身不同步（換裝置看不到可編輯板，但 plans/log/站哨/排休有同步）。

---

## 七、注意事項
- 一律先讀本檔＋現有 index.html 再動；改完先 `node --check` 再功能測。
- 全程繁體中文、台灣軍中用語、簡潔、先做再解釋。
- 回應提醒：上傳覆蓋 GitHub、`?v=N`；雲端／複製部署後 https 測。
- 目前約 **v22**。
