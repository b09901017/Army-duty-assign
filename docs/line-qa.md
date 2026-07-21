# LINE 串接 Q&A — 施工過程值得記住的問答

> 這是使用者在做 LINE/LIFF 串接時問過、值得留存的問題與結論。
> 給下一個接手的 AI，也給使用者自己回頭查。技術細節看 `handover_v9.md` 與 `line-liff-plan.md`。

---

## 架構決策

### Q：這件事該在原本的 repo 做，還是新開一個 repo？GitHub Pages 不是只給一個網址嗎？
**A：同一個 repo，開新網頁檔就好，不用新 repo、也不會覆蓋原本的 app。**
GitHub Pages 一個 repo ≠ 一個網址——它把整個 repo 當網站發佈，**每個檔案都有自己的網址**：
- `帳號.github.io/Army-duty-assign/` → `index.html`（原本的 app，不動）
- `帳號.github.io/Army-duty-assign/liff.html` → LINE 用的精簡頁（新檔）

同一次 push、同一個部署，兩頁並存互不干擾。

### Q：後端要用 Firebase 比較好嗎？
**A：這個案子用 Apps Script 就好，不建議換 Firebase。** Firebase 技術上更強（即時同步、並發寫入、無單格上限），但對 8 人的板子是殺雞用牛刀，且踩兩個雷：
1. **LINE webhook 要對外呼叫 LINE API → Firebase Cloud Functions 得升級付費的 Blaze 方案（綁卡）**；Apps Script 做 webhook＋呼叫 LINE 完全免費。
2. 換 Firebase＝把 v4 血淚換來的同步核心（逐日合併＋墓碑＋pull過才准push）**整個重寫**，剛好動在最危險的地方。
→ 用 Apps Script 接 LINE，同步核心一行不用動。真的哪天被輪詢慢/並發撞資料弄到很痛，再單獨把「同步層」搬 Firestore，那是另一個獨立專案，跟 LINE 不綁在一起。

### Q：同一天傳很多次會重複計入統計嗎？
**A：不會，同一天只算一次、後蓋前。** `commit()` 用 `b_+日期` 當 log id，push 前先濾掉同一天的舊排班板紀錄再放新的；`getHistory()` 統計時也依「天」去重只留最新一筆。（`x_` 開頭的臨時行程另計、不受影響。）

### Q：liff.html 怎麼「共用」原本的邏輯，不會維護時走鐘？
**A：把邏輯層抽成 `core.js`，index.html 和 liff.html 都 `<script src>` 它。** 邏輯只有一份，改一處兩邊生效。連事件層（handle/onInput/onClick）都在 core.js；每頁只寫自己的 `render()`。詳見 handover_v9 第一、二節。

---

## LINE / Apps Script 後台操作

### Q：「新開一份 Apps Script」是指在同一個試算表的 Apps Script 裡多加一個 .gs 檔嗎？
**A：不是，是另外開一個「獨立的 Apps Script 專案」。**
一個 Apps Script 專案**只能有一個 `doGet`、一個 `doPost`**。管資料的 `sync_AppsScript.gs` 已經用掉了，同專案再加 webhook 會撞名衝突。
- 開法：**script.google.com → 新專案**（不是從試算表「擴充功能→Apps Script」進去，那會開到綁定的舊專案）。
- 它照樣能存同一份試算表：用 `SpreadsheetApp.openById(SHEET_ID)`（所以 Script Properties 要填 `SHEET_ID`）。

### Q：怎麼找 SHEET_ID？
試算表網址 `https://docs.google.com/spreadsheets/d/【這串】/edit`，`/d/` 和 `/edit` 中間那串就是。**要填「試算表」的 ID，不是 Apps Script 專案的 ID。**

### Q：部署 Web App 時第六步「授權」沒跳出來/失敗怎麼辦？
先在編輯器裡**手動執行一個會碰到試算表的函式**（如 `inbox_`）強制觸發授權：函式下拉選 → ▷ 執行 → 需要授權 → 檢查權限 → 選帳號 → **進階 → 前往「專案名稱」(不安全) → 允許**。
- 沒跳授權視窗＝彈窗被擋（換無痕/別的瀏覽器）。
- 只有「已封鎖、沒有『進階』可點」＝受管理的公司/學校 Google 帳號政策擋掉未驗證 App，換一般 Gmail 建。
- 驗證成功的鐵證：打 `doGet?key=test123` 後試算表出現 `inbox` 分頁。（打沒帶 key 的 doGet 只回 alive、不碰試算表，所以不會建 inbox、也不需授權。）

