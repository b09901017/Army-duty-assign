# 261 排勤務板 — 交接說明 v6（對應 index.html ≈ v35 · Apps Script v3）

給下一個 AI：**先讀 v4 再讀本檔**。v4 是資料模型／雲端同步／資料安全的權威版本，那些**完全沒被 v5/v6 動過**。v5、v6 加的是「視覺化時間軸」這個新功能，**純畫面 + 重用既有 mutator**，本檔把它整個講清楚（不是逐次補丁的流水帳）。

全程繁體中文＋台灣軍中用語，先做再解釋。改完先 `node --check` 再功能測（見 v4 第九節、本檔第七節）。回應提醒：上傳覆蓋 GitHub、網址加 `?v=N`；雲端／複製部署後 https 測。`.gs` 這幾版沒改，不用重新部署。

> **v4→v6 新增**：排班頁多一個「清單／時間軸」子檢視（可視覺化排勤務、直式時間軸＋重疊並排、點時段看誰有空／排人）；行程頁多第三檢視「八人時段表」（Y＝時間、X＝8 人）；固定勤務（早/晚打掃、打飯）有預設時段；站哨/午打會自動推導補休並接進「誰有空」「今日排休」「行程頁」「自動分配」；同時段的打掃收合成一格；所有補休（手動＋自動）都能在時間軸點開調時間。
>
> v5 是分四輪做的（六之一～六之四），本檔（v6）把最終狀態寫成一份完整說明，不用回頭翻 v5 的逐輪記錄——除非想知道「為什麼」的取捨過程，那部分 v5 保留著。

---

## 一、這次加了什麼（使用者的痛點）

使用者排班時「看不出哪些勤務時間互相卡到、某人已被排到哪些時段、能不能再排某勤務」。根因：舊的 `blockOf()/occupiesFor()/computeConflicts()`（清單頁用的，**現在還在、沒被取代**）是用**粗時段 key**（`AM/NOON/PM/GC` 或 `T####`）判重疊，不是真實分鐘。v5/v6 另外做了一條**真實 range 重疊**的線，畫成時間軸，清單頁與時間軸頁因此對「卡到」的判定精細度不同（清單粗、時間軸細），這是刻意的取捨，沒有回頭升級清單頁。

兩個新畫面（**都沒有動底層資料模型，只是新的 render + 重用既有 mutator**）：

1. **排班頁 → 時間軸子檢視**（可編輯）：直式時間軸，勤務／站哨／補休以方塊呈現，**重疊的自動並排**（像 Google 日曆日檢視，左右順序見第四節）→ 一眼看出卡到。點方塊可改名稱、改時段、看誰有空、排人。
2. **行程頁 → 八人時段表**（唯讀檢視 C）：Y＝時間、X＝8 人，看每個人整天時段分佈，今天會畫「現在」線＋旁註誰在幹嘛。

---

## 二、設計決定（改之前先懂為什麼）

- **直式時間軸＋重疊分欄**，不是「橫軸一排勤務欄」：手機寬度只放得下 2-3 欄，十幾個勤務要左右滑反而看不到全部。時間由上往下、手機順著滑，只有真的同時段的才並排。
- 放在**排班頁的子切換**（清單／時間軸），不是第 5 個底部頁籤：拇指區會太擠。
- **日常事件（起床/吃飯/午休…）不畫進時間軸背景**：一開始有畫、太雜，使用者反映後拿掉了。準則只在別處用（`effectiveTimed()`／行程頁）。

### 時段「虛實」規則（`tlVis`／`occSpan`／`dutyEffSpan`／`dutyDefaultRange`，四個要分清楚）

