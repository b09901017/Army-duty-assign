# 261 排勤務板 — 交接說明 v7（對應 index.html ≈ v36 · Apps Script v3）

給下一個 AI：**先讀 v4（資料模型／同步／資料安全的權威版本）與 v6（視覺化時間軸／八人時段表）再讀本檔。** v7 做的是「7 點排版/功能優化」，其中 6 點純畫面（動不到同步安全），只有第一點「站哨多週」動了同步層——**而且是照 v4 第七節那套「逐日合併＋ts」機制擴充的，沒有退回保護**。

全程繁體中文＋台灣軍中用語，先做再解釋。改完先 `node --check` 再功能測（見第九節、v4 第九節）。回應提醒：上傳覆蓋 GitHub、網址加 `?v=N` 避快取；雲端／複製部署後 https 測。**`.gs` 這版沒改，不用重新部署。**

> **v6→v7 這次改的 7 點（使用者要的排版優化）**
> 1. 行程頁「八人時段表」(`modeC`) 加**日常事件背景帶**（用餐/午休/集合/點名/起床/操課/燈火…），全班共用、畫在最底層；各自勤務彩塊蓋在上面（以勤務為主）。
> 2. 排班頁日期小丸只留**今天／明天**在最前面，其餘日期收合成「其他 N ▸」（展開仍依週一分週）。
> 3. 排班頁**解析後**由上到下重排：小丸列 → 閱讀 banner → 解析排班公版 → 解析行動準則 →（出勤/時間軸…照舊）。解析前維持不變（貼公版在上、下面小丸）。
> 4. 統計頁「各天紀錄」**收合**（預設收起，點展開）。
> 5. 站哨頁「累積次數」**收合**（預設收起）。
> 6. **站哨多週**：每貼一週就存檔，站哨頁上方出現各週小丸可切換；比照 `boards` 逐週 `ts` 合併同步，全隊各手機都看得到歷史週。
> 7. 時間軸勤務方塊面板底部加「**完成**」按鈕（編輯時＝刪掉＋完成一排），保留「關掉就儲存」不變。

---

## 一、站哨多週（唯一動到同步層的一項，最重要）

### 設計：比照 boards 的「active＋歷史存檔」雙層
- **active 週**仍在 `state.guard`（單週物件，所有既有程式 `guardPage/guardStats/guardAuto/guardCommit/guardEventsFor/impliedRestsFrom/livePlan…` 照舊讀它，沒改讀法）。
- **歷史所有週**存 `state.guardWeeks`（key＝該週週一的 `M/D` label，值＝`{raw,meta,days,committed,ts}`），`state.activeGuardWeek`＝目前 active 週的 key（**device-local，不同步**）。
- 這跟 boards 的關係一模一樣：`state.guard`↔`state.duties/gongban`（工作中那份）、`state.guardWeeks`↔`state.boards`（每份存檔）。

### 關鍵函式（都在 `boardDates()` 下方那一區）
- `guardWeekKey(g)`：取該週第一天的**週一** `M/D`（`mondayOf`）當 key；抓不到就退回第一天日期。同一週不同天會得到同一個 key（所以重貼同一週＝覆蓋那格）。
- `saveGuardWeek()`：把目前 `state.guard` 存進 `guardWeeks[activeGuardWeek]`（蓋 `ts=Date.now()`）。`persistLocal()` 開頭會呼叫（跟 `saveBoard()` 並列），所以 active 週隨時和 `guardWeeks` 同步。
- `loadGuardWeek(key)`：先 `saveGuardWeek()`（保住現在這週），再把 `guardWeeks[key]` 灌回 `state.guard`、設 `activeGuardWeek=key`。
- `guardWeekList()`：週 key 由新到舊。`guardWeekLabel(w)`：`第一天–最後一天`。
- `mergeGuardWeeks(remWeeks,remGuard)`：**逐週取 `ts` 較新者**；並把對方的**單週 `guard`**（舊版 index.html 沒有 `guardWeeks`）用 `guardWeekKey` 折進來，避免舊版把歷史吃掉。**無墓碑**（見第八節「未做」）。

