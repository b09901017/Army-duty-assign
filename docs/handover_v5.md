# 261 排勤務板 — 交接說明 v5（對應 index.html ≈ v34 · Apps Script v3）

給下一個 AI：**先讀 v4 再讀本檔**。v5 只加了「視覺化時間軸」相關的**純畫面 + 重用既有存檔**功能，**完全沒動**雲端同步／資料安全那一套（`payload / applyRemote / pushSync / pullSync / mergeBoards / 墓碑`）。所以**同步、資料損毀防護一律以 v4 第七節為準**，改那塊前務必回去讀 v4。

全程繁體中文＋台灣軍中用語，先做再解釋。改完先 `node --check` 再功能測（見 v4 第九節、本檔第六節）。回應提醒：上傳覆蓋 GitHub、網址加 `?v=N`；雲端／複製部署後 https 測。`.gs` 這版沒改，不用重新部署。

> **v4→v5 新增**：排班頁多一個「清單／時間軸」子檢視（可視覺化排勤務、直式時間軸＋重疊並排、點時段看誰有空／排人）；行程頁多第三檢視「八人時段表」（Y＝時間、X＝8 人）。核心是把**真實分鐘重疊**畫出來——舊版判斷卡到只看粗時段（上午/中午/晚上/公差），看不出 0600-0620 跟 0900 到底有沒有撞；v5 用真正的起訖分鐘。

---

## 一、這次加了什麼（使用者的痛點）

使用者排班時「看不出哪些勤務時間互相卡到、某人已被排到哪些時段、能不能再排某勤務」。根因：舊的 `blockOf()/occupiesFor()/computeConflicts()` 是用**粗時段 key**（`AM/NOON/PM/GC` 或 `T####`）判重疊，不是真實分鐘。v5 新做一條**真實 range 重疊**的線，並畫成時間軸。

兩個新畫面（**都沒有動底層資料模型，只是新的 render + 重用既有 mutator**）：

1. **排班頁 → 時間軸子檢視**（可編輯）：直式時間軸，勤務／站哨／補休以方塊呈現，**重疊的自動並排**（像 Google 日曆日檢視）→ 一眼看出卡到。點方塊可改名稱、改時段、看誰有空、排人。
2. **行程頁 → 八人時段表**（唯讀檢視 C）：Y＝時間、X＝8 人，看每個人整天時段分佈，今天會畫「現在」線＋旁註誰在幹嘛。

---

## 二、設計決定（重要，改之前先懂為什麼）

使用者原本畫的是「橫軸擺一排勤務欄」。手機寬度只放得下 2-3 欄 → 十幾個勤務要左右滑、反而看不到全部。**問過使用者後改成**：

- **排班頁時間軸**＝直式時間軸（時間由上往下，手機順著滑）＋**重疊分欄**（只有真的同時段的才並排）。→ 選 `直式時間軸＋重疊並排`。
- 放在**排班頁的子切換**（不是第 5 個底部頁籤，拇指區會太擠）。→ 選 `排班頁加清單/時間軸切換`。
- **日常事件（起床/吃飯/午休…）唯讀當背景**，只顯示那時誰有空，不在時間軸裡編輯。→ 選 `唯讀當背景`。

### 時段「虛實」規則（`tlVis` 給畫圖、`occSpan` 給判卡到，兩個要分開）

| 勤務 schedTime | 畫圖（時間軸方塊） | 判「卡到」佔用時段 |
|---|---|---|
| 有起訖 `0600-0740` | 實心方塊 `[s,e]` | `[s,e]` |
| 只有點 `0600` | **約 30 分虛線方塊**（`tentative:true`，提示補結束時間），進時間軸並排 | `[s,s+30]` |
| 完全沒填 | **不畫在時間軸**，改成上方「未定時段」小丸（點我設時間） | `null`（不佔用、不擋人） |

> ⚠️ 使用者一開始要求「只有點→往下虛到收假、沒填→整天虛」。實作後發現：**打飯／打掃預設常是點時間**，畫成「往下虛到 2400」會整條蓋掉別人、超亂（第一版真的長那樣）。而且使用者自己講打飯時是講範圍（0600-0740）。所以改成上表：**點→約 30 分小虛塊**（會並排、看得出卡到，也提示去補結束時間）、**沒填→上方小丸**。若之後使用者想要回「整天虛條」的版本，`tlVis` 已保留（空→`{0,1440,solid:false}`、點→`{s,1440,solid:false}`），把 `tlBoardData` 的分類改回 `bands` 即可，但不建議。

