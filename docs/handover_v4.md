# 261 排勤務板 — 交接說明 v4（對應 index.html ≈ v33 · Apps Script v3）

給下一個 AI：先讀完本檔＋現有 `index.html` 再動手。使用者是台灣四個月兵、二階段下部隊排勤務，全程**繁體中文＋台灣軍中用語**、偏好「先做出來、每步驗證、簡潔」。改完**先 `node --check` 再功能測**，回應附上「上傳覆蓋 GitHub、網址加 `?v=N`」。**雲端同步／複製只能部署後在 https 測**，預覽沙盒擋 fetch。

> v3→v4 期間新增：站哨可編輯清除、日期標籤分週＋水平捲動、時間軸「現在」標線、**臨時行程**、唯讀模式精簡、**boards 上雲端＋Apps Script 分片存**、打飯時間 bug 修復、**資料損毀事故與根治（逐日合併＋墓碑）**、排休顯示 bug 修復。
>
> ⚠️ **第七節（資料安全）是本版最重要的一節，改同步邏輯前務必讀完。** 這版修的是一次真實的資料被削事故。

---

## 一、這是什麼
零依賴、純原生 HTML/JS 的**單一檔案 App**（`index.html`），手機用，部署在 GitHub Pages。幫「261 梯 8 人班」排每日勤務、整週站哨、看當天行程、看統計。主檔就是唯一要編輯的檔。後端 `雲端同步_AppsScript.gs`（Google Apps Script，貼進試算表）。

**班級名冊（代號=本名，寫死在 `PEOPLE`）**：1 李愷宸、2 江偉綸、3 陳柏翰、4 鄧旭辰、5 廖翊滕、6 陳俊穎、7 林柏宇、8 林崇浩。公版裡的「261」＝我們班要填人的位置。

**四個分頁（底部 nav）**：排班 / 站哨 / 行程 / 統計。單一 `render()` 依 `state.page` 重繪，事件用委派（`data-action`）。底層面板在 `#overlay`（sheet：picker 指派 / person 統計明細 / guard 站哨 / absence 排休 / **dayevt 臨時行程**）。

---

## 二、核心資料模型（`state`）
- **本機儲存** key `duty-board-v3`：`names, log, mealQueue, guard, guardTally, schedule, plans, absence, boards, activeDate, tomb, tombIds, wipe, stateTs`。
- **雲端 payload**：`names, log, mealQueue, guard, guardTally, plans, absence, boards(slim), tomb, tombIds, wipe, stateTs`。
  - **v4 起 boards 有同步**（見第六節），但**原文 raw 不上傳**（只存本機）。
  - **覆蓋規則已改**：不再「最後存的贏」，改成逐日合併＋墓碑，見第七節。

### log（統計來源，唯一計次依據）
`state.log = [{id, date:"M/D", ts, entries:[{p:人id, c:細項名, g:群組, t?:時間}]}]`
- **群組 g** 6 種：`打掃 / 公差 / 大公差 / 小公差 / 打飯 / 分菜`（行程另有 `站哨` 顏色但不進統計）。
- log id 兩種：
  - **`"b_"+date`**＝排班板計入（同日期覆蓋、不重複計數）。
  - **`"x_"+date+"_"+時間戳`**＝**臨時行程（v4 新增）**，不會被排班板重貼覆蓋。判斷用 `isExtra(e)`（`e.x===1` 或 id 開頭 `x_`）。
- **`ts`（v4 新增）**＝寫入時間，合併時決勝用。`getHistory()`→`HIST`。

### boards（可編輯板，每天一份）
`state.boards[date] = {raw, meta, duties, schedule, wd, committed, imported, ts}`
- **`ts`（v4 新增）**：`saveBoard()` 每次寫入蓋上 `Date.now()`，合併時同一天取較新的那份。
- `raw`（公版原文）與 `schedule.raw`（準則原文）**只存本機、不上雲端**（省 61% 體積）。`mergeBoards` 會保留本機原文。

### 派生值（不持久化，容易踩雷）
- **`state.available`**（今日出勤）是從 `absence` **推算**出來的，`syncAvail()` 才會重算。
- **v4 修**：`syncAvail()` 必須在**啟動、每次 pull 套用後、切換日期（loadBoard）、貼新公版（parse）**都呼叫，否則排休看起來像沒存到（v3 就是漏了這幾處）。

