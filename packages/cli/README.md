# gov CLI

用 TypeScript、minimist、Zod 與 Ajv 補上客製化 OpenSpec 的內容檢查、驗證執行、結果接收與版本有效性判斷。tsdown 將依賴包進 `dist/gov.mjs`；執行時只需 Node.js 22.18 以上。

目前為 **Observe 輔助工具**：所有報告都標示 `assurance: Observe`、`eligible: false`。可以執行真實的專案檢查，但不能由此宣稱受保護驗收或 Task 已完成。教學 change 仍維持未確認、未實作。

## 建置與安裝

在儲存庫根目錄執行：

```sh
pnpm install --frozen-lockfile
pnpm cli:typecheck
pnpm cli:test
pnpm cli:pack
node example/dist/gov.mjs check daily-check-in --root example --json
```

`cli:test` 先打包再執行測試，包含將單一執行檔複製到暫存目錄的獨立執行檢查。最後一行預期回傳 `BLOCKED`、exit code 2，列出教學 change 的真實缺口。這不是安裝失敗。

壓縮套件輸出到 `example/dist/gov-cli-0.1.0.tgz`，並將可直接執行的 `gov.mjs` 與第三方授權文件放入同一目錄。`pnpm example:demo` 可建置並執行 [OpenSpec 搭配示範](../../example/demo/README.md)，查看實際結果與故障注入效果。在要使用的專案安裝壓縮套件，再透過專案的 `pnpm exec gov` 使用，不必全域安裝：

```sh
pnpm add -D /absolute/path/to/gov-cli-0.1.0.tgz
pnpm exec gov check my-change --json
```

以下用 `gov` 表示已安裝的指令。`--root` 預設為目前工作目錄，不會向上猜測專案位置。所有契約引用與 `--review` 都是相對於此 root 的路徑。

## 指令

| 指令 | 行為 | 寫入 |
|---|---|---|
| `gov check <change>` | 檢查規劃檔案、契約、ID 覆蓋、來源 digest、確認紀錄與 runner 設定 | 無 |
| `gov verify <change>` | 前置檢查通過後建立新 Run，逐項執行 checks，保存結果與 digest | 此 Task 的 runtime |
| `gov verify <change> --run <uuid> --review review.json` | 匯入外部 review，驗證版本、schema、criterion 與 evidence 引用 | 追加 review attempt |
| `gov status <change> [--run <uuid>]` | 重新檢查目前輸入與指定／最新 Run，不沿用過期 PASS | 無 |
| `gov complete <change> --dry-run` | 預覽此 Task 的清理範圍，回報外部 finalizer 缺口 | 無；省略 `--dry-run` 也不刪除 |

皆支援 `--root <project>`、`--json`。`--help`、`--version` 顯示工具資訊。未知參數、重複的值參數、缺值或不適用的組合會報錯。沒有 approve、force、發布或實際刪除指令。

| Exit code | 意義 |
|---|---|
| 0 | 前置檢查 READY，或目前 Run 的 Observe 判斷 PASS |
| 1 | 必要 check 明確 FAIL |
| 2 | 阻擋、未執行、過期、不完整、未知或需要外部處理 |
| 3 | 指令用法、資料格式、IO、鎖或嘗試次數上限錯誤 |

`check` 的 READY 允許仍有待處理人工項目，會另外列在 `humanPending`；`verify/status` 則要等人工項目都有接受決策才可能 PASS。PARTIAL check 的人工部分必須明列於 `humanItems`。必要 review 的 `unknown`／`does_not_meet` 都會阻擋。選用 check 的 FAIL／INCONCLUSIVE 保留在結果內，不阻擋必要 checks 的通過。

## 接入專案

1. 沿用 [example](../../example/README.md) 的 OpenSpec schema 與契約。change 名稱使用 kebab-case；需求標題採 `### Requirement: R01 - 名稱`。CLI 接受契約版本 `0.1-example` 或 `0.1`，只執行 Observe。
2. 建立真實的 policy、binding、verifier 檔案，填入引用與 SHA-256；binding/verifier 設為 READY。補齊每個 check 的需求對照與 READY 狀態，以及執行限制。
3. 建立 `.governance/runner.json`。每個 expected check 恰有一個命令。`inputs` 列出所有會影響檢查的產品程式、測試、fixture、設定及依賴 lockfile；不支援 glob。
4. 執行 `gov check`，將輸出的 `planDigest` 記入契約。人工確認此版本後，才記錄 `confirmation.status`、真實確認來源 `sourceRef` 與同一個 `confirmedPlanDigest`。CLI 不替人產生核准。
5. 執行 `gov verify`，必要時匯入獨立 reviewer 的回覆，再用 `gov status` 檢查。變更計畫或 binding 要重新判定確認有效性；變更產品輸入要建立新 Run。

Runner 設定範例（檔案與命令需由真實專案提供）：

