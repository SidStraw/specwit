# SpecWit

[English](README.md)

SpecWit 由 SpecWitness 縮略而來，意為「規格的見證者」：對照規格觀察實際行為、提供驗證證據，並明確標示尚未確認的部分。

SpecWit 是可透過 npm 安裝的 OpenSpec 配套工具。`specwit init` 綁定已完成初始化的**本機 OpenSpec 專案**，安裝流程模板並合併設定；之後使用 `specwit validate` 檢查契約、`specwit verify` 執行 checks、`specwit status` 重新核對證據。

目前為 **Observe**，驗證報告均帶有 `eligible: false`。工具不驗證確認者身分、不提供 runner 隔離或不可變 Candidate、不啟動 reviewer、不發布 CI gate，也不執行 Task 明確完成或刪除資料。

## 安裝與初始化

需要 Node.js **22.18 以上**及另行安裝的 OpenSpec **>=1.14.0 <2.0.0**；實際整合驗證版本為 **1.14.0**，其餘 1.x 版本仍需相容性測試。SpecWit 不會代替你執行 `openspec init`。

npm 套件名稱為 `@sidtw/specwit`，CLI 指令為 `specwit`。npm 由維護者另行發布，發布後使用：

```sh
npm install -g @sidtw/specwit

# 在目標專案中，尚未設定 OpenSpec 時先執行：
openspec init
specwit init                         # 互動選語言，預設英文
specwit init --language zh-TW        # 選擇台灣繁體中文

# 完成 change 規劃與真實驗證輸入後：
specwit validate <change>
specwit verify <change>
specwit status <change>
```

尚未發布時，在本套件目錄執行 `npm install`、`npm run typecheck`、`npm test`、`npm pack`，再用 `npm install -g /absolute/path/to/sidtw-specwit-0.3.0.tgz` 安裝本機壓縮包。初始化、測試及打包均不會發布 npm。

`specwit init --language en` 可直接選英文；init 接受專案位置參數或 `--root`，`--json` 不詢問。升級既有專案前請閱讀[遷移說明](MIGRATION.zh-TW.md)。

初始化要求 `openspec/config.yaml` 有 schema，且 `openspec/specs`、`openspec/changes` 目錄存在；再用 OpenSpec 的版本與 root 唯讀查詢確認實際規劃位置。空資料夾、上層專案、外部 store、版本不符都在寫入前拒絕。這是可用設定檢查，不是歷史上的 init 操作收據；Git checkout 若缺少空目錄，可重跑 OpenSpec init。

優先尋找專案本地 OpenSpec npm 安裝，否則使用 PATH 的 openspec；`OPENSPEC_BIN` 可指定單一執行檔或 `.js`／`.mjs` 入口，不接受附帶參數的 shell 字串。Windows 若無法直接啟動全域 `.cmd`，使用專案本地 OpenSpec 或 JS 入口。目前自動安裝測試在 macOS 執行，Windows 程序回收能力有限。

## 安裝內容與語言

| 位置 | 內容 |
|---|---|
| `openspec/schemas/specwit/` | Schema 與六種規劃模板 |
| `.governance/config.json` | 語言、相容版本、原 schema 與受管檔案雜湊 |
| `.governance/workflow.md` | 完整流程提示 |
| `.governance/prompts/review.md` | 獨立 reviewer 提示詞 |
| `.governance/contracts/` | 驗證契約、runner、check 與 review 的 JSON Schemas |
| `.governance/runner.example.json` | 尚待替換 placeholder 的範例，不會自動執行 |

Init 將新 change 的預設 schema 改為 `specwit`，合併有明確界線的 context 與 apply／archive guidance，並在 `.gitignore` 加入 `.governance/runtime/`。保留既有 context、rules、guidance、註解、其他設定、Agent skills 與 changes，不寫產品程式或 AGENTS.md。既有 change 保持原 schema，不會被自動遷移。

英文為模板、schema instructions、流程與 review 提示詞的預設。選 `zh-TW` 會安裝對應繁中內容，但保留機器欄位、ID 與 OpenSpec 標題。CLI help、診斷訊息與錯誤碼採英文；init 完成說明使用選定語言。非互動重跑且省略語言時，沿用已安裝語言；`--json` 不詢問。

重跑具冪等性。切換語言或更新資源只替換未自行修改的受管檔案，不翻譯既有 change 產物。遇到本機修改或未受管的衝突檔案，寫入前回報衝突，沒有 `--force` 覆蓋；先備份並整合差異再重跑。自訂規則放在受管 context 區塊及 guidance 項目之外。修改同名 schema 仍會影響後續規劃，更新前要檢查進行中任務；原預設 schema 雖有記錄，不會自動還原。

## 指令與狀態

所有專案操作都要求先完成 `specwit init`；`--root` 預設目前目錄，不往上猜專案。契約與 review 引用相對於此 root。

| 指令 | 行為 |
|---|---|
| `specwit init [project] [--language en\|zh-TW]` | 檢查 OpenSpec 前提、安裝並合併設定 |
| `specwit validate <change>` | 唯讀檢查契約、資源、ID 覆蓋、digest、確認與 runner 準備狀態 |
| `specwit check <change>` | validate 的相容入口 |
| `specwit verify <change>` | 前置檢查通過後建立新 Run，執行真實 checks |
| `specwit verify <change> --run <uuid> --review review.json` | 匯入同一 Run 的外部 review envelope |
| `specwit status <change> [--run <uuid>]` | 重新核對目前輸入與指定／最新 Run |
| `specwit complete <change> --dry-run` | 只預覽任務專屬清理，不完成或刪除 |

