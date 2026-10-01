# Behavior Plan

## Confirmation

PENDING。以下只將 SRC-01 整理成草稿，並未取得真實產品或行為計畫的人工確認。

## Requirement Coverage

| 來源 | 行為／人工項目 | Mode | Readiness | 限制 |
|---|---|---|---|---|
| SRC-01 R01 | B01 | PROGRAMMATIC | MISSING_BINDING | AVAILABLE、COMPLETED、讀取失敗各需 fixture |
| SRC-01 R02 | B02 | PROGRAMMATIC | MISSING_BINDING | 同一 pending 觀察窗，非後端 exactly-once |
| SRC-01 R03 | B03 | PROGRAMMATIC | MISSING_BINDING | 成功回應的實際編碼未知 |
| SRC-01 R04 | B04 | PROGRAMMATIC | MISSING_BINDING | 需觀察 transition，不能只看最後截圖 |
| SRC-01 R05 | B05 | PROGRAMMATIC | MISSING_BINDING | 需可控制 storage 與 server fixture |
| SRC-01 R06 | B06 | PROGRAMMATIC | MISSING_BINDING | 需可切換至少兩組 config |
| SRC-01 H01 | H01 | HUMAN_ONLY | WAITING_FOR_PREVIEW | 實際操作後確認回饋是否清楚；模型只提供參考 |

## Behaviors and Test Value

| 行為 | 輸入／觀察 | 會失敗的反例 | 增量價值 |
|---|---|---|---|
| B01 | 三組 GetStatus 結果與對應 CTA/error | 把 error 當 completed | 覆蓋 server 到 UI 的對應 |
| B02 | 延遲 CheckIn 回應，pending 內啟動兩次並計數 | pending 仍送出第二筆 request | 檢查使用者操作層的重複送出 |
| B03 | 控制成功回應時點與 reward，記錄狀態轉換 | 回應前樂觀顯示成功 | 驗證時序與回應資料 |
| B04 | application/transport error 的 transition trace | 短暫顯示成功後才切 error | 最後截圖看不到的錯誤 |
| B05 | 注入舊 localStorage，再重載並回覆 AVAILABLE | 用舊旗標略過 server | 驗證真實狀態來源 |
| B06 | 至少兩組不同 reward，逐組觀察 UI 與成功結果 | 固定寫死獎勵 | 與單一 fixture 相比能揭露 hardcode |

尚無產品測試可重用，未宣稱這六項都是必要新增測試。接入真實 repo 後先盤點既有檢查，逐項記錄新增價值與執行／維護成本，再確認計畫。

## Human Review and Unknowns

- H01 需人檢視可操作畫面；沒有 preview 時保持待處理。
- binding、verifier、環境、預算、實際測試命令均未定，B01–B06 尚未執行。
- 多分頁、跨裝置與後端 exactly-once 為來源明列的非目標；沒有額外排除來源需求。

## Confirmation Scope

需確認 R01–R06/H01 的理解、Project Binding、檢查價值、LOCAL 完成假設與交付範圍。
confirmation.sourceRef/confirmedPlanDigest 保持 null；教學文件不是核准來源。
