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

**目前 index.html / core.js ≈ v46、liff.html（含排班/準據上傳/唯讀檢視三模式）、line_webhook.gs（群組 bot）、sync_AppsScript.gs（v3 分片，未動）。**

---

## 現況總覽（下一個 AI 先看這張速查表，細節再往下翻）

### bot 指令一覽（line_webhook.gs · 詳見第十節）
| 打什麼 / 做什麼 | 誰可以 | bot 回什麼 |
|---|---|---|
| 轉傳「空白公版」 | 編輯者 | Flex「排 X/X 的班」→ 開 LIFF 排班 |
| 轉傳「行動準據」 | 編輯者 | Flex「上傳 X/X 準據」→ LIFF `?type=guide` |
| `公版` / `7/21 公版` | 全開 | 填好公版文字（讀 `texts[日期].filled`） |
| `分工` / `7/21 分工` | 全開 | 個人分工文字（`texts[日期].persons`） |
| `行程` / `7/21 行程` | 全開 | **carousel 4 張**：①完整勤務(texts.filled) ②行動準據(準據原文) ③個人分工(texts.persons) ④八人時段表(固定圖)；前三張底部「視覺化呈現」+ ④「看完整」開 LIFF `?type=view&view=C/A/B`（詳見第十節 (6)） |
| `開通編輯權限` | 任何人 | 「為您生成隨機碼：K-XXXX\n請貼給 {OWNER_NAME}」 |
| `開通 K-XXXX` | 班頭 | 把該代碼的人加進 `editors` 分頁 |
| `移除 K-XXXX` / `名單` | 班頭 | 管理編輯者 |
| `app` / `網址` / `完整版` | 全開 | 完整 App 網址（唯讀看全部） |
| `指令` / @提及機器人 | 全開 | 「到底是哪裡有問題 🤨」＋ quick reply |
| `關燈` | 全開 | 隨機抽班上一人 @他去關燈💡 |
| （語音訊息） | — | 「浩ㄏㄠˇ～～～」 |
| 群組其他閒聊 | — | **安靜不回**（一對一才會回選單） |

### Script Properties（line_webhook.gs 那份 Apps Script）
`CHANNEL_TOKEN`、`SHEET_ID`、`LIFF_ID`、`ALLOW_UIDS`（**只放班頭**）、`APP_URL`（選填）、`OWNER_NAME`（選填，預設「旭辰」）、`SCHED_IMG_URL`（選填，行程 carousel 八人時段表那張固定圖網址；預設 `data/schedule8.jpg`，設 `none`/`off` 退回文字卡）

### 試算表分頁（都在 sync 那份表；webhook 用 openById 存取）
`data`（sync 存的完整 payload 分片，webhook 讀 texts）、`inbox`（公版/準據暫存）、`codes`（代碼↔uid）、`editors`（編輯者）、`members`（群組認人給關燈用）

### liff.html 頂端常數（M3 填的）
`LIFF_ID`、`GONGBAN_FETCH_URL`（webhook 的 /exec）、`ALLOW_UIDS`（班頭 userId；其他編輯者靠 `?canedit=` 動態問 webhook）

### 部署 checklist（改完哪個要做什麼）
- 改 `core.js`/`index.html`/`liff.html` → **merge 到 main**（Pages 才更新）＋ `core.js?v=N` 進版號。
- 改 `line_webhook.gs` → **重新部署那份 Apps Script**（管理部署→編輯→新版本→部署；網址不變）。
- 改 `sync_AppsScript.gs` → 同上，重新部署那份。
- Script Properties 改值 → **即時生效、不用重部署**。

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

> ⚠️ 本節是 M3 初版的骨架；**webhook 現在功能多很多**（分類/查詢/carousel/權限/代碼/關燈…），完整現況看**最上面的速查表**＋**第九、十節**。這裡只留「為什麼獨立」這種不變的底層。

- **獨立的第二個 Apps Script**，不是貼在試算表那個。用 `SpreadsheetApp.openById(SHEET_ID)` 存取同一份試算表的分頁。
  - 為什麼要獨立：**一個 Apps Script 專案只能有一個 `doGet`／`doPost`**，sync 那份已經用掉了，硬塞會撞名。獨立專案＝各自的 doGet/doPost/部署網址，且完全不碰管資料那份。
