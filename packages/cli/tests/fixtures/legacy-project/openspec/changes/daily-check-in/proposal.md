# Proposal

## Why

示範如何把每日簽到的來源需求整理成行為、專案接法、驗證契約及工作清單，保留所有未驗證事項。
這是一份尚未核准實作的教學 change；本目錄沒有簽到應用程式。

## Sources

- SRC-01：[教學需求](../../../fixtures/daily-check-in-request.md)，版本 fixture-v1，段落 R01–R06、H01。
- 原始輸入的 SHA-256 寫入 verification-contract.json；digest 只能辨識內容，不能證明有人核准。

## What Changes

建立每日簽到的行為提案，涵蓋初始狀態、pending、成功、失敗、reload 與 config。
不包含後端 exactly-once、多分頁同步或視覺動畫規格；這些邊界來自 SRC-01。

## Capabilities

### New Capabilities

- `daily-check-in`：使用者依 server 狀態簽到並收到正確回饋。

### Modified Capabilities

無。

## Discovery

example/ 已有 OpenSpec 與 OpenCode 流程檔，沒有應用程式、產品測試或 CI。
技術框架、transport、啟動方式、locator 均未提供；不能將本教學目錄上層的介紹網站當成簽到產品。

## Impact

目前只有規劃文件。真實接入時需要產品 repo 與 binding；測試工具、verifier 與 reviewer 尚未接上。

## Completion

- Task ID：daily-check-in。
- completion_target：LOCAL，僅教學假設，確認狀態 PENDING。
- 授權狀態：沒有真實產品實作或交付授權。
- Task 完成入口：NOT_IMPLEMENTED。