---

## 三、v4 新功能

### 1. 站哨可編輯／清除
- `guardUncommit()`：取消本週計入，扣回 `guardTally`，`committed=false` 可重排。
- `guardTallyAdj(pid,±1)`：每人累積次數 −／＋ 微調（不會變負）。
- `guardTallyClear()`：清空全部累積（兩段式確認 `state.confirmGuardClear`）。
- 動作：`g-uncommit / gt-dec / gt-inc / gt-clear-ask / gt-clear-cancel / gt-clear-go`。

### 2. 臨時行程（額外勤務）
臨時加開的勤務／純提醒，存進 `log` 用 `x_` id。
- `saveExtraEvent(f)` / `delExtraEvent(id)` / `extraEventsFor(md)` / `extraLogFor(md)` / `extraDates()`。
- UI：行程頁底部 `extraCard(md)`＋面板 `dayevtInner()`（表單 `state.evtForm`）。
- 分類選 `行程` ＝純提醒，**不計次**（entries 空）；其他分類會**併入公差次數＋時間軸＋八人分工**，`.gs` 完全不用改。
- `planForBoard` 會把 extra 併進 `plan.events`；只有臨時事件的日子也會出現在 `dayDates()`。
- `delDayAll` 會一併清掉當天的臨時項。

### 3. 時間軸「現在」標線
`modeA(plan)` 內：只有 `plan.date===todayLabel()` 才畫紅點＋紅線＋現在時刻，依 `nowMin` 插在對應兩列之間。檔尾 `setInterval` 每 60 秒重繪一次，**但只在**「行程頁 ∧ 沒開面板 ∧ 看的是今天」時才 render（避免搶輸入焦點）。

### 4. 排班日期標籤：分週＋水平捲動
`mondayOf(md)` 依週一分組；最近的週在**最上面**，往下越舊（本週／上週／上上週／N週前）。每週**一橫排**，左邊是週標籤（＋第一排的編輯鉛筆）固定不動，右邊日期 chips **`overflow-x:auto` 往右滑**，不再往下堆。

### 5. 去掉 `�`（U+FFFD）
三處源頭都清：`esc()` 全域過濾、`parseSched`（rest 與 clean）、`parseFilled` 的 `clean()`。

---

## 四、唯讀模式（v3 基礎 ＋ v4 精簡）
兩層防線同 v3（試算表設 Viewer 是真防線；App 端 `EDIT_CODE="0000"`＋`VIEW_OK` 白名單是防手滑）。**v4 讓唯讀畫面更乾淨**：

- **站哨頁**（`guardPage()` 開頭獨立唯讀分支）：只呈現「本週站哨」＋每天時段與人名。**拿掉**點我指派／自動分配／複製／計入／取消計入／重新貼上／累積次數管理。空班顯示「未排」不可點（`guardRow` 唯讀時渲染成 `<div>` 而非 `<button>`）；沒有班次的日子不列；整週沒排就只顯示一句「本週還沒有排站哨」。
- **統計頁**：只留每人人次卡＋顏色圖例。隱藏各天紀錄、同步卡、匯入、備份、清空。
- `board-load` 在 `VIEW_OK` 白名單內，唯讀者可切日期看不同天。

> ⚠️ **絕對不要在無痕／別人的手機上解鎖。** 事故就是這樣來的（第七節）。解鎖時已加強制先 `pullSync()`。

---

## 五、打飯時間（v4 修的 bug）
**症狀**：午打被標成 1700。
**根因**：`schedMatch()` 舊寫法是把早/午/晚打對到準則中「第 1／2／3 筆」含「打飯」的行。準則少寫一行就整個錯位（只有 1700 一行時，連早打都變 1700）。
**修法**：改用**時間區間**判斷 —— `mealWindow(period)`：早 `[0,600)`、午 `[600,900)`、晚 `[900,1440)`（分鐘）。該區間找不到就回 `""`，退回 `defaultTimeFor()` 的正確預設 `0600/1100/1700`。

**`fixMealTimes()`（一次性自動修復）**：掃 `state.boards` 所有 meal duty 重算，`timeSrc==="manual"` 不動。**只 `persistLocal()`，不主動 push**（v4 事故教訓：使用者什麼都沒做不該推雲端）。在啟動與每次 pull 套用後各跑一次，具冪等性。