### 接線
- `payload()` 加 `guardWeeks`（active 的 `guard` 仍照送，給還沒更新的舊版讀 active 週）。**`activeGuardWeek` 不同步**（各手機自己看哪一週）。
- `persistLocal()`：`saveGuardWeek()` + 存 `guardWeeks/activeGuardWeek`。
- `applyRemote()`：
  - 新增 `ngw=mergeGuardWeeks(o.guardWeeks,o.guard)` → `state.guardWeeks=ngw`。
  - **拿掉了舊的整份 `state.guard=o.guard`**（原本在 `remoteNewer&&!dirty` 那塊）；改成從 `ngw[activeGuardWeek]` 回填 active 週（`!dirty` 時才回填）。新裝置沒 active 又沒排過 → 自動載入最新一週。
  - `cur`/`now` 變更偵測字串都加了 `gw:state.guardWeeks`，所以站哨週有變也會觸發 render。
  - `guardTally` 仍是整份同步（沒動），跨週累積照舊。
- `gparse`（貼站哨）：先 `saveGuardWeek()`（保住舊 active），建新 `state.guard`，`activeGuardWeek=guardWeekKey(...)`。重貼同一週＝覆蓋那格、重貼別週＝新增一格並切過去。
- 啟動遷移 IIFE：把舊的單週 `state.guard` 折進 `guardWeeks` 並補 `activeGuardWeek`（升級無痛）。
- UI：`guardWeekTabs()`（週小丸列＋「新一週」虛線鈕）掛在 `guardPage` 三個分支（唯讀、貼上框、內容）最上方。動作 `guard-week`（切週，`VIEW_OK` 白名單已加）、`gnewpaste`（貼新一週＝空白貼上框）。

### ⚠️ 刻意保留的限制（別誤以為是 bug）
- `guardEventsFor / impliedRestsFrom / livePlan` **仍只讀 active 週**（`state.guard`）。意思：行程頁的站哨事件／夜哨午哨自動補休，反映的是**你目前切到的那一週**。切到舊週，行程頁的「站哨」就跟著變舊週。這是刻意的（跨週合併 shift id 會撞，`g0/g1…` 每次 parse 從 0 起），避免 id 碰撞 bug。通常 active＝本週，看行程不受影響。
- 切週（`guard-week`）純換檢視，但 `loadGuardWeek→saveGuardWeek` 會把離開的那週 `ts` 重蓋一次（內容沒變、只是 ts 變新）。無害，只是下次 push 會多送一次。

---

## 二、八人時段表加日常事件（`modeC`）

- 新增模組級 `DAILY_RE`（起床/晨操/升旗/集合/用餐/午休/操課/點名/燈火/勤前/盥洗/莒光/生命教育/座談…）與 `dailyShort(t)`（取第一段、≤5 字）。
- `modeC` 從 `plan.schedule`（行動準則，沒貼就是 `DEFAULT_SCHED`）挑出 `DAILY_RE` 命中的**有時間**項，畫成**整排背景**：時間段→淺古銅底帶＋小標；時間點→虛線＋小標。這些也丟進 `anchors`，時間軸才會有那些列。
- **z-index 分層**：日常帶 `z1`／小標 `z2`／格線與「整天不在」灰欄 `z3`／各人勤務彩塊 `z4`／現在線 `z5`。所以**勤務一定蓋在日常事件上**（使用者要的「以勤務公差為主」）。
- 用 `DAILY_RE` 過濾＝**避免和各人的打飯/打掃/公差彩塊重複**（那些不在 `DAILY_RE` 裡，本來就有各自彩塊）。
- `DEFAULT_SCHED` 補了一筆 `1230-1350 午休`（原本只有 1350 起床，午休沒被畫出來）。
- 「現在」那行多一段「全體 X」（現在落在某日常時段時顯示）。底部多一行圖例說明。