---

## 三、新增的函式（都在 `dayGroupColor` 下方那一整塊）

**共用 helper：**
- `TL_DAYEND=1440`、`tlHM(min)`→`"HH:MM"`。
- `occSpan(rangeStr)`：判卡到用的佔用區間（無→null、點→`[s,s+30]`、區間→自身）。
- `tlVis(rangeStr)`：畫圖用（見上表）。
- `tlAxis(anchors, nowMin)`：**壓縮空時段**的時間軸。收集所有 anchor 邊界→切段；有事的段照時長給高度（`clamp(dur*0.6, 30, 150)`px），空白段壓成 18px 細縫。回傳 `{y(min)→px, H, B(邊界), lo, hi}`。沒資料回 `null`。
- `tlLanes(blocks)`：重疊分欄（貪婪 interval partition），塞 `bk.lane`，回傳欄數。**只給實心方塊用**。
- `tlFreeAt(s, e, md, exclId)`：**這次的核心**。回傳 8 人 `{pid, free, why}`。不有空的原因優先序：整天不在 → 補休/不在時段壓到 → 站哨重疊 → 其他已排勤務重疊（用 `occSpan`）。`s==null`（勤務沒設時段）時只擋「整天不在」。`exclId`＝排這項時排除它自己（不然自己人算自己卡）。

**排班頁時間軸：**
- `tlBoardData()`：讀 `state.duties`（含沒排人的，才排得進去）＋ `guardEventsFor(md)`（站哨，唯讀）＋ `effectiveTimed()`（準則日常事件→小丸 marks，唯讀）＋ `restsOutsFor(md)`（補休/不在→上方摘要＋餵給 freeAt）。分成 `solids / untimed / marks / rests / outs`，並收集 `anchors`。
- `tlBoardToggle()`：清單／時間軸切換（`state.boardView`）。
- `boardTimeline()`：主 render。上方補休/不在摘要 + 未定時段小丸 + 時間軸卡片（絕對定位：格線、marks 小丸、實心方塊分欄、今天畫現在線）+ 圖例 + `addDutyBlock()`（重用既有手動新增）。欄多於 3 欄會橫捲。
- `tlBlockInner(d)`：點勤務方塊開的編輯面板（sheet type `tlblock`）。名稱 input（`tl-name`）＋時段 input（`dtime`，重用）＋快捷 chips（`set-time`，重用）＋清空鈕（`tl-clear`）＋人數/八人一起（`count-*`/`toggle-keepall`，重用）＋**誰有空清單**（`tlFreeAt`，點 `pick-toggle`/`pick-warn` 重用）＋刪除（`del-duty` 重用）。唯讀/閱讀模式只顯示不給改。
- `tlFreeInner()`：點站哨方塊或日常事件小丸開的唯讀「誰有空」清單（sheet type `tlfree`，資料放 `state.tlFree`）。

**行程頁：**
- `modeC(plan)`：八人時段表。用既有 `personDayItems(plan,pid)` 取每人 items，`tlAxis` 排時間軸，8 欄用 CSS `calc` 均分。整天不在的人整欄打灰。今天畫現在線＋上方「現在 誰在幹嘛」摘要。點時間的 item 畫成 30 分方塊、沒點時間的不畫。

---

## 四、接線改動（除上面新函式外）

