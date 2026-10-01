# CLI 搭配示範的輸入

這是一個獨立的教學模型，用於展示 OpenSpec 規劃與 gov 執行檢查的分工，不代表原 daily-check-in 產品已實作或核准。

- R01：一次簽到回應仍 pending 時，重複 activate 只送出一筆請求。
- R02：成功回應前不進入 completed；reward 必須取自該次回應，至少用 7、23 兩組值驗證。
- 檢查移除 pending guard 的反例：舊結果應過期，新 Run 應觀察到兩筆請求並失敗。
- 此模型沒有 UI、網路、持久化與實際 server；不涵蓋原 daily-check-in 的 R01–R06 或 H01。
- 確認紀錄及 reviewer 回覆由示範腳本產生，僅是標示 synthetic 的流程 fixture，不是真人或模型的驗收。
