# Daily Check-in Spec Delta

## Purpose

提供依 server 狀態執行每日簽到的可觀察行為契約，涵蓋載入、重複操作、成功與錯誤回饋、重新載入及設定變動，供工程師確認需求理解並對應實際專案的驗證方式。本文件是教學提案，尚未實作。

## ADDED Requirements

### Requirement: R01 - Server-driven initial state

The system SHALL 依 server 狀態提供簽到操作，讀取失敗時提供可重試錯誤。

#### Scenario: Available

- **WHEN** server 回覆 AVAILABLE
- **THEN** 畫面顯示可操作的簽到按鈕

#### Scenario: Already completed

- **WHEN** server 回覆 COMPLETED
- **THEN** 畫面顯示已完成且停用簽到

#### Scenario: Status read failed

- **WHEN** 狀態讀取失敗
- **THEN** 顯示可重試錯誤，且不得自行顯示已完成

### Requirement: R02 - No duplicate request while pending

The system SHALL 在單次 CheckIn pending 期間停用按鈕，且重複啟動不增加 CheckIn request。

#### Scenario: Repeated activation

- **WHEN** 第一次 CheckIn 尚未回應且使用者快速啟動兩次
- **THEN** 按鈕在 pending 期間停用，且觀察到的 CheckIn request 總數為一筆

### Requirement: R03 - Success follows response

The system SHALL 在 CheckIn 成功回應後才顯示已完成，並顯示回應的 reward。

#### Scenario: Successful response

- **WHEN** CheckIn 回覆成功與 reward 值
- **THEN** 畫面進入已完成並顯示該 reward，回應前不得先顯示成功

### Requirement: R04 - Errors never appear as success

The system SHALL 在 CheckIn 失敗時顯示可重試錯誤，失敗流程不得顯示成功。

#### Scenario: Application error

- **WHEN** CheckIn 回覆 application error
- **THEN** 顯示可重試錯誤，整段流程沒有成功狀態

#### Scenario: Transport error

- **WHEN** CheckIn 發生 transport error
- **THEN** 顯示可重試錯誤，整段流程沒有成功狀態

### Requirement: R05 - Reload respects server

The system SHALL 在重新載入後依新的 server 狀態呈現結果。

#### Scenario: Stale local completion flag

- **WHEN** localStorage 有完成旗標，但重新載入後 server 回覆 AVAILABLE
- **THEN** 畫面顯示可簽到，不使用舊旗標覆蓋 server 回應

### Requirement: R06 - Reward follows configuration

The system SHALL 依 server config 與成功回應顯示獎勵值。

#### Scenario: Changed reward

- **WHEN** 兩組情境分別使用不同 reward config，且各自成功回應相同的對應值
- **THEN** 每組畫面與成功結果均顯示該組值，而非固定常數
