# 261 排勤務板 — LINE / LIFF 串接規劃書 v1

> 給接手的 AI 與使用者看。這份是「動工前的完整規劃」，還沒寫任何 code。
> 前置閱讀：`handover_v8.md`（最新）＋ `handover_v4.md` 第七節（資料安全）。
> 全程繁中＋台灣軍中用語。原則：先做出來、每步驗證、不碰壞已上線的 app。

---

## 0. 一句話目標

班長用 LINE 傳空白公版給我 → 我轉傳給 bot → bot 跳一顆「點我排班」按鈕 →
點開一個**精簡版排班頁（LIFF）** → 解析、排人、上雲、計入統計 →
按「發送」把**填好的公版**送回聊天室讓我轉傳。

**不新開 repo、不覆蓋現有 app。** `index.html` 原本的完整 app 網址不變、行為不變。

---

## 1. 三個決策（已與使用者確認）

| 項目 | 決定 | 理由 |
|---|---|---|
| 程式碼共用 | **抽出 `core.js`**，`index.html` 與 `liff.html` 都引用 | 不重複、未來只改一處；動 index.html 但用 node --check＋實測保證行為不變 |
| LINE 後端 | **另開一份新的 Apps Script**（webhook 專用），寫進同一份試算表 | 原本管資料的 `sync_AppsScript.gs` 一行都不動、最安全 |
| 權限 | **userId 白名單**（可放多人），白名單內才能編輯／上傳 | 不是全開；名單外的人開了只能看 |

---

## 2. 全景架構

```
┌─────────────┐   ①轉傳空白公版    ┌──────────────────────────┐
│  你的 LINE   │ ─────────────────▶ │  LINE Bot (Messaging API) │
│  (聊天室)    │ ◀───────────────── │   webhook = 新 Apps Script │
└─────────────┘   ②回一顆按鈕Flex   └───────────┬──────────────┘
      │                                          │ 存公版原文
      │ ③點按鈕開 LIFF                            ▼
      ▼                                    ┌──────────────┐
┌──────────────────────────┐  ④用key取公版  │  Google 試算表 │
│  liff.html (GitHub Pages) │ ◀────────────│  inbox 分頁    │
│  = 精簡排班頁 + LIFF SDK   │              └──────┬───────┘
│  解析→排人→時間軸/清單     │                     │ 同一份試算表
│  ⑤發送 → liff.sendMessages │  ⑥上雲/計入統計      ▼
└──────────┬───────────────┘ ───────▶ ┌──────────────────────┐
           │ 填好公版送回聊天室          │ sync_AppsScript.gs    │
           ▼ (你長按轉傳給班長)          │ （現有，完全不動）      │
      回到你的 LINE 聊天室              │ doGet/doPost = data分頁 │
                                        └──────────────────────┘
```

重點：**LIFF 頁同時連兩個後端**——
- 跟「新 Apps Script」拿**這次要排的空白公版原文**（用 key）。
- 跟「現有 sync Apps Script」做**上雲同步＋統計**（跟 index.html 一模一樣，同一個 `DEFAULT_SYNC_URL`）。

---

## 3. 資料流（逐步，含每一步誰做什麼）

1. **你轉傳空白公版**給 bot（1 對 1 聊天室）。
2. LINE 把訊息 POST 到**新 Apps Script 的 `doPost`**（webhook）。它：
   - 檢查 `event.source.userId` 在不在**白名單**；不在就忽略（或回「你沒有權限」）。
   - 把公版原文寫進試算表 `inbox` 分頁，配一把 `key`（UUID）。
   - 用 **reply API** 回一則 **Flex Message**，按鈕文字「接到公版了，點我排班」，
     連到 `https://liff.line.me/{LIFF_ID}?key={key}`。
3. **你點按鈕** → LINE 開 `liff.html`，網址帶 `?key=xxx`。
4. `liff.html` 啟動：
   - `liff.init()` → `liff.getProfile()` 拿你的 userId → 比對白名單決定**可編輯 or 唯讀**。
   - 讀 `?key` → 跟新 Apps Script `doGet?key=xxx` 要回公版原文。
   - **先 `pullSync()`** 把雲端最新資料抓下來（資料安全鐵律：pull 過才准 push）。
   - 用**現有 `parseGongban()`** 解析公版（含「公版已填名字→自動填入」，原封照用）。
   - `state.activeDate` = 公版上的日期（`extractDate`）；沒日期就提示你補。
