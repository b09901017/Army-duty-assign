# 261 排勤務板 — 交接說明 v8（對應 index.html ≈ v40 · Apps Script v3 未動）

給下一個 AI：**先讀 v4（資料模型／雲端同步／資料安全的權威版本）＋ v6（時間軸）＋ v7（站哨多週、跨夜哨、解析自動填名字），再讀本檔。** v8 是**資料同步 bug 修復**，動到 `curDate/livePlan/sparse/pushNow`，但**沒有退回 v4 第七節任何保護**（逐日合併＋墓碑、pull 過才准 push、`remoteNewer&&!dirty` 才套整份欄位，全部原封不動）。

全程繁體中文＋台灣軍中用語，先做再解釋。改完先 `node --check` 再功能測。回應提醒：上傳覆蓋 GitHub、`?v=N` 避快取；雲端同步部署後 https 測。**`.gs` 這版沒改，不用重新部署。**

---

## 一、這次修的核心 bug：「排班頁顯示成別天」（最重要）

### 症狀
使用者本機與**無痕**都更新到 7/21，**行程頁對**（顯示 7/21），但**排班頁整頁像 7/20**。而且**每一台從雲端 pull 下來的人都一樣中招**（不是單一裝置的問題）。

### 根因（用使用者真實雲端 data 驗證出來的）
1. **原文 raw 不上雲端**（v4 省空間的設計）：`slimBoards()` 剝掉 `board.raw / schedule.raw`。所以**任何裝置從雲端 pull 下來後，`state.gongban.raw` 是空字串**（本機沒存過原文的話）。
2. `curDate()` 舊寫法是 `extractDate(state.gongban.raw) || state.schedule.date || todayLabel()`。raw 是空的 → 退回 `schedule.date`。
3. 這位使用者 7/21 清晨排班時，7/21 的行動準據還沒發，貼了 **7/20 的準據**到 7/21 的排班板（`sparse` 只跳「不同天」警告、仍允許存），所以 **7/21 板的 `schedule.date = 7/20`、title = 「7/20（一）行動準據」**。
4. 兩者相乘 → 開 7/21 的排班板時 `curDate()` 回傳 **7/20**。於是整個排班頁吃錯天：出勤/排休（`syncAvail`/`availCard`）、臨時行程（`extraCard(curDate())`）、補休（`restBlock`/`impliedRests`）、時間軸，甚至 **`commit()` 若沒 activeDate 會計入錯天**，全部當 7/20 跑。
5. **行程頁沒事**，因為它用日期小丸的 `plan.date`（`planForBoard(md)` 吃傳進來的 md），**完全不碰 `curDate()`**。

> ⚠️ 重點觀念：**排班板的真正身分是 `state.activeDate`（點開／解析那天精準設定的），不是從 raw 猜的。** raw 根本不同步，拿它當日期來源必然在別台上壞掉。`commit()` 本來就用 `state.activeDate||...`（所以計入日多半還是對的），只是 `curDate()`/`livePlan()` 沒跟上。

### 修法（3 行，最小面積）
1. **`curDate()`**：改成 `state.activeDate || extractDate(raw) || schedule.date || today`。activeDate 有值（有開板）就一定用它；沒開板才退回舊邏輯。
2. **`livePlan()` 裡的 `var date=...`**：同樣改成 `state.activeDate || ...`。livePlan 代表「目前開著的排班板的即時行程」，它的日期也該是 activeDate（影響「複製個人分工」的表頭、站哨事件抓哪天）。
3. 這兩個一改，`schedule.date` 是不是別天就**不再有殺傷力**了（準則的時間點每天其實都一樣，reuse 別天準據其實無妨，只是以前會污染 `curDate`）。**沒有動 `sparse` 的「不同天」警告**（仍提醒使用者可能貼錯），也**沒有去竄改雲端那份 7/20 準據**——修完行為就對了，那份資料留著無害；使用者想清乾淨就重貼一次 7/21 的準據即可。

### 驗證（node harness，用使用者真實雲端 payload）
- `curDate()`：載入雲端 → `loadBoard("7/21")` → 修前回 `7/20`（重現 bug）、**修後回 `7/21`**；7/20 板仍回 `7/20`；沒開板回 today。
- 四頁 render 不炸；開 7/21 板時 `extraCard`/`extraEventsFor` 顯示 7/21 的「民防課程／集合升旗」、**不再**顯示 7/20 的「搬東西上中戰」。

---

## 二、順手補的兩個同步缺口

### (1) 貼行動準據（`sparse`）現在會自動上傳
- 舊：`sparse` 結尾只 `persistLocal()`（存本機、**不 push**）。所以你貼完準據，雲端要等你**下次做別的動作**才會被一起帶上去 → 中間那段「只有你看得到準據」。
- 新：改成 `persist()`（存本機＋0.4s debounce 上傳）。準據一貼就同步。
- 為什麼安全：準據是存在 `boards[activeDate].schedule` 裡、跟排班板一起逐日 `ts` 合併的，push 它完全符合 v4 的合併機制；`persist()` 會設 `stateTs/dirty`，那是「我剛改過東西」的正常語意。

### (2) 「立即備份到雲端」（`pushNow`）也存站哨週
- `pushNow()` 原本只 `saveBoard()` 就送 `payload()`。加上 `saveGuardWeek()`，確保按一下就把「目前正在編的排班板＋站哨週」都存進去再上傳，名副其實「一鍵把該有的全部備份」。