```json
{
  "schemaVersion": 1,
  "inputs": ["src", "tests", "scripts/gov-check.mjs", "package.json", "pnpm-lock.yaml"],
  "checks": [
    { "id": "B01", "command": ["$NODE", "scripts/gov-check.mjs", "B01"] }
  ]
}
```

argv 直接傳給程序，`shell: false`；不展開 `$VAR`、管線或 `&&`。唯一特殊值是命令首項 `$NODE`，代表目前 Node 執行檔。工作目錄是 root，繼承環境變數，並提供 `GOV_TASK_ID`、`GOV_RUN_ID`、`GOV_CHECK_ID`。這仍是執行專案程式，沒有 sandbox。

每個 check 的 stdout 必須只有一份 JSON；一般日誌請放 stderr。Adapter 必須根據實際測試結果產生觀察，不能把測試工具的 exit 0 直接包成固定 PASS：

```json
{
  "schemaVersion": 1,
  "checkId": "B01",
  "verdict": "FAIL",
  "observations": ["重複點擊期間送出了兩次請求；需求要求只送出一次。"]
}
```

`verdict` 為 PASS／FAIL／INCONCLUSIVE，observations 不可空白。PASS 必須搭配 exit 0；非零退出但聲稱 PASS、無效 JSON、錯誤 check ID、timeout 或程序啟動失敗皆為 INCONCLUSIVE。stdout＋stderr 上限 256 KiB，原始 stderr 不保存。

契約的 `execution.timeoutSeconds` 是每項 check 的秒數上限（1–3600）；`maxAttempts` 是此 Task 累計 Run 上限（1–100），不自動重試，也不因換計畫重設計數。提高上限需要修訂計畫並重新判定確認。`execution.candidate/runId` 為保留欄位，目前以 runtime 紀錄為準，CLI 不回寫契約。

## Review 與資料

外部 reviewer 先產生符合專案 JSON Schema 的 response，再由呼叫端放入 envelope。所有識別資料取自實際 `verify --json` 結果，不讓模型猜測：

```json
{
  "schemaVersion": 1,
  "taskId": "my-change",
  "runId": "填入實際 Run UUID",
  "planDigest": "填入實際 64 位十六進位摘要",
  "candidateDigest": "填入實際 64 位十六進位摘要",
  "response": {
    "schemaVersion": 1,
    "assessments": [{
      "criterionId": "implementation-risk",
      "verdict": "unknown",
      "confidence": null,
      "rationale": "觀察不足以判斷其他失敗情境。",
      "evidenceIds": ["check:B01"],
      "limitations": ["尚未取得其他必要情境的結果"]
    }]
  }
}
```

上例為格式說明，placeholder 不能直接匯入。必須涵蓋契約的全部 criteria、每項恰有一筆。`meets/does_not_meet` 要有 evidence 及 0–1 confidence；`unknown` 的 confidence 必須是 null。現階段 evidence 只支援該次 Run 的 `check:<id>` observations，尚未接圖片、trace 或任意附件。

無效匯入也追加 attempt，最新 attempt 無效時不能沿用上一筆有效 review；每次 `status` 重新判斷。這只驗證結構及引用，未驗證 reviewer 身分或判斷品質，也不會自動啟動模型。

資料存於 `.governance/runtime/<task>/<run-id>/run.json`，另有 `latest.json` 與操作期間的 `.lock`；應加入 `.gitignore`。一開始就更新 latest，因此中斷不會顯示先前 Run 的 PASS。Ctrl-C／SIGTERM 會取消當次執行並保留 INTERRUPTED。POSIX 系統嘗試終止該程序群組；Windows 只終止直接子程序，兩者都不是完整隔離或程序回收保證。異常結束留下鎖時，先確認原程序已停止，才手動移除該 Task 的 `.lock`。

`planDigest` 包含規劃內容、來源、policy/binding/verifier、review schema 與 runner 設定；排除確認／人工決策欄位及 `tasks.md` 勾選狀態，避免循環摘要。`candidateDigest` 再加上原始契約、確認／決策來源、宣告輸入與 Node 版本。即使未變更 Git commit，宣告範圍內的新增／變更檔案也會使舊結果 STALE。單檔上限 16 MiB、每個輸入最多 10,000 個檔案、JSON／Run 紀錄最多 1 MiB；排除 `.git`、`node_modules`，不接受 symlink 或專案外引用。

## 尚需補強

此版已提供 G02、G05、G06、G07 的部分機械檢查，以及 G10 的本機限制；完整對照見 [GAPS](../../example/GAPS.md)。下一步是接一個真實專案，驗證 binding 與檢查能抓到已知缺陷。

仍需外部提供：可驗身分的確認入口、受保護 runner／結果來源、不可變 Candidate、完整環境與 Git base 綁定、獨立 reviewer 啟動器、CI 新 Run／publisher，以及有資源所有權與交付版本核對的 finalizer。前後 digest 無法防止「執行中修改又還原」，宣告 inputs 也可能漏列；同一使用者可修改本機 runtime。這些界線未補齊前，PASS 只供 Observe，不得作為可信合併或發布許可。
