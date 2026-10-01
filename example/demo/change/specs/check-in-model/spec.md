# Check-in Model Spec Delta

## Purpose

在不連接真實產品、瀏覽器或網路服務的條件下，提供可觀察的簽到模型契約，讓使用者直接比較 OpenSpec 的規劃產物狀態與 gov 對實際行為、必要 review 及版本有效性的判斷。

## ADDED Requirements

### Requirement: R01 - One request while pending

The model SHALL 在一次 activate 尚未取得回應時忽略重複 activate，且只呼叫 sendRequest 一次。

#### Scenario: Repeated activation

- **WHEN** 連續啟動兩次 activate，且第一筆回應仍未完成
- **THEN** 實際 sendRequest 呼叫數為一，state.pending 為 true，state.completed 為 false

### Requirement: R02 - Reward follows the response

The model SHALL 在取得成功回應後才進入 completed，且 reward 使用該次回應值。

#### Scenario: Two reward configurations

- **WHEN** 分別以 reward 7 與 23 進行兩個獨立情境
- **THEN** 各情境回應前不 completed 且 reward 為 null，回應後 completed 並得到對應的 reward
