# SpecWit 流程

SpecWit 擴充已初始化的本機 OpenSpec 專案，提供規劃模板與 Observe 驗證工具。它不授予操作權限、不隔離程式、不啟動 reviewer、不發布 CI 結果，也不執行 Task 明確完成。

## 使用 OpenSpec 規劃

透過既有 OpenSpec 規劃流程選用 `specwit` schema。先檢查真實專案，再依 proposal → specs → behavior-plan → design → verification-contract → tasks 建立產物。Design 必填但可簡短；來源覆蓋、實作決策與驗證策略各自放在對應文件，避免重複敘述。

需求標題使用 `### Requirement: ID - 名稱`，ID 在同一 change 內不可重複。保留標準 OpenSpec delta／scenario 格式，修改既有能力時保留完整 requirement 區塊。純文件變更應選適用的輕量 schema，不捏造行為需求。

每條來源需求都對應行為、人工項目、待澄清或明確排除。各行為交代可觀察結果、應該失敗的反例、可重用檢查、增量證據與成本。分開 PROGRAMMATIC／PARTIAL／HUMAN_ONLY 與準備狀態，缺少自動化仍是缺口；一項 check 涵蓋多個 scenario 時須逐一說明。

## 接上真實專案

記錄適合專案的入口、公開介面、fixture、啟動／ready 條件與觀察窗。UI route／locator 是範例，API／library／job 不必填不相關的 UI 欄位。未知事實填 MISSING 或 unknown。

建立真實 policy、binding 與 verifier 檔案，在 verification contract 引用專案相對路徑及 SHA-256。以 `.governance/contracts/verification-contract.schema.json` 核對完整契約；模板只是未完成草稿，不是可執行或已核准的契約。

將 `.governance/runner.example.json` 複製至 `openspec/changes/<change>/runner.json`，以真實檢查替換全部 placeholder，並將 `execution.runnerRef` 指向此檔。舊契約未提供 runnerRef 時使用 `.governance/runner.json`。每個 change 使用各自 runner，可避免不同任務互相改動同一份設定。`inputs` 明列相關產品程式、檢查腳本、fixture、設定與相依 lockfile，只接受檔案／目錄，不支援 glob；不要將 openspec 或 runtime 列為產品輸入。

Runner 命令使用 argv 陣列，不經 shell；`$NODE` 代表 SpecWit 使用的 Node 執行檔。每個預期 check 恰有一個命令，stdout 只能輸出一份符合 `.governance/contracts/check-output.schema.json` 的 JSON，日誌放 stderr。回報實際觀察，不把 exit 0 包裝成固定 PASS。PASS 同時要求 exit 0；格式錯誤、timeout 或無法啟動皆為 INCONCLUSIVE。執行命令不代表已有 sandbox。

## 確認與檢查

執行 `specwit validate <change> --json`，檢查契約格式、資源、需求／check 覆蓋、digest、確認與 runner 準備狀態，不執行 checks。格式完整但仍阻擋的契約，也會回報實際算出的 `planDigest`，可將它填入契約。取得真實且適用的確認後，才填 `confirmation.sourceRef`、`status: CONFIRMED` 與相同的 `confirmedPlanDigest`。不捏造核准、身分、雜湊或測試結果；不因換 session 就重複要求已有且仍有效的授權。

`specwit validate` 是 SpecWit 的內容與前置檢查，不取代 OpenSpec 的 delta spec 格式驗證；規劃產物應兩者都核對。READY 僅代表可執行 Observe，不是可信核准或 Task 完成；此時人工項目可以待處理，會另外列出。

## 實作、驗證與 review

變更前執行適用 baseline，分開既有失敗、新行為尚未實作與環境問題。依範圍實作，將有價值的檢查與文件放在對應功能工作內。

使用 `specwit verify <change> --json` 建立新 Run 並執行 checks；修改後用 `specwit status <change> --json` 重新判斷證據。即使 Git commit 未變，宣告輸入新增、修改或刪除仍可使舊結果 STALE。計畫輸入改變時重新核對確認；保留失敗 Run 與 review attempts，不以成功聲明覆寫。

`review.required` 為 true 時，以 `.governance/prompts/review.md` 取得獨立評估。SpecWit 不啟動或隔離模型。以 envelope 包裝 response，執行 `specwit verify <change> --run <run-id> --review <專案相對路徑.json>` 匯入；run ID 與 digest 來自真實報告，不能讓模型猜。每個 criterion 恰有一筆，evidence ID 目前只支援同一 Run 的 `check:<id>` observations。Confidence 是模型自報，不能覆寫失敗檢查；人工項目需有真實決策來源。

必要結果仍有效、必要 review 與人工項目均已處理後，才可能 PASS。缺漏、未知、INCONCLUSIVE、STALE 或 INVALID 都不能代表接受。全部報告維持 `assurance: Observe` 與 `eligible: false`；前後雜湊不是不可變 snapshot，同一使用者仍可修改本機紀錄。

## 交付與明確完成

Task、Run、Agent session 與 process 是不同生命週期。交付只在既有授權內進行，保留交付程式、測試與正式 specs；需要同步的 spec delta 應納入實際最終版本核對。CompletionTarget 為 CI 時，CI 對實際版本建立新 Run，並另行明確完成；本機 PASS 不代表完成。SpecWit 不安裝 CI workflow 或 publisher。

`specwit complete <change> --dry-run` 只預覽任務專屬路徑，實際 finalization 與清理未實作，維持 BLOCKED_EXTERNAL。不因預覽、測試或 session 結束，就勾選完成任務、刪除資源或宣稱 Task 完成。Archive 保留 change，不能代替 finalizer。目標清理政策是在明確完成後只移除任務專屬資料，保留產品成果、共用規則、其他任務及既有使用者 session。清理改變 Git 版本後的重驗與離線副本清理仍需外部生命週期設計。

## 維護安裝內容

`specwit init --language en` 或 `specwit init --language zh-TW` 可更新未自行修改的受管資源，保留既有 change 產物與 OpenSpec 生成的 skills。非互動模式省略語言時沿用已安裝語言。受管檔案有本機修改時回報衝突，不覆蓋；更新前先備份並整合修改。原預設 schema 與資源雜湊存在 `.governance/config.json`，屬於安裝資料，不是核准證據。Runtime 資料加入 gitignore。
