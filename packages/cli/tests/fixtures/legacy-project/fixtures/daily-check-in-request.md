# 每日簽到教學需求

版本：fixture-v1。這是展示 OpenSpec 配置的虛構輸入，並非產品事實、使用者核准或功能實作要求。

## R01 初始狀態

讀取 server 狀態後，AVAILABLE 顯示可操作的簽到按鈕，COMPLETED 顯示已完成且不可重複簽到。
讀取失敗時顯示可重試錯誤，不得猜測已完成。

## R02 Pending

送出 CheckIn 到收到回應期間停用按鈕；在同一次 pending 觀察窗內快速啟動兩次只發出一筆 CheckIn。
這個條件不保證後端 exactly-once，也不涵蓋多分頁或跨裝置。

## R03 成功

只有 CheckIn 回覆成功後才進入已完成狀態，依回應的 reward 顯示獎勵。

## R04 失敗

CheckIn 回覆 application error 或 transport error 時顯示可重試錯誤，整段過程都不得顯示簽到成功。

## R05 Reload

重新載入時以新的 server 狀態為準，不能因 localStorage 留下完成旗標就略過 server 回應。

## R06 Config

server config 的 reward 改變後，畫面與成功結果顯示相應值，不能固定寫死獎勵。

## 人工項目與未定資訊

H01：成功回饋是否清楚，交由人檢視可操作畫面；不在這份輸入假定動畫時間或視覺設計。
實際技術框架、route、DOM locator、HTTP/gRPC-web、fixture 格式與啟動指令均未提供。
教學示例採 LOCAL 完成；真實任務需另確認。沒有 push、PR、merge 或部署要求。