| 勤務 schedTime | 畫圖（時間軸方塊） | 判「卡到」佔用時段 |
|---|---|---|
| 有起訖 `0600-0740` | 實心方塊 `[s,e]` | `[s,e]` |
| 只有點、**固定勤務**（早/晚打掃、打飯） | 實心方塊，用**預設時段**（見下）、標 `defaulted:true` | 預設時段 |
| 只有點、非固定勤務 | **約 30 分虛線方塊**（`tentative:true`） | `[s,s+30]` |
| 完全沒填 | **不畫在時間軸**，上方「未定時段」小丸（點我設時間，旁邊有「＋新增勤務」） | `null`（不佔用、不擋人） |

`dutyDefaultRange(d)`＝固定勤務的預設時段：
- 早上打掃（走廊/馬路/打水/打冰…，非「浴廁」、非 PM/晚）→ `0600-0620`
- 晚上打掃（浴廁、或 period 是 PM/晚）→ `2100-2120`
- 打飯（打飯班作業，約 1.5 小時）：早 `0600-0730`、午 `1100-1230`、晚 `1700-1830`

`dutyEffSpan(d)`＝這項勤務「實際佔用」的時段，優先序：**使用者填的範圍 > 固定勤務預設 > 只有點約30分 > 無**。使用者自己填了範圍就一定用他的，不會被預設蓋掉。這些預設只影響**時間軸顯示與 `tlFreeAt` 佔用判斷**，完全沒有寫進 `schedTime`、也沒有動 `defaultTimeFor/autoTagTimes/fixMealTimes`（那塊是 v4 打飯 bug 的敏感區，別碰）。

> ⚠️ 使用者一開始要求「只有點→往下虛到收假、沒填→整天虛」。實作後發現會整條蓋掉別人、超亂，改成上表。若想找回「整天虛條」版本，`tlVis` 邏輯還在（空→`{0,1440,solid:false}`、點→`{s,1440,solid:false}`），但不建議。

---

## 三、自動補休（站哨／午打推導出的補休，這次最大的邏輯）

**規則**（`impliedRestsFrom(duties, md)`）：
- **午打**（`dutyIsNoonMeal(d)`：打飯 group 且 period=NOON 或 label 含「午」）排到的人 → 補休 `1230-1430`（可調，見下）。
- **夜哨**（該日 00:00–06:00 起的班，`parseInt(code.slice(0,2))<6`）站到的人 → 補休 `0550-0740`。
- **午哨**（12:00–14:00 起的班）站到的人 → 補休 `1400-1600`。

**合併規則**：一個來源（一個午打勤務、或一班哨）＝**一筆**，`people:[pid,...]`，不是每人一條——一個午打排兩人，時間軸只會有一格「補休（午打） 甲 乙」，不會疊兩格。`impliedRestsExpanded(duties,md)` 把它展開成每人一筆，給 `plan.rests`／`autoAssign` 這種要逐人處理的地方用。

**可調時間**：預設值可以被覆寫——午打存在 `duty.restRange`、站哨存在 `shift.restRange`（跟著 boards／guard 資料一起同步，不是另開欄位）。時間軸上點補休方塊（`tl-restedit` → `tlrest` sheet）就能改，「回預設」清掉 override。

**這個補休會出現在四個地方**（這是這次「同步」最重要的一塊，串起來了）：
1. **排班時間軸**：畫成方塊（見第四節顏色/順序），標「自動」，可點調時間。
2. **`tlFreeAt`**（誰有空）：補休時段算佔用，同時段別的勤務會擋住這個人。
3. **今日出勤／今日排休卡片**（`availCard`）：每人 chip 會多一個「補休HH:MM-HH:MM**自**」標籤（帶「自」＝自動推導、不是手動排的），跟手動排休並排顯示。
4. **行程頁**（`planForBoard` → `plan.rests`）：A/B/C 三個檢視都看得到，不再只有排班時間軸看得到。
5. **自動分配**（`autoAssign`）：`implBlk(pid,d)` 會擋掉——午打/夜哨/午哨排到的人，他補休那段不會被自動分配排進別的勤務。