### Q：/exec 打開顯示「很抱歉，目前無法開啟這個檔案，請檢查網址」？
代表這條網址背後**沒有有效的網頁應用程式部署**（不是權限問題——權限問題會顯示登入頁）。多半是新增部署時**沒按齒輪選「網頁應用程式」類型**，或授權沒過。重新部署一次即可。注意「新增部署作業」會產生**新網址**（要同步更新 liff.html 的 `GONGBAN_FETCH_URL` 與 LINE 的 Webhook URL）；「編輯現有部署→新版本」則網址不變。

### Q：傳「whoami」給 bot 都沒回應？
按順序查：① Script Properties 沒設 `CHANNEL_TOKEN`（沒鑰匙就回不了，最常見）② LINE Developers → Messaging API 的 Webhook URL 沒填 / Verify 沒過 / Use webhook 沒開 ③ LINE Official Account Manager 的「回應設定」→ Webhook 要啟用、自動回應要停用（不然官方帳號搶著自動回，你的程式收不到）。

### Q：LIFF 底下怎麼跑出兩個 channel（LINE Login＋Messaging API）？
LINE 平台自動生的。**只管 Messaging API 那個**（bot 本體、webhook、LIFF、token 都在它底下）；LINE Login 是平台代管 `liff.getProfile()` 授權用的，不用點進去設定，它的「Developing」狀態不影響任何事。

---

## 踩過的坑（結論）

| 症狀 | 根因 | 解法 |
|---|---|---|
| 點「排班」按鈕 404 | ① Pages 網址大小寫錯（repo 是 `Army-duty-assign` 大寫A）② 檔案還在工作分支沒進 main | ① Endpoint URL 用正確大小寫 ② merge 到 main |
| 發送後只停在「已更新統計與行程」不動 | `liff.sendMessages` 前的 `liff.isApiAvailable("sendMessages")` 直接丟 `unexpected api name` 例外，讓後面靜默中斷 | 拿掉 isApiAvailable 門檻，直接 try/catch 呼叫 sendMessages，失敗退回複製 |
| 發送有計入統計但沒回聊天室 | 同上，或 LIFF 缺 `chat_message.write` scope / Bot link 沒開 | 補 scope＋Add friend option On；程式端已改成失敗會顯示原因 |

**教訓：LIFF 的 `isApiAvailable(名稱)` 在某些 SDK 版本會對未知字串丟例外而非回 false——別拿它當功能偵測的門檻，直接 try/catch 呼叫目標 API 比較穩。**

---

## 公版 vs 行動準據 / 上傳與查詢

### Q：bot 怎麼分辨我傳的是「公版」還是「行動準據」？
`classifyText_`（line_webhook.gs）：
- 含 `🔷` 區塊、或標題含「勤務」 → **公版**（duty-template）。
- 標題含「行動準據/準則」、或（沒標題時）大量「HHMM 事件」時間軸行＋圓圈數字＋起床/升旗/用餐/打飯作業等關鍵字計分 → **行動準據**（action-guide）。
- 用 `data/` 底下 26 個真實範例測，26/26 全對。改判斷邏輯前先跑這個回歸。

### Q：傳行動準據給 bot 會發生什麼？跟公版有何不同？
- **公版** → Flex「排 X/X 的班」→ 進 LIFF **排班**（排完發送回聊天室）。
- **行動準據** → Flex「上傳 X/X 準據」→ 進 LIFF **只做上傳**（解析日期→存進雲端 `boards[日期].schedule`）。上傳後你用主 App 打開那天，準據就在了，不用再複製貼上。
- 上傳準據**只改那天的 schedule 欄位、保留既有排班 duties**，且**一定先 pull 過雲端**才上傳（否則會用空的覆蓋掉已排勤務）。

### Q：為什麼上傳過去日期要我確認？
班長有時會把日期打錯（傳成昨天或更早）。若直接上傳會**覆蓋掉雲端那天既有的排班/準據**。所以：今天/明天/未來 → 直接放行；昨天以前 → 跳確認再覆蓋。公版發送、準據上傳都一樣。

### Q：「7/21 公版」「分工」這種查詢怎麼運作？
webhook 的 `tryQuery_` 認出單行含「公版/分工」的訊息（多行的原文不算），去讀 sync 試算表 `data` 分頁的分片 JSON 裡的 `texts[日期]`，回你存好的字串。**前提**：那天要先在 App 排好、按過「發送/計入」才會有（`texts` 是 commit 時才寫的）。沒有就回「還沒有那天的資料」。
