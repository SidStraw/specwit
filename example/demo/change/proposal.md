# Proposal

## Why

提供可重跑的 OpenSpec＋gov CLI 示範，觀察規劃 ready、結果完整性與版本失效的差異。

## What Changes

- 建立可執行的簽到模型與兩項檢查，對照 request.md 的 R01／R02。
- 用缺少 pending guard 的反例驗證工具能報告失敗；修正後必須新建 Run。
- 完成位置為 LOCAL，只示範 Observe 與清理預覽。

## Capabilities

### New Capabilities

- `check-in-model`: pending 去重與回應 reward 的教學模型。

### Modified Capabilities

無。

## Impact

只操作 demo-output 中的新副本。沒有真實產品、人工核准、外部服務或發布操作。

## Sources

SRC-DEMO：request.md，demo-v1。來源與資源的 SHA-256 由示範腳本對實際檔案計算。