**手動排休（`absence`）現在也能在時間軸點開調時間**：`tlBoardData` 把手動排休 block 標上 `src:{t:"absence",pid,range}`，點開走一樣的 `tlrest` sheet，存檔用 `setAbsRange(pid,md,oldRange,newRange)` **直接回寫 `state.absence`**（不是另存一份），所以改完**今日排休卡片會立刻反映**；「刪掉這筆」用 `delAbsRange`。自動補休跟手動排休因此用同一個 sheet、同一種操作方式，只是存檔位置不同（`restRange` 覆寫 vs. `absence` 本體）。

⚠️ 自動補休是**推導值，不寫進 `state.absence`**——這是刻意的（見 v5 六之二設計筆記），意思是它不佔用 v4 資料安全那套逐日合併／墓碑機制的欄位，純粹是畫面層 + `tlFreeAt`/`autoAssign` 的即時計算。清空/刪除某天、雲端合併，都不會動到「自動補休」這個概念，因為它不是儲存下來的東西，是每次 render 現算的。

---

## 四、時間軸排版規則

**重疊分欄**（`tlLanes`）：依 `tlPri(bk)` 排序後貪婪塞欄——**站哨(0) < 補休(1) < 分菜(2) < 打飯(3) < 公差/大公差/小公差(4) < 打掃(5)**，數字小的排左邊。**沒有重疊的方塊一定進最左的空欄**（`tlLanes` 比對的是整欄所有已放區間，不是只比對「最後一段的結束」——早期版本有這個 bug，已修）。超過 6 欄才會橫向捲動（`wide=lc>6`），≤6 欄一律用百分比欄寬全部塞進畫面，不會把勤務推到看不見。

**同時段的打掃收合成一格**（`tlClusterBlocks`/`tlClusterMembers`/`tlClusterInner`，sheet type `tlcluster`）：早上打掃全部固定 `0600-0620`，好幾項擠同 20 分鐘會分很多欄很亂，所以把 `group==="打掃"` 且 `dutyEffSpan` 相同 `[s,e]`、數量 ≥2 的收合成一格「早上打掃 ×N／晚上打掃 ×N」（`s<720`＝早上）。點開跳清單、每項再點進去才是原本的 `tlblock` 編輯面板。只有 1 項的時段不收合。

**方塊內容**（兩行，`word-break:break-all` 換行不截斷，取代舊版的單行 ellipsis 截字）：
- 上行：標題 —— 一般勤務是名稱；補休是「補休（午打）」/「補休（夜哨）」/「補休（午哨）」；站哨固定顯示「站哨」；打掃收合是「早上打掃／晚上打掃」。
- 下行：是誰（人名縮寫，或「共 X/Y 人」）。
- 右上角小標：`×N`（收合格數量）／`哨`／`臨`（臨時新增）／`自動✎`或`排休✎`（補休，✎ 提示可點調時間）／`N/M`（人數進度）。

**時間軸最小軸距**（`tlAxis` 的 `MIN`）＝46px，早期是 30px 太窄放不下兩行字，已拉高。

---

## 五、各檢視同步（這是「同一份資料、四種看法」的體現）

- **排班清單 ⇄ 排班時間軸**：都是操作同一份 `state.duties`，`tlBlockInner` 重用清單頁的 `count-*/toggle-keepall/del-duty/set-time/pick-*/dtime` handler（`currentDuty()` 對 `picker`／`tlblock` 兩種 sheet 都解析），沒有兩份邏輯。
- **行程頁臨時新增 ⇄ 排班頁**：`extraCard(curDate())` 現在也掛在排班頁（清單＋時間軸都有），行程頁加的臨時勤務／行程，排班頁看得到、能編輯；有填時間的臨時項也會畫進排班時間軸（`kind:"extra"`，點開走 `dayevt-edit`，跟行程頁是同一個編輯面板）。
- **排班時間軸新增的勤務 ⇄ 行程／統計**：勤務本來就經 `planForBoard()`/`eventsFromDuties()` 進行程頁，`commit()` 進統計，這條路徑本來就有、時間軸沒有另開一條。
- **今日出勤／排休 ⇄ 時間軸 ⇄ 站哨補休**：都讀寫同一個 `state.absence`（見第三節「手動排休可在時間軸調時間」），自動補休則是四處都從 `impliedRestsFrom`/`impliedRestsExpanded` 現算，沒有第二份資料源。