- `state` 新增：`boardView:"list"`（排班頁子檢視）、`tlFree:null`（tlfree 面板資料）。
- `currentDuty()`：改成 `picker` **或** `tlblock` 都解析 → 讓 `count-*/toggle-keepall/del-duty/set-time/pick-*/dtime` 這些既有 handler 對 tlblock 也生效（大量重用、少寫程式）。
- `sheetInner()`：加 `tlblock`（`tlBlockInner`）、`tlfree`（`tlFreeInner`）兩種。
- `render()` 排班分支：`schedCard()+availCard()+tlBoardToggle()`，然後 `boardView==="time"?boardTimeline():(mealsRow()+fencaRow()+dutyList())`。`boardActions()/commitBtn()` 兩個檢視都保留（都是操作同一批 `state.duties`）。
- `dayPage()`：toggle 多第三顆 `C 八人時段表`；body `mode==="C"?(dayLegend()+modeC(plan)):...`。
- `handle()`：加 `board-view / tl-open / tl-free / tl-clear`。
- `onInput()`：加 `tl-name`（改 `currentDuty().label`）。
- `VIEW_OK`（唯讀白名單）：加 `board-view / tl-open / tl-free`（唯讀者可看時間軸、可點看誰有空，但排人會被 `pick-toggle` 不在白名單擋掉）。
- `closeSheet()`：關 `tlblock` 面板時（且非唯讀/非閱讀模式）**呼叫 `persist()`**，讓時間軸的改名/改時段/排人即使沒按「計入統計」也會落地＋走既有防護推雲端。（list 版的 picker 維持原樣沒動。）
- 檔尾 60 秒 `setInterval`：除了行程頁看今天，**排班頁時間軸看今天**也會每分鐘重畫（更新現在線）。

---

## 五、沒動到的東西（安全邊界）

- **雲端同步／資料安全整套沒碰**：`payload / slimBoards / applyRemote / pushSync / pullSync / mergeBoards / mergeLog / mergePlans / 墓碑`。時間軸的所有寫入都走既有 `saveBoard()` / `persist()`，跟清單版一模一樣的路徑。
- **`.gs` 沒改**，不用重新部署。
- `blockOf/occupiesFor/computeConflicts`（清單版的粗時段判卡到）**保留原樣**，沒有改成 range 版（避免動到清單頁既有行為）。時間軸走自己的 `tlFreeAt`（真實 range）。所以**清單頁和時間軸頁對「卡到」的判定精細度不同**（清單粗、時間軸細），這是刻意的。

---

## 六、測試（node harness）

`/tmp/tl_test.js`（62 項，含二次優化的預設時段/自動補休）＋ `/tmp/smoke.js`（各頁 render 不炸）為這次寫的。要重跑：把 harness 照 v4 第九節方式 stub（`localStorage/document(FakeEl)/window/navigator/location/setInterval…`、拿掉 `"use strict"`、`new Function(src+";return {...}")` 取內部函式）。**唯讀測記得 `store["duty-edit-ok"]="1"` 或直接 `state.readOnly=false`**，否則 `tlBlockInner` 不會給編輯控制項。

驗過的重點：
- `occSpan/tlVis` 三種規則；`tlAxis` 壓縮 + `y()` 單調；`tlLanes` 重疊分兩欄。
- `tlBoardData` 正確分 solids（含站哨）/untimed（沒時間）；點時間→`tentative` 小塊。
- `tlFreeAt`：早打/站哨/補休/整天不在都正確擋掉，排 d1 時排除自己 → 5 人有空。
- `tlBlockInner` 有名稱/時段/清空/誰有空；編輯→`persistLocal()`→`boards` 與 localStorage 都落地。
- `modeC` + `personDayItems`（整天不在的人無 item）。
- 8 頁 render（board list/time、day A/B/C、guard、stats）＋ tlblock/tlfree 面板都不丟例外。
- 另用 Playwright（Chromium）實際截三張圖看版面：排班時間軸、八人時段表、tlblock 面板，確認絕對定位/分欄/顏色/壓縮都正常。

---

## 六之二、v5 二次優化（使用者回饋後）

