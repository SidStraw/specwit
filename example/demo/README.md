# OpenSpec＋SpecWit 可執行示範

這個小型 Node.js 簽到模型，讓你看到規劃與執行檢查搭配後的效果。它沒有瀏覽器或真實 API，不是 daily-check-in 產品的實作。

從 example 目錄執行 `node scripts/demo.mjs`。腳本使用 `dist/specwit.mjs`，每次在 `demo-output/run-XXXXXX/project/` 建立新副本；原始教學 change 與這份示範來源不會被修改。沒有打包輸出時，先在儲存庫根目錄執行 `pnpm cli:pack`，或用 `pnpm example:demo` 一次建置並展示。

需求：Node.js 22.18 以上、PATH 中有 OpenSpec 1.14.0。`OPENSPEC_BIN` 可指定 OpenSpec 執行檔路徑。執行示範不需要安裝 npm 依賴，也不連接模型或產品服務。

## 搭配的方式

| 部分 | 本例負責什麼 | 原始位置 |
|---|---|---|
| OpenSpec | proposal → specs → behavior-plan → design → verification-contract → tasks | `change/`；執行時放入 `openspec/changes/check-in-cli-demo/` |
| Project Binding | 指出模型 API、觀察位置與 Promise fixture | `governance/binding.json` |
| Runner 設定 | 宣告輸入與每個 check 的 argv 命令 | `governance/runner.json`；執行時放入 `.governance/` |
| 待驗程式 | pending 去重、完成時點及 reward | `src/check-in.mjs` |
| 檢查程式 | 匯入真正模組、執行兩項情境並輸出觀察值 | `checks/check-in.mjs` |
| specwit | 檢查契約、執行命令、驗證回覆、計算版本有效性 | 使用 example 內的 `dist/specwit.mjs` |
| 示範驅動腳本 | 建立新副本、計算摘要、注入缺陷、比對結果、產生報告 | example 的 `scripts/demo.mjs` |

示範副本使用與 example 相同的 `governed-delivery` schema，另外建立範圍明確的兩條模型需求。沒有把原產品六條需求改成只剩兩條。

確認紀錄及 review 都是明確標示 synthetic 的 fixture，只用來走過驗證分支。檢查程式則確實執行模型，不輸出寫死的 PASS。`specwit validate` 對 policy/binding 目前只核對存在及 digest，接法是否正確仍由讀程式與實際檢查判斷。

## 會看到的效果

| 情境 | OpenSpec | specwit |
|---|---|---|
| 原教學 change 未確認、未接 runner | 六個 artifact done、apply ready | BLOCKED |
| 模型接法與 synthetic 確認齊全 | 規劃 ready | check READY |
| 模型程式正確，必要 review 尚缺 | 不執行 check | B01/B02 PASS，整體 BLOCKED |
| review 引用不存在的 check | 不驗證此 JSON 的業務內容 | UNKNOWN_EVIDENCE，BLOCKED |
| synthetic review 引用正確 Run | 規劃狀態不變 | Observe PASS、eligible=false |
| 移除 pending guard | artifact 仍 done、apply ready | status STALE；新 verify 觀察到兩筆請求，FAIL |
| 還原 guard 並重新驗證 | 規劃狀態不變 | 新 Run 需要自己的 review，匯入後 PASS |
| 要求完成清理 | archive 是另一種封存操作 | complete 只預覽，BLOCKED_EXTERNAL |

完整結果保存在每次 session 的 `RESULTS.md`、`results.json` 與 `steps/*.json`。報告有實際命令、exit code、所有 Run 的路徑，以及可直接複製的手動指令。`demo-output/RESULTS.md` 連到最新一份。

## 接著自己操作

報告最後留下修正後的程式、三個獨立 Run 與一個目前有效的 Observe PASS。使用報告中的 `cd` 進入產生的專案後：

1. 用 `openspec status --change check-in-cli-demo` 查看六個規劃 artifact。
2. 以報告中的 specwit 執行檔路徑執行 `status check-in-cli-demo`，查看當前有效結果。
3. 編輯該副本的 `src/check-in.mjs`，把 `if (pending || completed)` 改成 `if (completed)`。
4. 再跑 `status`，會得到 STALE；跑 `verify`，會建立新 Run 並回報 B01 FAIL。
5. 還原程式再 `verify`，兩個 checks 會 PASS，但整體仍等待此新 Run 的 review。不要直接沿用其他 Run 的 review envelope。

每次完整示範都用新目錄，不重設你已編輯的副本。`demo-output/` 與 `dist/` 是 gitignored 的本機產物；原始模板與腳本有納入版本控制。specwit 不會因示範跑完就刪除專案；不需要的示範目錄可自行刪除。

SpecWit 0.3.0，示範會先在獨立副本完成 `specwit init --language zh-TW`；模型專案也會先實際執行 OpenSpec init。原教學 change 不變。一般專案改用 [通用 npm 套件](../../packages/cli/README.zh-TW.md) 安裝，不複製 demo 資料。