5. 你在 LIFF 裡**清單／時間軸**切換、排人（`openSheet`/`pickerInner`/`tlBlockInner` 全部照用）、自動分配（`autoAssign`）。
6. 你按**「發送」**：
   - `commit()` → 計入統計（`b_+日期`，**同一天重傳只會覆蓋、計一次**，已確認）。
   - `persist()` → 上雲（`payload()`，逐日合併＋墓碑保護，跟 index.html 完全相同）。
   - `liff.sendMessages([{type:'text', text: buildFilled()}])` → 把**填好的公版**送回聊天室。
   - （可選）再送一則 `buildPersonList()` 個人分工。
7. 你在聊天室**長按那則訊息 → 轉傳**給班長／班上。

---

## 4. 你要在 LINE 後台做的事（我沒法幫你點，逐步照做）

> 都在 https://developers.line.biz/console/ 免費申請。

### 4-1. 建 Messaging API channel（＝bot 本體）
1. 建一個 **Provider**（隨便取名，例：261）。
2. 在 Provider 底下建 **Messaging API channel** → 得到一個 LINE 官方帳號。
3. 記下 **Channel access token（long-lived）** 與 **Channel secret**（webhook 用不到 secret 也沒關係，見 §6 安全）。
4. 關掉「自動回覆訊息／歡迎訊息」（在 LINE Official Account Manager），避免干擾。
5. 用你的 LINE **加這個 bot 好友**（掃 QR）。

### 4-2. 建 LIFF app
1. 同一個 channel → **LIFF** 分頁 → Add。
2. **Endpoint URL** = `https://{你的帳號}.github.io/army-duty-assign/liff.html`
3. **Size** 選 `Full`。
4. 勾 **scope**：`profile`（拿 userId 做白名單）、`chat_message.write`（`liff.sendMessages` 要用）。
5. 開 **Bot link feature**（讓 LIFF 能送訊息回聊天室）。
6. 建好後得到 **LIFF ID**（像 `1234567890-abcdef`）→ 這要填進 `liff.html`。

### 4-3. 設 webhook
1. 部署好「新 Apps Script」後（§5-3），拿到它的 `/exec` 網址。
2. 回 Messaging API channel → **Webhook URL** 填那個 `/exec` → 開 **Use webhook**。
3. 在新 Apps Script 的 **Script Properties** 存：
   - `CHANNEL_TOKEN` = 上面的 Channel access token
   - `SHEET_ID` = 你那份試算表的 ID
   - `ALLOW_UIDS` = 允許的 userId，逗號分隔（先隨便填，第一次跑再補，見 §6）

### 4-4. 拿到自己的 userId（填白名單用）
- 最簡單：webhook 先寫成「把收到的 `event.source.userId` 回傳給你看」，你傳一句話給 bot，它回你 userId，複製貼進 `ALLOW_UIDS`。（我會把這個「查 id 模式」寫在程式裡，設好白名單後關掉。）

---

## 5. 我要寫 / 改的東西

### 5-1. 抽出 `core.js`（動到 index.html，但保證行為不變）
- 把 `index.html` `<script>` 裡的**邏輯層**搬到 `core.js`：
  常數（PEOPLE/GROUPS/GCOLORS/C/NAME_ALIASES…）、解析（parseGongban/parseSched/parseFilled 及全部 helper）、
  組字串（buildFilled/buildPersonList…）、分配（autoAssign/commit/computeConflicts…）、
  同步（payload/applyRemote/merge*/pushSync/pullSync/persist 全套）、統計（getHistory/HIST）、
  時間軸資料（tlBoardData/tlAxis/tlLanes…）。
- `index.html` 改成 `<script src="core.js?v=N"></script>` + 保留它自己的 `render()`／事件層。
- **驗證**：`node --check`；用 handover 提到的 node harness 跑原有斷言；Chromium 實截四頁比對，確認**行為 0 變化**。
- ⚠️ 若抽 core.js 過程風險太高，退路是「liff.html 複製一份」，但這是備案，優先 core.js。