---

## 三、排班頁小丸（`boardTabs`）與解析後重排（`render`）

- `boardTabs()`：top row＝鉛筆(編輯/閱讀) + `今天`/`明天` 小丸(有 board 才顯示、帶「今天/明天」小字前綴) + 「其他 N ▸」toggle（`state.boardOthersOpen`，動作 `board-others`）。展開才印「其餘日期」——沿用原本的**依週一分週**那段（本週/上週/上上週…）。
- `render()` 排班分支拆成兩路：
  - **已開啟（`gongban.loaded && boardOpen`）**：`boardTabs()+rescueBar()` → 閱讀 banner → `pasteCard()`(這時回傳「已解析 N 項」收合條＝解析排班公版) → `schedCard()`(解析行動準則) → `availCard()+tlBoardToggle()` → 清單/時間軸 → `extraCard` → 動作區。
  - **未開啟**：維持原樣 `pasteCard()+boardTabs()+rescueBar()`（貼公版框在上、小丸在下）。

---

## 四、縮合（統計各天紀錄、站哨累積次數）

- `daysBlock()`：header 變成 `toggle-days` 按鈕（`state.daysOpen`，預設收起），標題帶天數 `各天紀錄（N）`，展開才印各天列。
- `guardStats()`：header 變成 `toggle-gtally` 按鈕（`state.guardTallyOpen`，預設收起），展開才印每人列＋清空鈕。
- 兩個 toggle flag 都在 `state`（`daysOpen/guardTallyOpen/boardOthersOpen`），純畫面、不進儲存/同步。

---

## 五、時間軸方塊「完成」鈕（`tlBlockInner`）

- 面板底部由「單一刪掉鈕」改成 `footer`：編輯時＝`刪掉`(紅框, `del-duty`)＋`完成`(綠, `close-sheet`) 一排；唯讀/閱讀時＝單一`關閉`(`close-sheet`)。
- `完成`/`關閉` 走 `close-sheet`，而 `closeSheet()` 對 `tlblock` 本來就會 `persist()`（`wasTl` 判斷），所以**「關掉就儲存」原封不動**，只是多一顆直覺的按鈕。

---

## 六、新增/改動清單（速查）

- **state 新增**：`guardWeeks`、`activeGuardWeek`、`boardOthersOpen`、`daysOpen`、`guardTallyOpen`。
- **新函式**：`guardWeekKey / saveGuardWeek / loadGuardWeek / guardWeekList / guardWeekLabel / mergeGuardWeeks / guardWeekTabs / dailyShort`、模組級 `DAILY_RE`。
- **改函式**：`persistLocal / payload / applyRemote`（站哨多週）、`boardTabs`（今天明天+收合）、`render`(排班重排)、`daysBlock / guardStats`(收合)、`guardPage`(掛週小丸)、`modeC`(日常背景)、`tlBlockInner`(完成鈕)、`DEFAULT_SCHED`(+午休)、`gparse`(存週)。
- **新動作**：`guard-week / gnewpaste / toggle-days / toggle-gtally / board-others`；`VIEW_OK` 加 `board-others / guard-week / toggle-gtally`。
- 移除了 `applyRemote` 裡一個從沒被用到的 `sig` 死函式。

---

## 七、資料安全複查（動同步前必看，這次沒退回任何保護）

- 逐日/逐週合併＋墓碑、`pulledOk` 沒 pull 過不准 push、`remoteNewer && !dirty` 才套整份欄位、`fixMealTimes()` 不主動 push —— **全部原封不動**（見 v4 第七節）。
- 站哨多週是**新增**一條和 boards 同構的逐週 `ts` 合併線，`dirty` 時不覆蓋 active 週（測過，見第九節）。`guardWeeks` 沒有逐週墓碑（刪某週不會傳播），但目前 UI 也沒有「刪某週」功能，不衝突。

---

