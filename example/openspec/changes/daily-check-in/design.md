# Design

## Observed Context

本目錄只有流程示例，沒有產品程式、測試或 CI。OpenSpec 可處理文件與指引；真實執行環境尚未存在。

## Decisions

- 優先重用實際 repo 的測試，再補外部 browser 觀察；暫不選定 Vue/React 或 HTTP/gRPC-web。
- 不加入常駐 daemon、遠端 evidence store 或永久完成索引。
- 只有 Observe 指引，未具備 Controlled 或 Certified candidate 的權限邊界。

## Project Binding

| 欄位 | 狀態 | 後續需要 |
|---|---|---|
| route、CTA 與狀態 locator | MISSING | 實際 UI 與穩定選取方式 |
| GetStatus / CheckIn transport | MISSING | 真實 API 契約、編碼與觀察方式 |
| AVAILABLE/COMPLETED/error/config fixtures | MISSING | 可重建且受控的輸入 |
| startup、readiness、timeout、pending window | MISSING | 在真實 repo 啟動並量測 |
| verifier pack 與 baseline checks | MISSING | 可信版本、預期 checks、既有測試盤點 |

## Verification and Trust Boundaries

外部 runner 應逐一驗證 B01–B06，結果至少分 PASS/FAIL/INCONCLUSIVE，漏跑另外記錄。
Writer 不應能改 verifier、reporter 或通過標準；本示例沒有建立這些權限限制。
Reviewer 需新 session、受控設定與唯讀材料；新 session 不等於隔離，需外部 launcher 與實測。
review-result.schema.json 只是回覆格式；criterion 覆蓋、引用存在與 Candidate 對應需接收端檢查。

## Delivery and Completion

LOCAL 是教學假設；沒有真實產品交付動作。若改為 CI，必須以同一 Task、新 Run 重驗最終版本。
規劃契約存在 openspec/changes/daily-check-in/，不在 .governance/tasks/ 再複製一份。
暫存輸出預定使用 .governance/runtime/daily-check-in/<run-id>/，目前不建立假 evidence。
完成前先保存需要交付的正式 specs/程式/測試；finalizer 核對後才清除 task-owned 資料。
OpenSpec archive 保留 change，不能替代 finalizer。CI/Git/離線本機清理仍對應 D16 未決事項。

## Risks and Blocking Questions

實際專案、binding、人確認、受保護 verifier、reviewer launcher、結果接收端與 finalizer 均缺少。
這些缺口不可由自填 PASS、勾選 tasks 或執行 archive 消除。