### 5-2. `liff.html`（新檔，精簡排班頁）
引用 `core.js`，只換外殼：
- **保留**：清單（mealsRow＋fencaRow＋dutyList）＋時間軸（boardTimeline）兩檢視切換、解析、自動分配、排人面板、上雲、計入統計。
- **拿掉**：貼上框、今日出勤卡、閱讀模式 banner、日期小丸（boardTabs）、複製公版/個人分工/預覽那排、header 那些。
- **底部只留一顆「發送」**：`commit()` + `persist()` + `liff.sendMessages(填好公版)`（可加第二則個人分工）。
- **啟動流程**：`liff.init` → 白名單判定 readOnly → 取 key 抓公版 → `pullSync` → `parseGongban` → `render`。
- `DEFAULT_SYNC_URL` 沿用現有那條（跟 index.html 同一份雲端資料）。
- LIFF SDK 用 `<script src="https://static.line-scdn.net/liff/edge/2/sdk.js">`。

### 5-3. 新 Apps Script（LINE webhook，另開專案）
- `doPost(e)`：解析 LINE `events` → 判斷是文字訊息且 userId 在白名單 →
  存公版到 `inbox` 分頁配 key → reply Flex 按鈕（連 LIFF）。
- `doGet(e)`：`?key=xxx` → 回傳存的公版原文（給 liff.html 抓）。
- `?whoami`（查 id 模式）：回傳 userId，設好白名單後可留著沒差。
- 用 `UrlFetchApp` 呼叫 LINE reply API（免費）；`SpreadsheetApp.openById(SHEET_ID)` 存 inbox。
- **完全不碰** `sync_AppsScript.gs`。

### 5-4. 前瞻性小加工（為了未來 bot 指令，現在順手埋）
- LIFF `commit` 時，把 `buildFilled()`／`buildPersonList()` 產生的**文字字串**也存進雲端（每天一份，塞進 payload 的一個新欄位，例如 `texts[日期]={filled, persons}`）。
- 這樣未來「叫 bot 給我 7/21 個人分工」時，**bot 直接讀存好的字串吐回去**，不用把排版邏輯移植到 Apps Script。詳見 §8。
- 加這欄位要照 handover_v8 第四節「動到資料就要能同步」四件事：存／傳／併／推都補上。

---

## 6. 安全性（誠實講限制）

- **Apps Script 收不到 HTTP header** → **無法驗 `x-line-signature`**（這是 Apps Script 當 webhook 的已知限制）。
- 補償防線：**userId 白名單**。webhook 只理會 `ALLOW_UIDS` 裡的人；LIFF 也用 `liff.getProfile().userId` 再擋一次，名單外只能看不能上傳。
- 影響評估：這是 8 人勤務板、非機敏資料，且雲端本來就有逐日合併＋墓碑＋pull-before-push 保護，風險可接受。
- LIFF 連結雖是公開網址，但沒有白名單 userId 就無法寫入雲端，等於「看得到、改不了」。

---

## 7. 快取 / 部署注意

- 改完一樣要**上傳覆蓋 GitHub Pages**；`index.html`、`liff.html`、`core.js` 都建議掛 `?v=N` 避快取（core.js 的引用也要進版號）。
- 雲端同步／`liff.sendMessages` **只能在部署後的 https 網址測**，預覽沙盒會被擋。
- LIFF 只能在**手機 LINE App 內**完整測（sendMessages、getProfile 要真環境）；桌機可用 LIFF Inspector 測部分。
- 新 Apps Script 改完要「管理部署作業→編輯→新版本→部署」，webhook 網址不變。

---

## 8. 未來 bot 指令（「給我某天的公版／分工」）怎麼接 — 不用重寫

因為 §5-4 已經把產生好的文字存上雲，未來只要在**新 Apps Script 的 webhook** 加指令解析：

- 你傳「7/21 分工」→ webhook 讀雲端 `texts["7/21"].persons` → reply 回那段文字。
- 你傳「7/21 公版」→ 回 `texts["7/21"].filled`。
- 完全不用把 `buildFilled/buildPersonList` 移植成 Apps Script。**這就是現在先埋 §5-4 的價值。**

若哪天想要更進階（bot 直接重算、改人），那才需要把邏輯搬到後端——但那是另一個獨立專案，不影響現在這版。

---

## 9. 施工順序（里程碑，每步可驗證）