## 八、已知未做／待議（接手可挑）

1. **`guardWeeks` 沒有墓碑**：目前不能刪某一週（也沒 UI）。若要加「刪這週」，得比照 `tomb` 做逐週墓碑，否則刪了會被別台 pull 回來。
2. 行程頁站哨事件／自動補休**只反映 active 週**（見一之⚠️）。若要「看哪天就抓哪天所屬週的站哨」，得讓 `guardEventsFor/impliedRestsFrom` 掃 `guardWeeks` 全部週，並先解決 shift id 跨週撞號（parse 時把 id 綁週）。
3. 切週會多蓋一次 `ts`（純檢視也算「動過」）。要更省可讓 `saveGuardWeek` 比對內容沒變就不 bump ts。
4. 八人時段表的日常事件標籤在很窄的手機上可能被勤務彩塊蓋住一部分（標籤 z 比彩塊低，刻意的——勤務優先）。時間軸左側 gutter 只有 34px 放不下長標籤，所以標籤浮在帶子左上、超出截斷。
5. `DAILY_RE` 是白名單式；準則裡若出現沒列進去的日常詞（例某些連隊自訂用語）就不會畫成背景帶，往 `DAILY_RE` 加即可。
6. v6 那些「未做」大多仍在（清單頁粗時段沒升級 range、站哨方塊在時間軸唯讀…）。

---

## 九、測試（node harness，共 53 項全過）

- `/tmp/h.js`（**23 項**）：站哨多週同步核心——`guardWeekKey` 同週一致、`saveGuardWeek/loadGuardWeek` round-trip、`mergeGuardWeeks`（兩台不同週 union、同週新 ts 勝、舊 remote 不蓋新 local、折舊版單週 guard）、`applyRemote`（併入新週＋回填 active、**`dirty` 時不覆蓋 active 週**）、`payload/persistLocal` 含 `guardWeeks`。
- `/tmp/h2.js`（**30 項**）：`boardTabs`（今天/明天/其他收合展開）、`daysBlock`/`guardStats` 收合、`guardWeekTabs`（多週＋新一週）、`tlBlockInner`(完成鈕)、`modeC`(用餐/午休背景＋勤務彩塊＋圖例)、四頁 `render` 不炸。
- 另用 Chromium(playwright-core headless_shell) 實際載入、塞一份 state 截了四張圖（排班重排、站哨週小丸、八人時段表日常帶、統計各天收合）人工看過版面 OK。
- Harness 照 v4 第九節：抽 `<script>`、拿掉 `"use strict"`、`new Function(src+";return{...}")` 取內部函式，stub `localStorage/document(FakeEl)/window/navigator/location/setInterval/fetch`。**唯讀測記得 `store["duty-edit-ok"]="1"` 或 `state.readOnly=false`**。要驗 `dirty` 保護，harness 多 export 了 `_setDirty/_setPulled`。

---

## 十、注意事項

- 一律先讀 v4＋v6＋本檔＋現有 `index.html` 再動；改完先 `node --check` 再功能測。
- 動同步／資料安全 → v4 第七節＋本檔第一、七節。
- 回應提醒：上傳覆蓋 GitHub、`?v=N` 避快取；雲端／複製部署後 https 測。**`.gs` 這版沒改，不用重新部署。**
- 目前 **index.html ≈ v37、Apps Script v3（分片，未動）**。

---

## 十一、站哨跨夜時間解析修復（v7 之後追加，這批很重要）

站哨 `code` 是 4 碼「起訖時」字串。**24 進位**：`2402` = 該日隔天 `00:00–02:00`（不是 24:02），`2224` = `22:00–24:00`。站哨頁本來就對（`shiftHM` 有把 24→00），但**行程／分工／補休**過去會錯，這批修好了：

