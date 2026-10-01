# Tasks

## 1. Confirm and prepare

- [ ] 1.1 核對 behavior-plan 與 verification-contract 的人工確認、版本與操作授權；以可核對來源為完成證據。
- [ ] 1.2 補齊並驗證 Project Binding、既有檢查與 verifier；記錄實際接法、限制及有限執行預算。
- [ ] 1.3 執行適用 baseline；分開既有失敗、新需求尚未實作及環境問題。

## 2. Implement with meaningful checks

- [ ] 2.1 依 R01–R06 實作簽到；功能工作內重用既有檢查或補 B01–B06 有價值的驗證，更新文件並記錄結果。

## 3. Verify candidate

- [ ] 3.1 由外部入口凍結 Candidate；記錄 base、程式及 plan/binding/policy/verifier 的實際 digest，缺能力為 BLOCKED_EXTERNAL。
- [ ] 3.2 外部 Gate A 核對全部 expectedChecks、attempts、結果與 Candidate；必要未知或漏跑不得勾選。
- [ ] 3.3 獨立 Gate B 回傳結構化評估；外部接收端驗證 schema、criterion 覆蓋、evidence 與版本；人工處置 blocking findings。

## 4. Deliver and explicitly complete

- [ ] 4.1 在既有交付授權內交付已驗版本；CI 任務保持 WAITING_FOR_CI，直到 CI 新 Run 驗證實際最終版本。
- [ ] 4.2 外部完成入口核對驗收、人工處置、交付與完成要求；停止 task-owned workers，明確清理任務資料並核對結果，缺 finalizer 為 BLOCKED_EXTERNAL。