1. **M1**：抽 `core.js`，index.html 改引用 → node --check ＋實測四頁行為不變。（不碰 LINE，先確定沒弄壞原 app）
   - ✅ **已完成**。`core.js`（1634 行）＝邏輯層全部定義＋`fixMealTimes`；`index.html`（216 行）＝`<script src="core.js?v=45">`＋自己的 `render()`/`onInput`/`handle()`/`onClick`/init。
   - 切割用 marker 精準切（渲染註解行 `/* ---------- 渲染 ---------- */` 為界；`fixMealTimes` 因被 core 的 `pullSync` 呼叫故移進 core）。兩檔皆 `"use strict";`，classic script 共用全域，載入順序 core→inline。
   - **等價性測試通過**：同一 stub 環境跑「原始單檔」vs「core.js＋inline」，`state`／`render` 的 root/nav HTML／`parseGongban` 結果**逐字元相同**。
   - ⚠️ **之後編輯注意**：邏輯／解析／同步／統計／時間軸／面板都在 `core.js`；`index.html` 只剩 render/事件/init。改邏輯去 core.js。**部署要同時上傳 `core.js` 與 `index.html`，並把 `index.html` 裡 `core.js?v=N` 的 N 一起進版號避快取。**
2. **M2**：`liff.html` 精簡頁做出來，先用網址手動帶 `?key=` 假資料測解析／排人／時間軸。
   - ✅ **已完成**。`liff.html` 共用 `core.js`，只寫自己的 `render()`（liffHeader＋清單/時間軸切換＋一顆固定底部「發送」鈕）＋LIFF 膠水＋`liffClick`（liff-send/liff-devparse 自己接，其餘全交給 core 的 `handle`）。
   - 取公版三種來源：`?key=`（正式，跟 webhook 拿）、`?raw=`（測試帶原文）、都沒有→dev 貼上框。
   - `boot()`：先 `pullSync`＋`startPoll`（資料安全 pull 過才准 push）→ `liff.init`＋`getProfile` 比對 `ALLOW_UIDS` 白名單決定 readOnly → `loadGongban`。
   - `liffSend()`：`commit()`（計入統計＋上雲）＋`buildFilled()`＋`liff.sendMessages`（非 LINE 環境退回 `copyText`）。
   - **驗證**：node --check；node 功能測（`?raw=` 解析 3 項→自動分配 9 人次→發送 log 0→1→buildFilled 含班員名字）；**Chromium 實截清單頁＋時間軸頁版面正確**（標頭日期、切換、打飯/公差分組、甘特方塊、補休自動帶出、固定發送鈕；無今日出勤/nav/貼上框）。
   - ⚠️ `liff.html` 頂端 `LIFF_ID`／`GONGBAN_FETCH_URL`／`ALLOW_UIDS` 留空＝dev 模式，**M3 要填**。部署也要 `core.js?v=N` 進版號。
3. **M3**：新 Apps Script webhook + inbox；你在 LINE 後台設好 channel/LIFF/webhook；跑通「轉傳公版→跳按鈕→開 LIFF→抓到公版」。
   - ✅ **程式碼完成**：`line_webhook.gs`。`doPost` 收 LINE events→白名單檢查→存 inbox 配 key→回 Flex 按鈕（連 `liff.line.me/{LIFF_ID}?key=`）；`doGet?key=` 回 `{text:公版原文}`；`whoami` 回 userId；`trimInbox_` 只留最近 300 筆。node --check 過。
   - ⏳ **待你在後台做**（見 §4）：建 Messaging API channel＋LIFF、設 Script Properties（CHANNEL_TOKEN/SHEET_ID/LIFF_ID/ALLOW_UIDS）、部署取 /exec、填 LINE Webhook URL、把 /exec 填進 `liff.html` 的 `GONGBAN_FETCH_URL`、把 LIFF_ID/ALLOW_UIDS 填進 `liff.html`。
   - 契約：liff `?key=` ↔ webhook `doGet?key=` 回 `{text}`；Flex `uri` ↔ liff `boot` 讀 `params.key`。已對齊。
4. **M4**：接上雲＋計入統計＋「發送」`liff.sendMessages`；手機實測整條龍。
5. **M5**（前瞻）：commit 存 `texts[日期]` 上雲，為未來 bot 指令鋪路。
6. **M6**（未來，可延後）：bot 指令「給我某天公版／分工」。

---

## 10. 待你提供 / 決定

- LINE **LIFF ID**、**Channel access token**、**試算表 ID**、你的 **userId**（跑起來才拿得到）。
- 白名單要放**哪幾個人**（給我 LINE 顯示名稱或你自己蒐集 userId）。
- 「發送」要送**填好公版**、**個人分工**、還是**兩則都送**（預設：先送填好公版，之後可加）。
- GitHub Pages 的實際網址（確認 `liff.html` 的 Endpoint URL）。

---

*本規劃書為 v1，動工後每個里程碑會回來更新，並在最新 handover 記錄實際改了什麼。*