---

## 六、新增/改動的函式清單

**共用 helper（都在 `dayGroupColor` 下方那一整塊）：**
- `TL_DAYEND`、`tlHM(min)`。
- `occSpan(rangeStr)` / `tlVis(rangeStr)` / `dutyDefaultRange(d)` / `dutyEffSpan(d)`（見第二節）。
- `tlAxis(anchors, nowMin)`：壓縮空時段的時間軸，`MIN=46`。回傳 `{y(min)→px, H, B, lo, hi}`，無資料回 `null`。
- `tlPri(bk)` / `tlLanes(blocks)`：重疊分欄＋左右順序（見第四節）。
- `dutyIsNoonMeal(d)` / `dutyRestRange(d)` / `impliedRestsFrom(duties,md)` / `impliedRests(md)`（＝`impliedRestsFrom(state.duties,md)`）/ `impliedRestsExpanded(duties,md)`：自動補休（見第三節）。
- `tlFreeAt(s,e,md,exclId)`：某時段誰有空。優先序：整天不在 → 手動補休/不在 → 自動補休（`impliedRests`）→ 站哨 → 其他已排勤務（`dutyEffSpan` 判重疊）。`exclId`＝排這項時排除自己。
- `tlRestSrc(t,id)`：`t==="duty"`→`dutyById`、`t==="guard"`→`guardShiftById`。
- `setAbsRange(pid,md,oldRange,newRange)` / `delAbsRange(pid,md,range)`：手動排休回寫。

**排班頁時間軸：**
- `tlBoardData()`：組出 `{md,solids,untimed,anchors,rests,outs}`。`solids` 含 `kind` 為 `duty`/`guard`/`rest`/`extra`/（渲染時再收合成）`cluster` 五種。
- `tlBoardToggle()` / `boardTimeline()`：子檢視切換／主 render。
- `tlClusterBlocks(solids)` / `tlClusterMembers(s,e)` / `tlClusterInner()`：打掃收合。
- `tlBlockInner(d)`：勤務編輯面板（sheet `tlblock`），含固定勤務的「留白＝用預設」提示、午打的「自動補休」banner、每人「已排 · 補休 …」標註。
- `tlFreeInner()`：站哨/日常時段的唯讀「誰有空」（sheet `tlfree`）。
- `tlRestInner()`：補休調時間面板（sheet `tlrest`），自動補休存 `restRange`、手動排休存回 `absence`，都在同一個 UI。

**行程頁：**
- `modeC(plan)`：八人時段表。

**接線改動**：`state` 新增 `boardView/tlFree/tlCluster/tlRest`；`currentDuty()` 對 `tlblock` 也解析；`sheetInner()` 加 `tlblock/tlfree/tlcluster/tlrest`；`render()` 排班分支接 `tlBoardToggle()+extraCard()`；`dayPage()` toggle 多 C；`handle()` 加一整組 `tl-*`／`dayevt-*` 動作；`onInput()` 加 `tl-name`/`tl-rest-range`；`VIEW_OK`／`boardMode==="view"` 擋單都同步更新；`closeSheet()` 關 `tlblock` 面板時 `persist()`；`autoAssign()` 加 `implBlk()` 擋自動補休時段；`planForBoard()` 併入 `impliedRestsExpanded`；`availCard()` 併入自動補休 chip；檔尾 60 秒 `setInterval` 排班時間軸看今天也重畫。

---

## 七、測試（node harness）

