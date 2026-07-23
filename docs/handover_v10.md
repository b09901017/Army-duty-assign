# 261 排勤務板 — 交接說明 v10（自動排班 9 項優化 ＋ LINE bot 優化）

> 給下一個接手的 AI：這一版**沒動結構**（core.js/index.html/liff.html 的分工、同步安全機制都照 v9/v4），只做兩塊「邏輯優化」：
> 1. **自動排班**（`core.js` 的 `autoAssign` / `guardAuto` / `commit`）改得更聰明、更一致。
> 2. **LINE bot**（`line_webhook.gs`）補了幾個會「靜默出包」的洞。
>
> 動 core.js 前一樣先讀 **v4 第七節（資料安全）**、**v9（結構＋共用機制）**。改完先 `node --check` 再跑等價性＋行為測試。全程繁中＋台灣軍中用語。

---

## 零、一句話總結

- **自動分配**以前用「上午/中午/晚間」粗區塊判衝突，跟時間軸（真實分鐘）不一致，還漏看站哨/補休、大小公差沒平衡、順序照公版貪婪填、`分菜*2：`標題行會被塞幽靈人。→ 全部改用既有的 **`tlFreeAt`（真實分鐘重疊）** 當「誰有空」的唯一真相，並補上群組公平度、最受限先排、分菜標題排除。
- **LINE bot**長文字沒截斷會被 LINE 打回變「沒反應」、@提及會蓋掉指令、每次查詢重讀整表、錯誤全靜默。→ 加截斷、剝 @、`syncData_` 記憶、`_log` 分頁、分頁上限。

**版號：`core.js?v=46 → v47`**（index.html／liff.html 都要跟著改，避快取）。

---

## 一、自動排班 9 項優化（core.js）

### 核心手法：統一用 `tlFreeAt` 當「誰有空」
`autoAssign` 原本自己維護 `pset`（AM/NOON/PM 粗區塊互斥）＋ `restBlock` ＋ `implBlk` 判衝突。**全部拿掉**，改成呼叫既有的 `tlFreeAt(s,e,md,exclId)`（core.js 時間軸那套）。它一次涵蓋：整天不在、手動排休時段、**自動補休（午打/夜哨/午哨）**、**站哨當班**、其他已排勤務、**全班261佔全員**。它讀 live `state.duties`，所以邊排邊算、後面的勤務看得到前面剛排的人。→ 自動分配與時間軸「誰有空」從此完全一致。

```
function freeSet(span,exclId){ var m={}; tlFreeAt(...).forEach(x=>m[x.pid]=x.free); return m; }
```

### 九項對應
1. **真實分鐘取代粗區塊**：同一個上午但時間不撞的兩件勤務，同一人可排；不再因「同屬上午」被誤鎖。
2. **打飯看站哨/補休**：打飯改用 `freeSet(dutyEffSpan(m),m.id)` 挑人（夜哨補休 0550-0740 壓到早打、站哨/排休都會擋）。
3. **非打飯排除站哨當班時段**：`tlFreeAt` 內含 `guardEventsFor`，午哨 1200-1400 的人不會被排到 1300 的公差。
4. **最受限先排（MCV 啟發式）**：填人前算每個勤務的 slack＝初始有空人數−還要排的人數，slack 小/缺人多的先排。**只做一次靜態排序、無回溯**（對 8 人夠用），明顯減少「其實有解卻誤報人手不足」。
5. **大/小公差各自當群組平衡**：新增 `grpWork[grp][pid]`（初值 `groupTotal(pid,grp)`、本次即時累加，`grp=dutyGroup(d)`）。候選排序＝`grpWork[grp]` → `catWork[label]` → `work`(非打飯總數) → id。兩件不同名的大公差會分給不同人。
6. **keepAll 佔全員**：`tlFreeAt` 把全班261勤務視為佔用全員，重疊它的勤務排不到人（正確：那時段大家都在忙）。
7. **`guardAuto` 排除當天不在的人**：每班取 `sdate=sh.date||day.date`，排除 `fullDayOut(pid,sdate)` 與「排休時段和該班重疊」者；全被排除才退回不看（至少排得出來）。**依需求不做**跟排班勤務的交叉比對。
8. **缺人有提示**：打飯 `mealShort`、非打飯 `short`，最後 `flash` 合併提示。
9. **分菜標題幽靈人**：`(3）分菜*2：` 會解析出一個 `fenca:"head"` 的隱藏勤務（count:1）。以前 autoAssign 會塞它一個人、`commit` 記成「公差」、`buildFilled` 還會把名字附到標題行。→ `autoAssign` 待排清單與 `commit` 都排除 `d.fenca==="head"`（分菜早/中/晚 `fenca:"AM/NOON/PM"` 照常可排、不受影響）。

### 使用者拍板的兩個行為決策
- **自動分配一律「保留已排（含手動調的、公版已填的），只補空缺」**：打飯移除了原本的 `m.assigned=[]` 清空，改成 `need=(count)-assigned.length`，跟非打飯一致。重跑不會動你調好的。
- **`guardAuto` 只排除當天整天不在／排休重疊的人**，不比對當天排班勤務。