- `doPost`：收 LINE events → `handleEvent_` 分流（語音/提及/指令/查詢/貼原文…，見第十節）。
- `doGet?key=xxx`→`{text,type}`（liff 抓原文）；`doGet?canedit=uid`→`{edit:bool}`（liff 動態問權限）；沒參數只回 alive。
- **Script Properties**：`CHANNEL_TOKEN`、`SHEET_ID`、`LIFF_ID`、`ALLOW_UIDS`(班頭)、`APP_URL`(選填)、`OWNER_NAME`(選填)。
- `trimInbox_(300)`：inbox 只留最近 300 筆。

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

1. ✅ **M5 已完成**（見第九節）：payload 加 `texts[日期]={filled,persons,ts}`。
2. ✅ **M6 已完成**（見第九節）：webhook 區分公版/準據 + 查詢指令。
3. **行動準據上傳已完成**（見第九節）：傳準據給 bot → LIFF 上傳到 `boards[日期].schedule`。
4. liff「發送」目前只送**填好公版**一則；未來可加送**個人分工**（`buildPersonList()`）第二則。
5. **編輯者權限已改成機器人動態管理**（第十節 (2)）：班頭在 LINE 打「開通 代碼」即可，不用再手改後台。liff.html 頂端 `ALLOW_UIDS` 只留班頭當 fail-safe，其餘靠 `?canedit=` 動態問 webhook。
6. **行程 carousel「美圖預覽」（option A，評估過、暫緩、使用者說先不做）**：想讓卡片直接顯示像 App 那樣的甘特圖，Flex 原生辦不到（它不是網頁），唯一方法是**把畫面拍成 PNG 貼進卡片**。已實測 **html2canvas 對 modeC 截圖畫質完美**（用 `/tmp` 的 Chromium＋html2canvas 驗過），所以**產圖沒問題**；卡關在**圖床**（要公開 https 網址）——Drive 連結在 LINE 裡不穩，建議用 **Cloudinary unsigned upload**（免費、可靠）。做法：liff 發送時 html2canvas 拍三張→上傳 Cloudinary→URL 存進 `texts[日期].images={C,A,B}`→webhook carousel 有圖放圖、沒圖退回現在的文字卡。工程約半天。**目前是文字預覽卡（第十節 (5)）。**
7. v4/v8 的老待辦仍在：整份欄位（names/absence/mealQueue/guardTally/guard）無逐項 ts、raw 原文不同步、站哨自動分配不看排休、`.gs` rebuild 凍結列權限例外等。

## 九、v9 追加：texts 字串上雲(M5) + 行動準據上傳 + bot 查詢/分類(M6)

> 這節是 v9 主結構完成、LINE 一條龍跑通後追加的三個功能。**動到了 `payload/applyRemote`（v4 同步核心），照 v8 第四節「存/傳/併/推」四步做，沒退回任何保護。**

### (1) M5：`state.texts[日期]={filled,persons,ts}` 上雲（core.js）
- **用途**：把每天「填好的公版」`buildFilled()` 與「個人分工」`buildPersonList()` 產生的**文字字串**存進雲端，給 LINE bot 查詢用（M6），不用把排版邏輯移植到 `.gs`。
- **四步**：存（persistLocal 加 texts）、傳（payload 加 texts）、併（applyRemote 加 `mergeTexts`——逐日取 ts 較新者＋看墓碑/wipe，比照 mergePlans；cur/now 變更偵測快照也納入 `tx`）、推（`commit()` 寫入 `state.texts[dk]` 後走既有 persist）。`delDayAll` 一併刪 texts[md]。
- **主 App 零影響**：texts 是資料、不進 render。等價性測試（render/nav/parseGongban 逐字元不變）通過。
- ⚠️ 加了 texts 後，「原始單檔 vs core.js」的**整份 state 等價**不再成立（多了 texts 欄位）——改用「render/nav/parseGongban 不變」來驗主 App 行為，別再拿整份 state 比。

### (2) 行動準據上傳（liff.html，`?type=guide`）
- 傳「行動準據」給 bot → Flex「上傳 X/X 準據」→ 開 `liff.html?key=xxx&type=guide`。
- liff `applyGuide`＝`parseSched` 解析 → 預覽時段清單 →「上傳」鈕。
- **`uploadGuide` 只改 `boards[pd].schedule` 欄位、完整保留既有 `duties/committed`**（避免洗掉排班）。沒 board 的日子建 schedule-only board。上傳後主 App 打開那天就有準據。
- **資料安全**：上傳前 `if(!pulledOk)` 擋住（pull 過才准 push）——**這條很關鍵**：沒 pull 到雲端最新那天 board 就上傳，會用本機空的覆蓋掉已排 duties。務必保留。