皆支援 `--json`；help／version 不需要專案。Exit 0 表示初始化成功／不需變更、READY 或 Observe PASS；1 為必要 check FAIL；2 為阻擋、未知、未跑、過期或需外部處理；3 為用法、資料、IO、鎖或執行次數上限錯誤。Exit 0 不等於受保護驗收或發布授權。

`specwit validate` 不執行測試，也不取代 OpenSpec 的 spec 格式驗證；剛建立的空白契約刻意不會通過。READY 可以帶待處理人工項目，但 verify／status 要等必要人工項目接受後才可能 PASS。省略 complete 的 `--dry-run` 也不會刪除。

## 真實任務流程

1. 使用既有 OpenSpec Agent 規劃流程與 `specwit` schema，產生 proposal、specs、behavior-plan、design、verification-contract、tasks。需求標題採 `### Requirement: R01 - 名稱`，ID 在 change 內唯一。
2. 檢查真實實作與測試，補適用於 UI、API、library 或 job 的入口、介面、fixture 與觀察窗；優先重用有價值的檢查。
3. 補齊契約與真實 policy／binding／verifier 檔案、SHA-256、執行預算。現行契約版本為 `0.1`，保留讀取 `0.1-example` 的相容性；執行只支援 Observe。
4. 將 runner 範例複製到 `openspec/changes/<change>/runner.json`，換成真實設定，填入 `execution.runnerRef`。舊契約未填時沿用 `.governance/runner.json`；每個 change 獨立 runner 可減少任務間互相影響。
5. 執行 `specwit validate <change> --json`。格式完整的契約即使確認待處理，仍可取得真正 planDigest；先記錄摘要，取得適用確認後才引用真實來源與 confirmedPlanDigest，不自填核准。
6. 執行 verify，必要時匯入獨立 review，修改後以 status 核對。依安裝的 workflow 處理交付、CI 與明確完成界線。

Runner 的 inputs 明列產品、測試、fixture、設定與 lockfile，支援檔案／目錄而非 glob。命令採 argv 陣列，不經 shell；`$NODE` 使用目前 Node，工作目錄為專案 root，提供 SPECWIT_TASK_ID、SPECWIT_RUN_ID、SPECWIT_CHECK_ID 並繼承環境變數。

每個 check 的 stdout 只有一份 JSON，包含 schemaVersion: 1、checkId、PASS／FAIL／INCONCLUSIVE verdict 與非空 observations，日誌放 stderr。PASS 必須同時 exit 0；格式錯誤、錯 ID、timeout、無法啟動或退出碼衝突皆為 INCONCLUSIVE，不能只把 exit 0 包裝成固定成功。

stdout＋stderr 上限 256 KiB，不保存原始 stderr。每項 timeoutSeconds 為 1–3600 秒，maxAttempts 為 Task 累計 1–100 次，不自動重試或因計畫變更重設計數。

## Review 與資料生命週期

依安裝的 review prompt 取得 response，每個預期 criterion 恰有一筆。Unknown 的 confidence 為 null；其餘需 0–1 confidence 與 evidence ID，目前只接受同 Run 的 `check:<id>` observations。圖片、任意檔案或 trace 附件尚未支援。

呼叫端從實際 Run 取 taskId、runId、planDigest、candidateDigest，與 schemaVersion: 1、response 組成 envelope，再用 verify 的 --run／--review 匯入。格式見安裝的 JSON Schema。無效匯入也保留 attempt；最新無效結果不能退回沿用先前有效 review。Review 不能覆寫必要 check 失敗；PARTIAL 的人工部分須明列於 humanItems。

Runtime 位於 `.governance/runtime/<task>/<run-id>/run.json`，另有 latest.json 與 Task 鎖。取消後保留中斷 Run；POSIX 嘗試終止程序群組，Windows 只終止直接子程序，都不是完整隔離。手動移除遺留鎖前先確認程序已停止。

planDigest 包含規劃、來源、policy／binding／verifier、review schema 與 runner；排除確認／人工決策欄位和 tasks 勾選，避免循環摘要。candidateDigest 再包含原始契約、決策來源、宣告輸入與 Node 版本。單檔上限 16 MiB、輸入上限 10,000 檔、JSON／Run 上限 1 MiB；拒絕 symlink、專案外引用與 runtime 輸入，目錄掃描排除 .git、node_modules。

宣告輸入可能遺漏，前後雜湊無法偵測執行中修改後還原，同一使用者也能改本機紀錄。可信核准、受保護 runner／結果、不可變 snapshot、reviewer 啟動、CI publisher 與 finalizer 仍需外部能力。`specwit complete` 保持 BLOCKED_EXTERNAL，不刪除；archive 不等於明確完成。

## 開發與發布準備

本套件目錄可獨立使用，原始碼、雙語資源、fixtures 與測試不依賴上層官網或 example。執行依賴與資源打包成單一執行檔，使用一般 npm scripts；上層 workspace 也可用 pnpm 呼叫。發布包只含 dist、README、遷移及版本說明與授權資訊。

```sh
npm install
npm run typecheck
npm test
npm run test:openspec  # 需要真正的 OpenSpec 1.14.0 執行檔
npm pack
```

測試涵蓋前提拒絕、設定保留、語言切換、衝突、真實子程序、review／staleness、舊版遷移與 npm 壓縮包離線安裝，並直接執行安裝後的 `specwit`。壓縮包測試使用 OpenSpec discovery stub；`test:openspec` 另在暫存專案以真正的 OpenSpec 1.14.0 測試雙語初始化、schema 驗證、六份產物 instructions、operation guidance、既有 change 驗證、schema 遷移與冪等性，不修改目前專案。升級事項見 MIGRATION.zh-TW.md，版本紀錄見 CHANGELOG.md，發布由維護者另行處理。

採 MIT License；NOTICE 保留 OpenSpec 流程來源，dist/THIRD_PARTY_NOTICES.txt 包含打包依賴授權。