1. **排班時間軸不再畫日常事件當背景**（太雜）。`tlBoardData` 拿掉 `marks`（準則 `effectiveTimed`）。要看誰有空還是點勤務/站哨方塊。
2. **未定時段那排多一顆「＋新增勤務」pill**（`open-add`）；表單改成 `state.addForm.open` 時直接在該排下方展開（`boardTimeline` 內 `addForm=addDutyBlock()`），底部不再另放一顆。
3. **固定勤務預設時段**（`dutyDefaultRange(d)`）：早上打掃（走廊/馬路/打水/打冰…）→ `0600-0620`；晚上浴廁 → `2100-2120`；打飯（打飯班作業，約 1.5h）早/午/晚 → `0600-0730 / 1100-1230 / 1700-1830`。判斷用 `planGroup`＋label＋period。使用者自己填了範圍就用他的（`dutyEffSpan` 優先序：使用者範圍 > 預設 > 只有點約30分 > 無）。**只作用在時間軸的顯示與 `tlFreeAt` 佔用**，沒有寫進 `schedTime`、沒有動 `defaultTimeFor/autoTagTimes/fixMealTimes`（那塊是 v4 打飯 bug 的敏感區）。
4. **自動補休**（`impliedRests(md)`，**推導、不寫進 `state.absence`**）：午打排到的人 → 補休 `1230-1430`；夜哨（該日 00:00–06:00 起的班）→ `0550-0740`；午哨（12:00–14:00 起的班）→ `1400-1600`。這些補休會：①畫進排班時間軸（`kind:"rest"` 方塊，虛框、`自動` 標記）②算進 `tlFreeAt` 佔用（同時段別項會擋人）③在 `tlBlockInner` 午打面板頂端顯示「排到的人會自動補休 …」提示、每個已排的人下面標「已排 · 補休 1230-1430」。
   - `dutyRestRange(d)`＝這項勤務排到的人會補休的區間（目前只有午打）；`tlAllRests(md)`＝手動排休＋自動補休去重。
   - ⚠️ **只用在排班時間軸（activeDate）**：`impliedRests` 讀 `state.duties`（＝當前編輯板），別的日期不對，所以 `modeC`（行程頁可看任意日）**沒有**接自動補休，只顯示 `absence` 的手動補休。要讓行程頁也帶自動補休，得改成從該日 `boards[md].duties` 推，較麻煩，暫不做。
5. **閱讀模式／唯讀點勤務方塊會提醒**：`tl-open` 從 `VIEW_OK` 拿掉（鎖定唯讀→「唯讀模式」flash）、加進 `boardMode==="view"` 擋單（閱讀模式→「點鉛筆切換編輯」flash），跟清單頁 `pick` 一致。站哨/日常的 `tl-free`（純看誰有空）維持可點。

## 七、已知未做 / 待議（接手可挑）

1. **點時間→約 30 分**只是預設佔用，判卡到會低估（打飯其實近 90 分）。要更準就讓使用者填範圍（時間軸就是在推他填）。若要早/午/晚打各自預設時長，改 `tlBoardData` 給 meal 一個預設 `e` 即可。
2. **`tlFreeAt` 只看「已排到別項」的人**當忙碌；「這項的 count 還沒排滿但先排了幾個」不會互相擋（同一項內不算卡）。目前夠用。
3. 時間軸的「新增勤務」重用 `addDutyBlock()`（手動新增，含時間欄）；沒有做「在時間軸上拖曳畫出一個時段」。手機拖曳成本高，暫不做。
4. `modeC` 沒有把「未標時間」的 item 列出來（沒點時間就不畫）；使用者要看未標時間的，行程頁 B（八人分工）有列。
5. 清單頁粗時段判卡到沒有升級成 range 版（見第五節）。若要統一，把 `occupiesFor`/`computeConflicts`/`restBlock` 改用 `occSpan`＋range 重疊即可，但會動到清單頁既有行為，要一起重測。
6. 站哨方塊在時間軸是唯讀（點了看誰有空），不能在時間軸裡改站哨 → 站哨還是去站哨頁排。
7. ~~補休/不在只在上方摘要~~（v5 二次優化已改成畫進時間軸方塊）；整天不在的人仍只在上方摘要一行。
8. **時間軸重疊超過 3 欄會橫向捲動**（`wide=lc>3`，96px/欄）。早上打掃全部固定 0600-0620 → 好幾項擠同 20 分鐘 → 會分很多欄要左右滑。這是刻意（重疊本來就該並排），但那個時段清單頁反而好排。若嫌太寬可把 `wide` 門檻調高改用百分比欄（會變窄但一眼看完）。
9. 自動補休（午打/夜哨/午哨）只在**排班時間軸與其排人面板**呈現，沒進 `absence`、沒進行程頁/統計/自動分配。若要讓它真的擋自動分配或顯示在行程頁，需要更大改動（見六之二第 4 點）。

---

## 八、注意事項

- 一律先讀 v4＋本檔＋現有 `index.html` 再動；改完先 `node --check` 再功能測。
- **動同步／資料安全 → 回 v4 第七節**，v5 沒碰那塊。
- 回應提醒：上傳覆蓋 GitHub、`?v=N` 避快取；雲端／複製部署後 https 測。`.gs` 這版沒改。
- 目前 **index.html ≈ v34、Apps Script v3（分片）**。