`/tmp/tl_test.js`（**82 項**）＋ `/tmp/smoke.js`（8 頁 render＋4 種 sheet 不炸）。要重跑：把 harness 照 v4 第九節方式 stub（`localStorage/document(FakeEl)/window/navigator/location/setInterval…`、拿掉 `"use strict"`、`new Function(src+";return {...}")` 取內部函式）。**唯讀測記得 `store["duty-edit-ok"]="1"` 或直接 `state.readOnly=false`**，否則 `tlBlockInner` 不會給編輯控制項。

驗過的重點（除 v5 handover 列過的基礎項目外，這次特別驗證）：
- 固定勤務預設時段三種（早/晚打掃、打飯早午晚）、`dutyEffSpan` 優先序。
- 自動補休三種來源（午打/夜哨/午哨）合併成一筆、`people[]` 正確、`tlFreeAt` 擋人、可調時間（`restRange` override 生效與清除）。
- `autoAssign` 尊重自動補休（午打的人不會被排進撞到補休時段的勤務）。
- `planForBoard` 的 `plan.rests` 含自動補休。
- `tlPri`/`tlLanes`：重疊排序正確、**沒重疊的方塊都靠最左欄**（含「同一欄要比對整欄所有區間」的迴歸測試）。
- 打掃收合：≥2 項才收合、清單抓得到成員、`tlClusterInner` 正確列出。
- 手動排休：`tlBoardData` 標出 `absence` src、`setAbsRange`/`delAbsRange` round-trip。
- `availCard` 顯示自動補休 chip（帶「自」字樣）。
- 另用 Playwright（Chromium）實際截圖看版面，每輪修改都有截圖驗證（分欄、顏色、兩行文字、收合、補休可點）。

---

## 八、已知未做 / 待議（接手可挑，取代 v5 已過時的清單）

1. **點時間、非固定勤務→約 30 分**只是預設佔用，可能低估真實時長。要更準就讓使用者填範圍。
2. **`tlFreeAt` 不檢查「這項自己還沒排滿」**——同一項勤務內部不算卡到，只看跨勤務/站哨/補休重疊。
3. 時間軸的「新增勤務」重用 `addDutyBlock()`；沒有「在時間軸上拖曳畫出時段」（手機拖曳成本高，暫不做）。
4. `modeC`（行程頁八人時段表）不列「未標時間」的項目；要看未標時間的，行程頁 B（八人分工）有列。
5. **清單頁粗時段判卡到沒有升級成 range 版**（`occupiesFor`/`computeConflicts`/`restBlock` 還是舊邏輯）。若要統一，會動到清單頁既有行為，要一起重測，目前刻意不做。
6. **站哨方塊在時間軸是唯讀**（點了看誰有空或調補休時間），不能在時間軸裡改站哨的人／時段 → 站哨還是去站哨頁排。
7. 整天不在的人只在時間軸上方摘要一行，沒有畫成貫穿全天的方塊（避免洗版）。
8. 時間軸重疊超過 6 欄仍會橫向捲動；打掃已收合，但如果同時段還有很多「非打掃」的勤務重疊（例如好幾個公差都同時段），還是會分欄橫捲，這是刻意的（重疊本來就該並排）。
9. 自動補休目前只有三種來源（午打／夜哨／午哨）；如果之後有其他「站到某時段就補休」的規則，加在 `impliedRestsFrom` 裡即可，架構已經支援多來源合併。

---

## 九、注意事項

- 一律先讀 v4＋本檔＋現有 `index.html` 再動；改完先 `node --check` 再功能測。
- **動同步／資料安全 → 回 v4 第七節**，v5/v6 沒碰那塊。
- 回應提醒：上傳覆蓋 GitHub、`?v=N` 避快取；雲端／複製部署後 https 測。`.gs` 這幾版沒改。
- 目前 **index.html ≈ v35、Apps Script v3（分片）**。
