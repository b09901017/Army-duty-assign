# 261 排勤務板 — 交接說明 v9（重大改動：抽出 core.js ＋ 串接 LINE / LIFF）

> 給下一個接手的 AI：**這一版是專案開張以來最大的結構改動**，先讀本檔，再視需要回頭讀：
> - **v4 第七節（資料安全）**：逐日合併＋墓碑、pull 過才准 push——**永遠的權威，這版沒動它**。
> - **v8**：curDate/activeDate 的血淚、「動到資料就要能同步」四步檢查清單。
> - **v6（時間軸）、v7（站哨多週／跨夜哨／解析自動填名字）**：功能細節。
> - **`docs/line-liff-plan.md`**：LINE 串接的完整規劃書（架構、後台每一步、里程碑）。
> - **`docs/line-qa.md`**：這次施工過程使用者問過、值得記住的問答（GitHub Pages、Firebase、Apps Script 部署踩坑…）。
>
> 全程繁中＋台灣軍中用語，先做再解釋。改完先 `node --check` 再功能測。

---

## 零、一句話總結這一版做了什麼

1. **把 `index.html` 的整個 `<script>` 邏輯層抽成獨立的 `core.js`**（1768 行），`index.html` 只剩 85 行的外殼（HTML＋`render()`＋DOM 綁定＋init）。**行為零變化**（逐字元等價測試證明）。
2. **新增 `liff.html`**：給 LINE 用的精簡排班頁，**共用 `core.js`**，只保留清單／時間軸兩檢視＋一顆「發送」。
3. **新增 `line_webhook.gs`**：LINE bot 後端（獨立的第二個 Apps Script，跟管資料的 `sync_AppsScript.gs` 分開）。
4. 完成一條龍：**LINE 轉傳空白公版 → bot 回按鈕 → 開 LIFF 排班 → 發送回聊天室轉傳**，同時計入統計＋上雲。

**目前 index.html / core.js ≈ v45、liff.html v1、line_webhook.gs v1、sync_AppsScript.gs（v3 分片，未動）。**

---

## 一、⚠️ 檔案結構已經變了（最重要，先看這個）

```
index.html         App 外殼（85 行）：HTML + <style> + <script src="core.js"> + 自己的 render()/DOM綁定/init
core.js            ★邏輯層全部在這★（1768 行）：常數/解析/分配/同步/統計/時間軸/面板/事件層(handle/onInput/onClick)
liff.html          LINE 用的精簡排班頁（共用 core.js）
sync_AppsScript.gs 資料同步後端（貼在試算表的 Apps Script；這版沒動）
line_webhook.gs    ★新★ LINE bot 後端（獨立的第二個 Apps Script，不是貼在試算表那個）
```

### 「唯一要編輯的檔」這句話已經作廢
以前 CLAUDE.md 說「index.html 是唯一要編輯的檔」。**現在不是了**：
- **改邏輯／解析／分配／同步／統計／時間軸／面板／事件** → 改 **`core.js`**。
- 改主 App 的頁面組合（header/四頁 nav/各頁 render）→ 改 **`index.html`** 的 `render()`。
- 改 LINE 排班頁 → 改 **`liff.html`**。
- 改 LINE bot 行為 → 改 **`line_webhook.gs`**。

### 兩支網頁怎麼共用 core.js（機制）
`index.html` 和 `liff.html` 都是 **classic script**（不是 module），各自 `<script src="core.js?v=N">` 載入後，core.js 裡所有 top-level 的 `var`／`function` 都變成**全域**，兩支網頁各自的內嵌 `<script>` 都看得到。所以：
- **core.js 不定義 `render()`**——`render()` 由每頁各自定義（index 的 render 畫四頁＋nav；liff 的 render 只畫清單/時間軸＋發送鈕）。core.js 裡的函式（autoAssign/commit/pullSync…）呼叫 `render()` 時，會呼叫到「當頁自己的 render」。這是整個共用架構的關鍵。
- **事件層 `handle/onInput/onClick/focusEl` 在 core.js**（共用）。每頁只做 DOM 綁定（`root.addEventListener(...)`）。liff 另外包一層 `liffClick`：liff 專屬動作（liff-send/liff-devparse）自己接，其餘全丟給 core 的 `handle`。
- 載入順序：**core.js 先、內嵌 script 後**（都放在 body 底、DOM 之後）。core.js 載入時只「定義＋建 state」，**不會自己呼叫 render/init**（那些在內嵌 script）。

### ⚠️ 部署鐵則（實測踩過坑）
- **一定要三個檔一起上傳**：`index.html`、`core.js`、`liff.html`。只傳 index.html → 主 App 找不到 core.js → 白畫面。
- **版號**：`index.html`／`liff.html` 裡引用的 `core.js?v=N` 的 N 要跟著改（避快取）。
- GitHub Pages 服務的是 **`main` 分支**。工作分支的 commit **要合併進 main** 才會上線（見第五節）。