### ⚠️ 一個刻意的行為改變（記著）
**未定時段**的勤務（`dutyEffSpan` 回 null，例如手動新增沒填時間、公版沒時間又無固定預設）在自動分配時**不再互相區塊排除**，只受「整天不在＋公平度」約束。因為沒有時間就無從判斷分鐘重疊。這是 issue 1 的自然結果，通常更合理（不會因「都算上午」硬把人攤開）。

### 沒動的
`parseGongban`、render、面板、同步層完全沒動。**等價性測試（13 份公版 `parseGongban` ＋ 排班/行程/統計 render/nav 逐字元）全部 IDENTICAL**——主 App 行為零變化。

---

## 二、LINE bot 優化（line_webhook.gs）

1. **長文字截斷（`clip_`）**：新增 `clip_(s,max,note)`。
   - 行程 carousel 的①完整勤務/②行動準據/③個人分工 body 各 `clip_(…,1000,'（太長，點下面「視覺化呈現」看完整）')`——避免超過 Flex text 上限/整則 50KB 被 LINE **靜默打回**（handover v9 §10(7) 踩過同類坑）。
   - 「公版/分工」查詢回覆 `clip_(out,4500,'…完整請開 app')`——純文字訊息上限 ~5000。
2. **@提及不再蓋掉指令**：新增 `stripSelfMention_(msg)`（用 `mentionees[].isSelf` 的 index/length 由後往前剝掉 @bot 那段）。`handleEvent_` 改成：剝完**還有內容 → 照常跑指令/查詢**（`@bot 7/21 公版` 會回公版）；**純 @ 才回選單**。沒有 index 資訊時 fallback 回舊行為。
3. **少讀表（memo）**：`ss_()` 快取 spreadsheet handle；`syncData_()` 加 `_SYNC` per-request 記憶（`doPost`/`doGet` 進來先 `_SYNC=null` 重置）。一次「行程」查詢的 `data` 分頁只讀/parse 一次（實測 reads===1）。**沒用 CacheService**（data JSON 可能 >100KB 超過 cache 值上限會靜默失敗）。
4. **錯誤不再全靜默（`_log` 分頁）**：新增 `logErr_(where,detail)` 寫進 `_log` 分頁（留最近 200 列）。`doPost` per-event catch 改成記 `handleEvent` 例外；`reply_` 檢查回應碼，非 2xx 記 `reply <code>`（Flex 太大 400 之類終於看得到）。
5. **分頁上限（`trimSheet_`）**：`codes`、`members` 各留 500 列。**`editors` 不動**（那是權限白名單，按數量刪會誤撤權限）。
6. **維持不變**：只處理 `message` 事件、被加進群組不自我介紹（依需求）。

### 沒優化的（使用者決定先不做）
`classifyText_` 短訊息含 261 的誤判、無簽章驗證、doGet 授權、carousel 第④張固定圖（綁 261、與日期無關）。

---

## 三、測試（都在 scratchpad，可重建）

- **語法**：`node --check core.js`；`line_webhook.gs` 複製 `.js` 後 `node --check`。
- **core 等價性**：`equiv.js` 同 stub 跑「git 原始 vs 改後」core.js，比對 13 份公版 `parseGongban` ＋ board/day/stats 的 `render()`/`nav` innerHTML → **逐字元 IDENTICAL**。
- **自動排班行為**：`behavior.js`（載入改後 core.js）15 項全過——issue1 同上午不重疊可同一人、issue2 夜哨不排早打、issue3 站哨當班不排勤務、issue6 keepAll 佔全員、issue5 大公差跨 label 分不同人、issue7 guardAuto 排除當天不在、issue8 打飯/非打飯缺人提示、Q1 手動保留、13 份公版 autoAssign 後 `computeConflicts` 皆空、issue9 分菜標題不排人不進統計。
- **LINE stub 路由**：`linetest.js` 15 項全過——長文字截斷/Flex<50KB、@bot+指令執行/純@選單、syncData 一次請求讀一次、reply 非2xx 與 handler 例外寫 `_log`、codes/members trim 而 editors 不動、群組貼公版靜/閒聊靜/查行程有回（回歸）。

---

## 四、部署（改完要做的）

- **core.js/index.html/liff.html 三檔一起上**（只傳 index.html 會白畫面）、`core.js?v=47` 已同步；工作分支的 commit **要 merge 進 main** 才上線（`git checkout main && git merge <分支> --no-edit && git push origin main`）。
- **`line_webhook.gs`** 改了 → 在它自己的 Apps Script「管理部署作業 → 編輯 → 新版本 → 部署」（網址不變）才生效。`sync_AppsScript.gs` 這版沒動。
- LINE/LIFF 只能在部署後的 https / 手機 LINE 內實測（`sendMessages`/`getProfile`/Flex 大小要真環境）。

## 五、對「換下一梯」的提醒（延續既有待辦）
自動排班/ LINE 這版都沒解決「多梯共用」——`PEOPLE`（core.js）、`ROSTER`/`SHEET_ID`/`schedule8.jpg`（webhook）仍綁 261，且日期 key 只有月/日無年份。真要開放學弟用，建議「一梯一套部署」：抽出梯設定（PEOPLE/NAME_ALIASES/DEFAULT_SYNC_URL/EDIT_CODE/STORE_KEY）＋新試算表＋新 sync/webhook 部署，`STORE_KEY` 帶梯號避免同手機 localStorage 打架。人數若不是 8 人則要大改（到處假設 8）。