### (3) 日期確認（公版 send／準據 upload 都適用）
- **今天/明天/未來 → 直接放行**；**昨天以前（過去）→ 覆蓋前跳兩段式確認**（班長常傳錯日期，避免覆蓋既有排班/準據）。
- 判斷用 `isPastDate(md)=dnum(md)<dnum(todayLabel())`。確認 UI：`state._confirmSend`（公版）、`state._confirmUpload`（準據）。

### (4) M6：webhook 分類 + 查詢（line_webhook.gs）
- **`classifyText_`**：`🔷`/標題含「勤務」→ 公版；含「行動準據」/時間軸行計分 → 準據；都不像 → unknown。**用 `data/` 26 個真實範例測，26/26 全對。** 改判斷邏輯務必回歸跑這個。
- 準據存 inbox `type=guide`、回古銅色 Flex「上傳」；公版回墨綠 Flex「排班」。按鈕帶相對日期。
- **inbox 加第 5 欄 type**；`doGet` 回 `{text,type}`（舊列無 type→預設 gongban）。
- **查詢指令 `tryQuery_`**：單行含「公版/分工」→ `syncData_()` 讀 sync 試算表 `data` 分頁分片 JSON（比照 sync 的 `read_` 串接 A1..A30）→ 取 `texts[日期].filled/persons` 回文字。多行原文不誤判為查詢。`help/指令` 有說明。
- **前提**：texts 要 App 端（M5 已部署）排好按發送才會有；webhook 的 `SHEET_ID` 指向同一份試算表才讀得到。
- ⚠️ 改 `.gs` 後**使用者要重新部署**（貼新碼→新版本→部署）才生效。

### 測試
- core M5：主 App render 不變＋texts commit/payload/mergeTexts（取新/補缺/墓碑）全過。
- liff：準據/公版 × 過去/未來日期的確認流程、`uploadGuide` 保留既有 duties、texts 連動；Chromium 實截準據上傳頁。
- webhook：node --check、`classifyText_` 26/26、查詢判斷 fallback edge case。

> ⚠️ 注意：`tryQuery_/helpText_/allowed_` 已在「群組化」那批（第十節）被 `parseQuery_/answerQuery_/introMsg_/allowedEdit_` 取代，本節文字描述的是當時版本。

## 十、群組化：情境分類＋權限拆分＋代碼開通＋carousel/檢視＋@提及/語音/app（webhook + liff）

> 目的：把 bot 拉進 8 人群組。群組要「安靜、大家看結果」，一對一才「你一句他一句」。動 `line_webhook.gs` 與 `liff.html`，**core.js 沒動**。

### (1) 情境分類 + 權限拆分（webhook `handleEvent_`）
- `ev.source.type`：`group`/`room`＝群組、`user`＝一對一。
- **群組預設安靜**：只回「查詢／指令／@提及／語音」；閒聊、非編輯者貼原文 → **直接 return 不回**（不洗版）。一對一才會對看不懂的訊息回選單。
- **權限兩層**：看結果（公版/分工/行程查詢）**全開**；排班/上傳（貼原文拿按鈕）限**編輯者**。
  - `isOwner_(uid)`＝`ALLOW_UIDS` 屬性；`allowedEdit_(uid)`＝owner ＋ `editors` 分頁。`ALLOW_UIDS` 空＝測試全開。

### (2) 友善代碼 + 機器人管理編輯名單（不用再手改後台）
- 隊友打「代碼」→ `codes` 分頁配 `K-XXXX`（不露 userId）→ 貼給班頭。
- 班頭打「開通 K-XXXX」→ `uidOfCode_` 還原 userId → 加進 `editors` 分頁。「移除」「名單」管理，**只有 owner 能管**。
- **liff 動態權限**：`doGet?canedit=uid`→`{edit:bool}`。liff `boot` 先用本機 `ALLOW_UIDS` 判定（owner 一定通），再 `fetchCanEdit` 跟 webhook 確認（機器人開通的編輯者也能編；fetch 失敗 fail-safe 維持本機判定）。→ 兩邊白名單一致，加人只在 LINE 裡「開通」即可。

### (3) 行程 carousel 三頁 + liff 唯讀檢視
> ⚠️ **carousel 已於 (6) 改成 4 張 mega**（本節是當時的三頁版，看最終狀態直接跳 (6)）；liff 唯讀檢視 view=A/B/C 仍沿用。
- 查「行程/流程」→ **kilo carousel 三頁**（八人時段表/當天流程/八人分工），各自按鈕開 `liff.line.me/{LIFF_ID}?type=view&view=C/A/B&date=`。
- liff `?type=view`：`boot` 認出後 **pull → 唯讀 render `modeC/modeA/modeB`**（共用 core 那三個 render），不用取原文、不用白名單、`readOnly=true`、無發送鈕。pull 回來會自動重繪。