---

## 六、雲端同步（v4 大改）

### boards 上雲端
- `slimBoards()`：剝掉 `raw` 與 `schedule.raw` 再上傳（實測省 61%）。
- `mergeBoards()`：合併時**保留本機原文**，並讓「編輯中的那天」(`activeDate`) 跟著合併結果走，否則後續 `saveBoard()` 會用舊資料蓋回去。該天若被刪則清空編輯狀態。
- `pushNow()`（統計頁「立即備份到雲端」按鈕，`data-action="push-now"`）：跳過 400ms debounce、立刻推、明確回報成敗。**仍然有用**，因為 `pushSync()` **失敗不會自動重試**、輪詢也只 pull 不 push。

### Apps Script v3：分片存（`write_` / `read_`）
Google 試算表**單格上限 50,000 字元**，boards 含原文 7 天就 32.5k、一個月直接爆。
- `CHUNK=40000, MAX_CHUNKS=30`：`write_(raw)` 切片寫入 `A1..A30`（先 `setNumberFormat("@")` 避免被當公式），並把多餘舊分片清空；`read_()` 讀 `A1:A30` 串接、遇空白停。
- **相容舊版**單格 A1 資料。超量會明確拋錯。
- `rebuild_` 不受影響（多的欄位它不讀）。`rebuildFromData()` 也走 `read_()`。
- 部署：改 `.gs` 後「管理部署作業→編輯→新版本→部署」，**網址不變**。

---

## 七、⚠️ 資料安全（v4 的血淚，改同步前必讀）

### 事故經過（真的發生過）
1. 使用者開**無痕**（本機 boards 空）→ **在無痕裡解鎖**。
2. 無痕變成「可編輯 ＋ 幾乎空的 boards」。
3. 當時 `fixMealTimes()` 會**自動 push**，加上 `payload` 是**整塊覆蓋** →
4. 雲端 7 天 boards 被換成無痕手上的 1 天；使用者手機 pull 回來，本機也只剩 1 天。

`log` 沒被削（無痕先 pull 到完整 log），這也是能救回來的原因。

### 根治手段（現行機制，別退回去）
1. **逐日合併，不整塊覆蓋**
   - `mergeBoards / mergeLog / mergePlans`：以「日期／id」為 key 做 union，同一筆取 `ts` 較新者。某台資料不全時只會**補上**，不會削掉別人的歷史。
   - **「雲端沒有某天」≠「刪除某天」**。
2. **刪除靠墓碑**
   - `state.tomb[md]=ts`（刪這天）、`state.tombIds[logId]=ts`（刪單筆臨時行程）、`state.wipe=ts`（清空全部統計）。
   - `killed(md,ts,tomb,wipe)` 判定；比較用 **`<=`**（同毫秒建立又刪除的邊界）。
   - 之後重貼同一天（`ts` 較新）可以正常復活，墓碑不會永久封鎖。
3. **沒成功 pull 過就不准 push**
   - `pulledOk`（首次 pull 成功才 true）、`pendingPush`（先 pull 再補推）。這條是杜絕事故的關鍵。
   - `unlock` 時重置 `pulledOk=false` 並強制 `pullSync()`。
4. **整份欄位不被自己的同步吃掉**（`names/guard/guardTally/mealQueue/absence` 沒有逐日 ts）
   - `state.stateTs`＝本機最後一次「使用者修改」時間（`persist()` 更新）；`dirty`＝有變更尚未成功上傳（push 成功才清）。
   - `applyRemote` 只有在 **`remoteNewer && !dirty`** 時才套用這些整份欄位。
   - 沒這層的話：排休後 0.4 秒的 debounce 內剛好碰上 20 秒輪詢 → 雲端舊資料蓋掉剛排的休，再把蓋掉的結果推上去（v3 的隱形殺手）。
5. **`fixMealTimes()` 不主動 push**。

