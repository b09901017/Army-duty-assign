# docs — 說明文件

- `roster.txt`：班級名冊（代號 = 本名）。
- `duty-rules.md`：填公版的規則（給 AI 看的指示）。
- `handover_v1~v10.md`：歷次交接說明，**v10 為最新**，改 App 前先讀 v10（再視需要回頭讀 v9 的結構說明）。
  - **v10**：自動排班 9 項優化（衝突判斷改用 `tlFreeAt` 真實分鐘重疊、打飯/站哨/大小公差/處理順序/分菜標題幽靈人…）＋ LINE bot 優化（長文字截斷、@提及不蓋掉指令、syncData 記憶、`_log` 分頁、分頁上限）。
  - **v9**：★重大改動★ 抽出 `core.js`（index.html 只剩外殼）＋ 串接 LINE/LIFF（新增 `liff.html`、`line_webhook.gs`）。**檔案結構變了，改東西前務必先看。**
  - v8：資料同步 bug 修復＋「動到資料就要能同步」四步檢查清單。
  - v6：時間軸；v7：站哨多週／跨夜哨／解析自動填名字。
  - **v4 第七節**：資料模型／同步安全的底層權威版（逐日合併＋墓碑＋pull過才准push），改同步前必讀，v5~v9 都沒動它。
- `line-liff-plan.md`：LINE/LIFF 串接完整規劃書（架構、LINE 後台每一步、里程碑進度）。
- `line-qa.md`：LINE 串接施工過程值得記住的問答（架構決策、Apps Script 部署踩坑、LIFF 眉角）。