### (4) @提及 / 語音 / app / 指令
- `isMentioned_`（`msg.mention.mentionees[].isSelf`）→ `introMsg_`（介紹＋**quick reply** 指令快捷：公版/分工/行程/app/代碼/指令）。
- 語音 `msg.type==='audio'` → 回「浩ㄏㄠˇ～～～」（群組＋一對一）。
- 「app/網址/完整版」→ 回完整 App 網址（`APP_URL` 屬性，預設 github.io 那條）。

### 新增 Script Properties / 分頁
- 屬性：`APP_URL`（選填）。`ALLOW_UIDS` 現在只放**班頭**，其他編輯者用「開通」加。
- 自動建分頁：`codes`（代碼↔uid）、`editors`（編輯者）。inbox 不變。

### 測試
- webhook：Apps Script stub 跑 **20 項路由測試全過**（語音、群組安靜、查詢全開、carousel 三頁 kilo、一對一選單、權限拆分、代碼→開通→變編輯者、@提及、app、canedit）。
- liff：view=A/B/C 唯讀 render（_mode/readOnly/標頭/資料/無發送鈕/不丟例外）＋沒資料提示；Chromium 實截 modeC 檢視頁。
- ⚠️ 部署：webhook 改了要**重新部署 Apps Script**；liff 改了要 merge 到 main（Pages）。LINE 後台要開「允許加入群組」並把 bot 加進群組。

### (5) 追加優化（第二批）
- **carousel 三頁改「預覽內容」**（⚠️ 此三頁預覽已於 (6) 重構成 4 張，`dayPreview_`/`rowTimeText_`/`rowPerson_`/`previewBubble_` 仍在、退回文字卡時會用到）：`dayPreview_` 讀 sync `data` 的 `plans[md]`（fallback `boards[md]`）→ 八人時段表(byTime，事件依時間)/當天流程(schedule 準則)/八人分工(byPerson，每人勤務) 三種預覽，塞進 bubble body（`rowTimeText_`/`rowPerson_`），底部「看完整」開 LIFF view。
- **代碼觸發改「開通編輯權限」**，回覆改「為您生成隨機碼：K-XXXX\n請貼給 {OWNER_NAME}」（屬性 `OWNER_NAME` 預設「旭辰」）；owner 打→「你已經有排班權限了」。
- **@提及/指令 回覆改「到底是哪裡有問題 🤨」** + quick reply（含「開通編輯權限」「關燈」）。
- **「關燈」→ 隨機抽班上一人 @他**：`members` 分頁被動認人（群組有人講話就 `getGroupMemberProfile` 記 uid↔顯示名，記過跳過不重打 API）；`lightsOut_` 從該群隨機抽、真 mention（`mentionees` index/length/userId）；`cleanName_`「261-05廖翊滕」→「廖翊滕」；沒認到人 fallback 純文字抽 `ROSTER`。
- 新屬性 `OWNER_NAME`；新分頁 `members`。stub 測 15 項（carousel 預覽/文案/關燈真 mention/認人/fallback）全過。

### (6) 追加優化（第三批）：群組安靜化＋行程 carousel 4 張＋準據原文上雲
> 這批動 `line_webhook.gs`（群組行為、carousel）＋`core.js`（準據原文上雲）。以下是**最終狀態**。

**A. 群組貼公版/準據一律安靜（`handleEvent_`）**
- 群組只提供「查詢資訊」；貼完整公版/行動準據時 bot 不回 Flex、也不存 inbox（避免洗版）。作法：`classifyText_` 判出 `gongban`/`guide` 後、編輯者檢查**之前**加 `if(isGroup) return;`。
- 要拿排班/上傳按鈕 → **私訊 bot**（一對一）貼公版，維持原本「編輯者給 Flex 按鈕、非編輯者提示拿代碼」。
- 查詢不受影響（`parseQuery_`/`answerQuery_` 更前面就攔截；`classifyText_` 只吃多行原文）。