---

## 二、core.js 是怎麼抽出來的（怕你懷疑有沒有改到行為）

分兩步、用 Python 依 marker 精準切，**沒有手動搬程式碼**（降低出錯）：
- **M1**：把 `/* ---------- 渲染 ---------- */` 之前的全部定義 → core.js；`fixMealTimes`（被 core 的 pullSync 呼叫）也搬進 core。index.html 剩 render+init。
- **M1b**：把事件層 `handle/onInput/onClick` 和 `focusEl` 也搬進 core.js。index.html 只剩 render()＋DOM 綁定＋init。

### 等價性測試（怎麼證明行為沒變）
`/tmp/harness.js`（可重建）：同一組 stub 環境（FakeEl/localStorage/fetch…）分別跑「git 上的原始單檔 index.html」與「切割後 core.js＋內嵌」，比對：
- 載入後的 `JSON.stringify(state)`
- `render()` 輸出的 `root.innerHTML`、`nav.innerHTML`
- `parseGongban(SAMPLE)` 的結果

**五項全部逐字元相同** → 行為零變化。另有功能測（解析→自動分配→計入→buildFilled 含班員名字）驗證事件層搬家後仍運作。**每次動 core.js／index.html 都建議重跑這個等價性測試。**

---

## 三、LINE / LIFF 一條龍（資料怎麼流）

```
你 LINE ──①轉傳空白公版──▶ line_webhook.gs(doPost)
                              ├ 白名單(ALLOW_UIDS)檢查
                              ├ 存公版到試算表 inbox 分頁、配一把 key
                              └②回 Flex 按鈕「點我排班」→ liff.line.me/{LIFF_ID}?key=xxx
你點按鈕 ──③開 liff.html?key=xxx──▶
   liff boot: liff.init→getProfile→比對白名單定 readOnly
            → 用 key 跟 line_webhook.gs(doGet?key=) 拿回公版原文
            → pullSync(先抓雲端最新，pull 過才准 push)
            → parseGongban(原文) 解析（含已填名字自動填入）
   你排人（清單/時間軸都共用 core 的 UI）
   按「發送」liffSend():
     ├ commit()  = 計入統計(b_+日期，同天覆蓋只算一次) + savePlan/saveBoard + persist 上雲
     ├ buildFilled()
     └④liff.sendMessages(填好公版) → 送回你跟 bot 的聊天室
你 ──⑤長按訊息轉傳給班長──▶
```

- liff 上雲用的是 **core 現有的 `DEFAULT_SYNC_URL`**（跟主 App 同一份試算表、同一套逐日合併＋墓碑＋pull過才准push）。**資料安全機制原封不動沿用。**
- liff 的 `state.readOnly` 由 **LINE userId 白名單**決定（不是主 App 那個 edit=0000 密碼）。名單內能編輯上傳，名單外只能看。

---

## 四、line_webhook.gs（LINE bot 後端）重點

- **獨立的第二個 Apps Script**，不是貼在試算表那個。用 `SpreadsheetApp.openById(SHEET_ID)` 存取同一份試算表的 `inbox` 分頁。
  - 為什麼要獨立：**一個 Apps Script 專案只能有一個 `doGet`／`doPost`**，sync 那份已經用掉了，硬塞會撞名。獨立專案＝各自的 doGet/doPost/部署網址，且完全不碰管資料那份。
- `doPost`：收 LINE events → `whoami` 回 userId → 白名單檢查 → 判斷像不像公版 → 存 inbox 配 key → 回 Flex 按鈕。
- `doGet?key=xxx`：回 `{text:公版原文}`（liff.html 抓公版用）。**沒帶 key 的 doGet 只回 alive 訊息、不碰試算表**（所以第一次打不會建 inbox，要打 `?key=` 才會建）。
- **Script Properties**（要設四個）：`CHANNEL_TOKEN`、`SHEET_ID`、`LIFF_ID`、`ALLOW_UIDS`（逗號分隔多人；空＝全部允許）。
- `trimInbox_(300)`：只留最近 300 筆公版。

### 安全性（誠實的限制）
- **Apps Script 收不到 HTTP header → 無法驗 `x-line-signature`**（已知限制）。補償＝userId 白名單（webhook 端是真防線；liff.html 端的 `ALLOW_UIDS` 是 client-side，只防手滑、可被繞過）。8 人勤務板、非機敏、雲端有既有保護，可接受。

---

## 五、部署流程（這版多了「合併到 main」這關）

