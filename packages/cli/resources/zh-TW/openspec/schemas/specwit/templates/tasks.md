# Tasks

## 1. Confirm and prepare

- [ ] 1.1 核對行為計畫、版本、確認來源與操作授權；引用真實來源，不自行填入核准。
- [ ] 1.2 補齊真實專案的 binding、既有檢查、verifier 與有限預算的 runner；使用 specwit validate <change> 找出剩餘缺口。
- [ ] 1.3 執行適用 baseline，分開既有失敗、新需求尚未實作與環境問題。

## 2. Implement with meaningful checks

- [ ] 2.1 依規格實作行為，在各功能工作中加入適用測試與文件；記錄行為 ID 與實際結果。大型變更應拆分此項。

## 3. Verify candidate

- [ ] 3.1 辨識實際 Candidate 與全部宣告輸入，記錄 digest 及限制；需要受保護凍結而能力不足時回報 BLOCKED_EXTERNAL。
- [ ] 3.2 執行 specwit verify <change>，核對全部預期 checks、scenarios 與 attempts；缺漏、未知、過期或無效證據都不能當成 PASS。
- [ ] 3.3 review.required 為 true 時，取得獨立結構化 review，匯入同一 Run 的 envelope，處理人工項目與 blocking findings；不需要 review 時記錄理由。

## 4. Deliver and explicitly complete

- [ ] 4.1 在既有授權內交付已驗版本並同步交付的 specs；CI 完成任務保留契約，等待 CI 對實際最終版本建立新 Run。
- [ ] 4.2 使用 specwit complete <change> --dry-run 檢視任務專屬清理範圍；明確完成與刪除仍需要外部 finalizer，缺少時保持未勾選並回報 BLOCKED_EXTERNAL，不能以 archive 代替。