**B. 行程 carousel 改 4 張（`carouselSchedule_`）**——使用者要「並排左右滑、不用上下滑長訊息，每張再連視覺化」
| 卡 | 標題 | 內容來源 | 底部按鈕 → LIFF |
|---|---|---|---|
| ① | 完整勤務 | `texts[md].filled`（填好名字的完整公版） | 視覺化呈現 → `view=C` |
| ② | 行動準據 | **班長準據原文**：`boards[md].schedule.raw` → `rawByType_`(inbox 私訊原文) → `guideText_`(重建) → 提示 | 視覺化呈現 → `view=A` |
| ③ | 個人分工 | `texts[md].persons` | 視覺化呈現 → `view=B` |
| ④ | 八人時段表 | 固定圖片（標題在上→圖在中→按鈕在下） | 看完整 → `view=C` |
- 前三張＝`textBubbleBtn_`（純文字卡＋按鈕）；第四張＝`imageBubble_`。**4 張一律 `mega`**。
- 圖片放 **body 的 image component**（`size:'70%' align:'center'`，比例 `543:1280 cover` 不裁切），**不是 hero**（hero 一定在最頂、標題會被壓下去）。想調大小改那個 `%`。
- 圖檔 `data/schedule8.jpg`（543×1280，**固定圖、非截圖**，GitHub Pages 服務 → 繞過 §7.6 圖床難題）。網址可用 Script Property **`SCHED_IMG_URL`** 覆蓋（即時生效不用重部署）；設 `none`/`off` 退回文字預覽卡（`previewBubble_`）。
- 新 webhook 函式：`fmtRange_`/`guideText_`/`rawByType_`/`textBubbleBtn_`/`imageBubble_`。

**C. ⚠️ core.js 補存「準據原文」上雲（動到同步層）**
- 問題：`texts` 沒有準據欄位、`slimBoards` 上雲又把 `schedule.raw` 丟掉 → 雲端沒有班長準據原文，bot 只拿得到解析後時間軸（lossy）。
- 修法：`slimBoards` 的 schedule 加 `raw:sc.raw||""`；`mergeBoards` 的 schedule.raw 改 `sc.raw||(loc…raw)||""`（**採合併勝方/雲端 raw**，別台上傳的準據原文也傳得過來）。**只加欄位、不動 ts 合併判斷**。
- 前提：準據要在 **v46 部署後**經 App/LIFF 貼過，`schedule.raw` 才會上雲；舊資料沒原文 → 卡②退回重建/提示。
- 驗證：parseGongban 逐字元等價＋slimBoards/mergeBoards roundtrip（raw 傳遞/保留）＋webhook 四卡＋群組路由回歸全過。

**D. 兩個踩過的坑（別再犯）**
- **carousel bubble 尺寸鐵則**：LINE 規定 carousel 裡**不能有 `giga`、且所有 bubble 必須同尺寸**，違反→整則 Flex 被打回 400、`reply_` 因 `muteHttpExceptions` 靜默吞掉→使用者端「打行程毫無反應」。曾把文字卡做 `giga`＋其餘 `kilo` 中這坑。**改卡片務必全部同尺寸、別用 giga。**
- **公版裡的衛哨不會覆蓋站哨分頁**：`parseGongban` 產生 `state.duties`、站哨在 `state.guard`，兩者分離；衛哨行（`🔵衛哨：`底下 `2402…`/日期範圍）本來就當 static、不產生勤務、不進統計（26 份真實公版驗過，含哨勤務＝0）。曾想加「衛哨區塊守衛」硬擋，但等價測試抓到會**誤吞**衛哨區塊後面接的 `打靶*10員：` 等正常勤務（那些沒有 🔷/🔵 標題分隔），故**不改 core.js**。

**部署**：改 `core.js`（含 B 的圖檔）→ 三檔一起上、`core.js?v=46`、**merge 到 main**（Pages 才有 `data/schedule8.jpg`，否則圖 404）；改 `line_webhook.gs` → **重新部署那份 Apps Script**（新版本）。

---

## 十一、測試與注意事項（通則）

> 註：本檔章節順序是「零→一~七→九→十→十一」（九/十/十一 是主結構完成後陸續追加的，編號照時間走、沒有第八節，別找）。

- **語法檢查**：`node --check core.js`；index/liff 的內嵌 script 抽出來各自 `node --check`（core.js 是主體，別忘了它）。
- **等價性測試**（動 core.js/index.html 必跑）：見第二節，證明主 App 行為不變。
- **liff 功能測**：node stub 帶 `?raw=` 假公版跑 解析→分配→發送(log 0→1)→buildFilled 含名字；另可用預裝 Chromium 實截清單/時間軸版面。
- **LINE 相關只能在手機 LINE App 內完整測**（sendMessages/getProfile 要真環境）；`.gs` 的 doGet 可在瀏覽器直接打網址測。
- 動同步／資料安全 → 永遠先讀 **v4 第七節**＋v8 第三、四節。
- 回應使用者提醒：三檔一起上傳、`?v=N` 避快取、工作分支要 merge 到 main、`.gs` 改了要重部署（新版本、網址不變）。