### 救援：從紀錄重建排班板
- `missingBoardDays()`：找出「log 有紀錄但 boards 沒有、且不在墓碑」的日子。
- `rescueBar()`：排班板頁最上方的橘色卡片，`data-action="rebuild-boards"`。
- `rebuildBoards()`：對每個缺的日子呼叫 `boardFromImport(md, entries, wd)` 重建；v4 已讓它**補 `ts`** 並**從 `plans[md]` 回填行動準則 items 與星期幾**。刻意刪掉的日子（有墓碑）不會被救回來。
- 重建出來的板標 `imported:true`、`raw="（由統計匯入）"`。想要原文就重貼一次公版。

### 使用紀律（要在回應裡提醒使用者）
- **只有一支手機解鎖編輯，其他人一律唯讀。**
- 換手機編輯前先開 App 讓它 pull 到最新。
- 備份碼（`backupBlock`，只有 `names/log/mealQueue`）**救不回排班板**；雲端才是完整備份。但備份碼是統計的離線保險，而統計在就能重建排班板。

---

## 八、各頁重點行為（v3 基礎上的差異）
- **排班頁**：`pasteCard() + boardTabs() + rescueBar()`。日期標籤見三-4。
- **站哨頁**：唯讀分支見第四節；編輯模式多了取消計入與累積微調。
- **行程頁**：A＝時間軸（＋現在標線）、B＝每人卡片；底部 `extraCard`（臨時行程）＋刪這天。
- **統計頁**：卡片＋圖例；非唯讀才有 `syncBlock`（含「立即備份到雲端（N 天排班板＋行程）」）、`importBlock`、`daysBlock`（**v4 改成依日期彙整人次**，臨時行程不另開一列）、`backupBlock`、清空全部。

---

## 九、測試方法（node harness，每次大改都跑）
```bash
cd /home/claude && sed -n '/<script>/,/<\/script>/p' index.html | sed '1d;$d' > /tmp/app.js
node --check /tmp/app.js
```
功能測：stub `localStorage / location / window / document(FakeEl) / navigator / fetch / setInterval…`，**把 `"use strict";` 拿掉再 eval**，用 `(new Function(src + ";return {state,payload,applyRemote,...}"))()` 取內部函式。

- **唯讀測**記得先塞 `store["duty-edit-ok"]="1"` 才是非唯讀；唯讀就別塞。
- **合併測**要記得給 boards 設 `ts`，否則同分取本機（保守策略）。
- `.gs` 分片測：模擬 Sheets 單格 50000 上限，驗證 round-trip、大→小要清掉殘留分片、相容舊版單格、超量報錯。
- v4 累積 **111 項測試**：`harness`(28 編輯模式) / `h2`(13 唯讀＋標籤) / `h3`(22 boards 同步合併) / `meal3`(12 打飯時間) / `safe`(20 資料安全＋救援) / `abs`(16 排休＋站哨＋跨天)。前面對話有完整 harness 可照抄。

---

## 十、尚未做 / 待議
1. **`pushSync()` 失敗不會自動重試**（已向使用者提議「失敗後 5/15/45 秒重試」，尚未實作）。目前靠「立即備份到雲端」按鈕手動補推。
2. `names/guard/guardTally/mealQueue/absence` 仍是**整份欄位**（只有 `stateTs`＋`dirty` 保護，沒有逐項時間戳）。兩台同時編輯不同欄位時仍會取一邊。要更穩就得逐項加 ts。
3. 「刪這天」**不動 guard 與 absence**（沿用 v3）。
4. 排班頁日期標籤上還沒放刪除鈕。
5. 站哨自動分配**不看排休**（不跳過整天不在的人）。
6. 名字變體靠 `NAME_ALIASES` 白名單（刻意不做模糊比對，陳柏翰↔陳柏凱會誤判）；遇新變體手動加。
7. boards 的 `raw` 原文不同步（換手機看得到板與行程，但沒有原文預覽）。

---

## 十一、注意事項
- 一律先讀本檔＋現有 `index.html` 再動；改完先 `node --check` 再功能測。
- 全程繁體中文、台灣軍中用語、簡潔、先做再解釋。
- 回應提醒：上傳覆蓋 GitHub、`?v=N`；雲端／複製部署後 https 測；`.gs` 若有改要重新部署（新版本、網址不變）。
- **動到 `payload / applyRemote / pushSync / pullSync` 之前，先讀第七節。** 那裡每一條保護都是拿真實資料損毀換來的。
- 目前 **index.html ≈ v33、Apps Script v3（分片）**。