GitHub Pages 服務 **`main` 分支**，但開發在工作分支 `claude/code-review-44w2k8`。所以每次要上線：

```bash
git checkout main
git merge <工作分支> --no-edit    # main 有自己的 merge 歷史，不能 --ff-only，用一般 merge
git push origin main
git checkout <工作分支>
```

（本專案有時 PR 會被自動合併，但別依賴；沒進 main 就是沒上線。實測就曾因為東西還在工作分支、main 沒 liff.html 而 404。）

改 `.gs`（line_webhook.gs 或 sync）要在**各自的 Apps Script** 專案「管理部署作業 → 編輯 → 新版本 → 部署」，網址不變；但 Script Properties 改值**即時生效、不用重部署**。

---

## 六、施工中實際踩到的坑（下次照這個少走冤枉路，細節在 line-qa.md）

1. **GitHub Pages 網址大小寫敏感**：repo 是 `Army-duty-assign`（大寫 A），LIFF Endpoint URL 要 `https://b09901017.github.io/Army-duty-assign/liff.html`，填小寫會 404。
2. **東西留在工作分支沒進 main** → Pages 上沒有 liff.html → 404。要 merge 到 main。
3. **Apps Script Web App 部署**：新增部署作業時要按齒輪選「網頁應用程式」、執行＝我、存取＝任何人；第一次要授權（進階→前往「專案」(不安全)→允許）。受管理的公司/學校 Google 帳號可能整個擋掉未驗證 App，換一般 Gmail 建。
4. **whoami 沒回應**：多半是 ①Script Properties 沒設 `CHANNEL_TOKEN` ②LINE 那邊 Webhook URL 沒填/Use webhook 沒開 ③官方帳號「回應設定」的 Webhook 沒啟用/自動回應沒關。
5. **`liff.isApiAvailable("sendMessages")` 會丟 `unexpected api name`**：這個 LIFF SDK 版本對這字串直接丟例外（不是回 false）。**已改成不用 isApiAvailable 當門檻**，直接 try/catch 呼叫 `liff.sendMessages`，失敗退回 `copyText`。→ 以後別再用 `isApiAvailable` 檢查特定 API 名稱。
6. **LIFF 底下會自動生出兩個 channel**（LINE Login＋Messaging API）：只管 Messaging API 那個，LINE Login 是平台代管 `getProfile()` 用的，不用理。
7. **LIFF scope**：要勾 `profile`＋`chat_message.write`；Add friend option 要 On。

---

## 七、尚未做／未來（接手可挑）

1. **M5（前瞻，還沒做）**：liff `commit`／`發送` 時，把 `buildFilled()`／`buildPersonList()` 產生的**文字字串**也存進雲端（每天一份，例如 payload 加 `texts[日期]={filled,persons}`）。目的：未來 bot 指令「給我 7/21 公版/分工」時直接讀存好的字串吐回去，不用把排版邏輯移植到 `.gs`。
   - **刻意先不做**：因為要動 `payload/applyRemote`（v4 血淚的同步核心），且要照 v8 第四節「存/傳/併/推」四步。等基本流程長期穩定再做。
2. **M6（未來）**：line_webhook.gs 加指令解析——你傳「7/21 分工」→ 讀雲端 `texts["7/21"].persons` → reply。靠 M5 鋪好的字串。
3. liff「發送」目前只送**填好公版**一則；未來可加送**個人分工**（`buildPersonList()`）第二則。
4. `ALLOW_UIDS` 目前寫死在 liff.html（client）＋ Script Properties（server）兩處，加人要兩邊改。
5. v4/v8 的老待辦仍在：整份欄位（names/absence/mealQueue/guardTally/guard）無逐項 ts、raw 原文不同步、站哨自動分配不看排休、`.gs` rebuild 凍結列權限例外等。

---

## 八、測試與注意事項

- **語法檢查**：`node --check core.js`；index/liff 的內嵌 script 抽出來各自 `node --check`（core.js 是主體，別忘了它）。
- **等價性測試**（動 core.js/index.html 必跑）：見第二節，證明主 App 行為不變。
- **liff 功能測**：node stub 帶 `?raw=` 假公版跑 解析→分配→發送(log 0→1)→buildFilled 含名字；另可用預裝 Chromium 實截清單/時間軸版面。
- **LINE 相關只能在手機 LINE App 內完整測**（sendMessages/getProfile 要真環境）；`.gs` 的 doGet 可在瀏覽器直接打網址測。
- 動同步／資料安全 → 永遠先讀 **v4 第七節**＋v8 第三、四節。
- 回應使用者提醒：三檔一起上傳、`?v=N` 避快取、工作分支要 merge 到 main、`.gs` 改了要重部署（新版本、網址不變）。
