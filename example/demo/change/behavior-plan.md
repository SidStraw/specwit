# Behavior Plan

## Scope and Coverage

這是 request.md 的 CLI 教學切片；不縮減或替代原 daily-check-in 的產品規格。

| 需求 | Check | Mode | 觀察 | 反例與增量價值 |
|---|---|---|---|---|
| R01 | B01 | PROGRAMMATIC | pending 內重複 activate 的實際請求數 | 移除 guard 會產生兩筆，可直接證明失敗偵測有效 |
| R02 | B02 | PROGRAMMATIC | 回應前後 state 及兩組 reward | 回應前 completed 或 reward 寫死都會失敗 |

## Confirmation

示範腳本在新副本中建立明確標示 synthetic 的確認紀錄，綁定實際 planDigest。此紀錄不是人的授權；不得移用至真實任務。

## Review and Limits

必要 criterion 為 demo-evidence，review 回覆同樣是 synthetic fixture，只示範接收端是否拒絕錯誤引用。沒有 UI，因此此獨立模型沒有人工視覺項目。所有結果均為 Observe，eligible=false。