### 核心觀念
- **一律用 `shiftStartHH(code)`（起始時，24→0）判斷**，不要再直接 `parseInt(code.slice(0,2))`。
- `guardRange(code)`：起始 `24`→`00`（`2402→0000-0200`、`2224→2200-2400`），是「同一天內的分鐘範圍」。之前沒轉 24→00，害 `2402` 變成 `2400-0200`（min=1440）被排到**最下面**——這就是使用者看到「2402 跑到底部、被當成 7/21 的 24:02」的根因。
- 所有 `min:toMin(sh.code.slice(0,2)+"00")` 改成 `min:shiftStartMin(sh.code)`（`2402→0`，排最上）。三處：`livePlan / planFromImport / guardEventsFor`。

### 夜哨補休（第二個 bug）
- 夜哨 = 起始時 22/00/02/04（`2224 / 2402 / 0204 / 0406` 四班），補休都在**早上那天** `0550-0740`：
  - `2224`（起 22，屬 day1）→ 補休掛**隔天**（day1+1）。
  - `2402 / 0204 / 0406`（屬 day2）→ 補休掛**當天**（day2）。
- 一律走新 helper **`guardRestInfo(sh)`** →`{kind,date,def}`。`impliedRestsFrom` 的站哨迴圈改用它（不再 `sh0<6` 那種會漏掉 22/24 的寫法），`tl-restedit`（時間軸點補休調時間）也改用它判 kind/def。
- 效果：`7/20-7/21` 的四班夜哨，補休全部正確落在 **7/21 0550-0740**；`impliedRestsFrom(_,7/20)` 不再產生夜哨補休。

### 跨夜哨兩天都寫（第三點需求）
- 新 helper **`guardCarryEvents(md)`**：`22xx`（前晚，屬 day1）→ 補畫到**隔天最上面**（`pin:"top"`, `min:-1`）；`24xx/00xx`（凌晨，屬 day2）→ 補畫到**前一天最下面**（`pin:"bottom"`, `min:1441`）。label 帶「（跨夜）」。
- 掛進三個地方（display-only，**不進 `tlFreeAt`/`autoAssign` 的卡到判斷**，所以排人衝突邏輯不受影響）：
  1. `livePlan`（給大家的分工 copy）＋ `planForBoard` 主分支 → `plan.events` 多 carry 事件。
  2. 行程 A/B（列表）＋ 分工：靠 `min`(-1/1441) 自然排到頂/底。
  3. 行程 C `modeC`（時段表）：carry 事件**不進 anchors**，畫時依 `pin` 釘在 `ax.lo`/`ax.hi`（虛線、標「跨哨」）。
  4. 排班時間軸 `boardTimeline`：carry 不畫進格子，改成卡片外一條「跨夜哨 ↑前晚／↓明晨」pill 標示列（`tlBoardData` 回傳 `carry`）。
- `personDayItems` 多帶 `carry/pin` 旗標給 `modeC` 用。

### ⚠️ 沿用的限制
- carry / 夜哨補休都只看 **active 站哨週**（`state.guard`）。行程看某天時，若那天的站哨在非 active 週，不會帶出（同 v7 第一節的已知限制）。
- `guardShiftById`（`tl-restedit` 調 guard 補休用）只找 active 週；carry 是別週來的話點不進去（carry 目前也沒做成可點）。

### 測試
- `/tmp/h3.js`（**35 項**）：日期歸屬（2224→7/20、2402/0204/0406→7/21）、`guardRange/shiftStartMin/shiftHM`、`guardEventsFor(7/21)` 的 2402 min=0、`impliedRestsFrom` 四班夜哨→7/21 0550-0740 且 7/20 無、`guardCarryEvents` 兩天 pin top/bottom、`planForBoard` 含 carry、`buildPersonList` 不含 2400/24:00。
- 連同 v7 的 h.js(23)+h2.js(30) 共 **88 項全過**；另用 Chromium 截 4 圖（7/21 當天流程／八人時段表、7/20 當天流程、7/21 排班時間軸）人工確認 2402 在頂、四班補休在 7/21、跨夜兩天都有。
