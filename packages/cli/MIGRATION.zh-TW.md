# 遷移至 SpecWit 0.3.0

[English](MIGRATION.md)

SpecWit 取代原本的 GOV 品牌。npm 套件由 `@gov/cli` 改為 `@sidtw/specwit`，CLI 由 `gov` 改為 `specwit`，建置入口由 `dist/gov.mjs` 改為 `dist/specwit.mjs`。新套件只提供新指令；請同步調整 npm scripts、CI 與 Agent 啟動指令。npm 發布由維護者另行處理。

```sh
npm install -g @sidtw/specwit
cd /path/to/project
specwit init
# 或直接選擇台灣繁體中文：
specwit init --language zh-TW
specwit validate <change>
specwit verify <change>
specwit status <change>
```

必須先在同一個專案完成 OpenSpec 初始化；已有可用設定時，不必為更名重新建立 OpenSpec。升級前先備份或提交專案設定，方便檢視差異。若原套件安裝在專案本地，請調整該依賴；安裝新套件不會自動移除舊套件。

## 設定與資料如何處理

| 項目 | 遷移方式 |
|---|---|
| 新專案 schema | 使用 `specwit`，安裝至 `openspec/schemas/specwit/`。 |
| 既有 `gov` schema | 原安裝 manifest 有記錄時，保留為相容 schema。只更新未自行修改的受管模板及提示詞，改用 `specwit` 指令；註冊名稱仍為 `gov`。 |
| 既有 changes | Init 不改 `.openspec.yaml`、proposal、specs、contract 或 tasks。原本的 `gov`、自訂 `governed-delivery` schema 不會被換掉。 |
| `.governance/` | 保留原路徑。這是治理資料目錄，契約、runner、runtime 與清理範圍引用維持有效。 |
| `.governance/config.json` | 沿用原 manifest 路徑與 `schemaVersion: 1`。`schema` 更新為 `specwit`、`toolVersion` 為 `0.3.0`，更新受管檔案雜湊；`previousSchema` 保留最初安裝前的預設值，不新增核准欄位。 |
| OpenSpec 設定 | 預設 schema 改為 `specwit`；以精確比對更新受管 `gov:context` 為 `specwit:context`，更新原有受管 operation guidance。其餘 context、rules、註解及 guidance 保留。 |
| Runner 環境變數 | 新檢查使用 `SPECWIT_TASK_ID`、`SPECWIT_RUN_ID`、`SPECWIT_CHECK_ID`；舊 `GOV_TASK_ID`、`GOV_RUN_ID`、`GOV_CHECK_ID` 保留為值相同的相容入口。 |
| 機器錯誤碼 | `GOV_NOT_INITIALIZED` 改為 `SPECWIT_NOT_INITIALIZED`；`INCOMPLETE_GOV_SETUP` 改為 `INCOMPLETE_SPECWIT_SETUP`。其餘驗證 issue codes、判定、退出碼意義與證據規則不變。 |

新 CLI 在遷移前也能讀取有效的 0.2.0 設定及既有 Run。Init 負責安裝新預設 schema 與提示，不搬移、刪除、重建或重新核准既有 Run、confirmation、來源與產品檔案。舊 0.1.0 沒有安裝 manifest：補齊 OpenSpec 設定後執行 `specwit init`，既有自訂 schema 與 changes 仍會保留。

## 衝突與驗證

Init 在寫入前比對受管檔案雜湊及完整 context／guidance。舊模板、自訂提示詞被修改，或出現重複／混用 context markers、新 schema 檔案衝突，都會停止且不部分遷移。沒有 force 覆蓋；先備份並整合回報的差異，再重跑。未列於舊 manifest 的 `gov` 目錄保持原樣；自訂 schema 若含舊指令，需自行檢視並改成 `specwit`。

重跑具冪等性。首次初始化預設英文；非互動升級省略 `--language` 時，沿用已儲存語言；互動初始化以原語言為預設選項。保留的受管相容模板會隨後續語言切換更新，既有 change 文件不會自動翻譯。

判定演算法與 digest 規則不變，舊證據在原輸入仍相符時可繼續使用。若契約明確將受管提示詞或模板納入雜湊，遷移更新其內容後，舊證據會依原有規則失效；需檢視變更並依既有流程重新確認、驗證，不能修改舊 Run 或 digest 來掩蓋差異。

目前仍為 Observe（`eligible: false`）。`validate` 不執行測試，`verify` 執行指定 checks，`complete` 只預覽清理並維持 `BLOCKED_EXTERNAL`。更名不新增隔離、身分核准、自動 reviewer、CI publisher 或 finalizer。

## 刻意保留的歷史名稱

舊名稱只保留於相容性與歷史追溯所需位置：本遷移說明、版本紀錄、相容常數與環境變數、固定的遷移 fixtures／測試、原始草稿及引用歷史標題的追溯表。已產生的示範 Run 屬於歷史證據，不改寫。新建置與 npm 壓縮包只提供 `specwit` 執行入口。