---

## 三、資料同步全表（回答使用者「哪些只有我看得到」）

### ✅ 有上傳、其他人都看得到（`payload()`；幾乎每個編輯動作 0.4s 後自動 push）
`names`（改名）、`log`（統計計次＋臨時行程 `x_`）、`mealQueue`（打飯輪序）、`guard`（本週站哨 active）＋`guardWeeks`（歷史各週站哨）、`guardTally`（站哨累積）、`plans`（行程／當天流程）、`absence`（排休／不在／補休）、`boards`（每天排班板：`duties/schedule/committed/wd`）、`tomb/tombIds/wipe`（刪除墓碑）、`stateTs`。

### 📵 只留本機、別台看不到（**刻意**）
- **每份排班板的原文**：`board.raw`、`schedule.raw`、`gongban.raw`。→ 別台看得到**解析後**的板／準則／行程，但看不到你貼的**原始文字**（省 61% 體積）。**所以 `curDate()` 之類的東西絕對不能依賴 raw**（本檔第一節的血淚）。
- `activeDate`（你正在看／編哪一天）、`activeGuardWeek`（你在看哪一週站哨）：device-local。
- 純畫面狀態：編輯/閱讀模式、清單/時間軸、各種展開收合、貼上框開合、`boardOpen`（連 localStorage 都不存，reload 後排班頁預設回到「貼公版＋小丸」）。

### 🔘 要按鈕 / 例外
- 統計頁「立即備份到雲端」＝手動強推全部（網路不穩時補推；`pushSync` 失敗不自動重試，這顆是保險）。
- 唯讀模式不能上傳（本來就該）。
- （修好前的例外）貼準據不自動上傳 —— **已修**，現在自動了。

### ⚠️ 整份欄位、沒有逐項時間戳（沿用 v4，未改）
`names/mealQueue/guardTally/guard(active)/absence` 是整份存的，只靠 `stateTs+dirty` 保護（`remoteNewer&&!dirty` 才套遠端）。兩台同時各改不同欄位仍可能取一邊。要更穩得逐項加 ts（v4 第十節第 2 點的老待辦）。

---

## 四、給之後每一次優化的「動到資料就要能同步」檢查清單（使用者特別要求記下來）

**只要你新增／修改任何「該讓全隊看到」的欄位或資料，務必四件事一起做，否則會變成「只有我看得到」：**

1. **存**：加進 `persistLocal()` 的 `JSON.stringify({...})`（本機）。
2. **傳**：加進 `payload()` 的 `JSON.stringify({...})`（上雲端）。**沒加進 payload＝永遠只有本機看得到。**
3. **併**：在 `applyRemote(o)` 幫它決定「pull 下來怎麼合併」——
   - 有逐日/逐筆 key 的（像 boards/log/plans/guardWeeks）→ 照 `mergeBoards/mergeLog/mergePlans/mergeGuardWeeks` 那樣**逐項取 ts 較新者＋看墓碑**，不要整塊覆蓋。
   - 整份的（像 absence）→ 放進 `remoteNewer&&!dirty` 那塊，別讓它蓋掉本機剛改的。
4. **推**：改資料的動作用 **`persist()`**（存本機＋上傳），**不要只用 `persistLocal()`**（那只存本機、不 push）。純切檢視／純畫面才用 `persistLocal()` 或不存。

**還有一條鐵律**：**任何「這是哪一天／哪一週」的判斷，用 `state.activeDate`／`state.activeGuardWeek`，不要從 `raw` 或別的原文字串反推**——原文不同步，反推在別台一定壞（本檔第一節就是這樣爆的）。

---

## 五、已知未做／待議（接手可挑）
1. `sparse` 貼到「不同天」的準據只警告不阻擋。修完 `curDate` 後已無害，但若想更乾淨可考慮：貼別天準據時把 `schedule.date` 順手改成 `activeDate`（＝把它當「這天的準據」收下），或做成「要不要套用到今天」的確認。目前刻意不動，保留警告。
2. 原文 raw 不同步 → 換手機看不到原始公版／準則預覽（v4 第十節第 7 點的老待辦，仍在）。
3. 整份欄位沒逐項 ts（見第三節⚠️）。
4. v7 那些「站哨行程只反映 active 週」等限制仍在。
5. 試算表 `data` 分頁的 E 欄看到一則 `統計總表 ✗ Exception: 很抱歉，你無法凍…` —— 那是 Apps Script `rebuild_`（把 payload 攤成人看的「統計總表」分頁）在**凍結列**時踩到權限/語系問題，**只影響那張給人看的漂亮分頁，不影響 A 欄的核心資料同步**（A 欄 JSON 完整）。要修是去 `.gs` 的 rebuild 段把 `setFrozenRows` 包 try/catch 或拿掉，本次沒動 `.gs`。

---

## 六、測試與注意事項
- 改完先 `node --check`（抽 `<script>`）。功能測照 v4 第九節 stub 環境；本次另用**使用者真實雲端 payload**（試算表 data 分頁匯出、A 欄分片重組成 JSON）跑 `curDate`/四頁 render/臨時行程對天，共 12 項核心斷言全過。
- 動同步／資料安全 → v4 第七節＋本檔第三、四節。
- 目前 **index.html ≈ v40、Apps Script v3（分片，未動）**。
