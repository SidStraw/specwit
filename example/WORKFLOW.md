# 流程與操作契約

此文件與 config/schema 一起提供流程指引。OpenSpec CLI 不會執行這裡描述的外部能力；另有 [SpecWit CLI](../packages/cli/README.md) 提供 Observe 模式的前置檢查、runner、結果接收與狀態判斷。受保護驗收與 finalizer 仍未實作，實際缺口見 [GAPS.md](GAPS.md)。

在這份 example 中，已打包的入口是 `node dist/specwit.mjs`；下文的 `specwit` 可直接換成此入口。先執行 `node scripts/demo.mjs` 可看到 [完整搭配示範](demo/README.md) 與 [本機實際結果](demo-output/RESULTS.md)。OpenCode 的 apply guidance 也會提示使用此入口，但仍由 Agent 呼叫，不會因 OpenSpec ready 而自動執行。

## 1. 規劃與來源

在 OpenCode 使用 `/opsx-propose` 提出真實任務，或由 Agent 依 `openspec status` / `openspec instructions` 逐一產生規劃文件。

| 產物 | 應記錄的資訊 | 對應原規格 |
|---|---|---|
| proposal | 來源版本、scope、discovery、LOCAL／CI、操作範圍 | [§4 Intake／Discovery](../docs/specification.md#s4) |
| specs | 穩定 requirement ID 與可觀察情境 | [§6 需求完整性](../docs/specification.md#s6) |
| behavior-plan | 每條來源的去向、驗證分類、反例、成本與人工項目 | [§6、§7.1.1](../docs/specification.md#test-value) |
| design | route、locator、transport、fixture、startup、觀察窗與權限邊界 | [§3、§6.4](../docs/specification.md#s3) |
| verification-contract | JSON 形式的 expectedChecks、binding/verifier 引用、rubric、確認與完成位置 | [§5 資料契約](../docs/specification.md#s5) |
| tasks | 確認到完成的工作與各項完成證據 | [§4 流程](../docs/specification.md#s4) |

`openspec validate --strict` 檢查 OpenSpec 文件結構；自訂 verification-contract JSON 的內容與業務語意需要另外驗證。`contracts/review-result.schema.json` 是 reviewer 回覆的 JSON Schema，與 OpenSpec 的工作流程 schema 是不同事物。

安裝 specwit 後，以 `specwit validate <change> --json` 驗證契約、資源與 ID 覆蓋。輸出的 READY 只表示 runner 前置條件符合 Observe 要求，不建立可信人工核准；人工待辦另列於 humanPending。

## 2. 人確認與實作前檢查

以來源與 behavior-plan 向工程師呈現需求理解、關鍵 binding、測試價值、未知與完成位置。需要核對的是真實且仍適用的確認，不因換 session 就重複索取已有效的授權。

確認應對應計畫版本及相關輸入的 digest；自填 `confirmation.status`、姓名或時間不能建立可信身分。外部確認入口尚未實作時，只能人工核對，不能宣稱機械強制。

`/opsx-apply` 的指引要求先處理確認、binding、baseline。教學 change 缺少真實專案與確認，不能因 CLI 顯示 `ready` 就開始假實作。未完成的項目保持未勾選，回報具體缺口。

## 3. 實作與有效檢查

重用既有檢查；新增測試要能說明契約、會失敗的反例、增加的證據與成本。baseline 需分開既有問題、新需求尚未實作與環境失敗。

先在相應功能工作內完成實作與測試，再做跨功能驗證。Writer 寫的 repo tests 可以提供證據，但不能因此把其自填 stdout 或任意 JSON 當成受保護的驗收結果。

## 4. Candidate、Gate A 與 Gate B

以下描述目標中的受保護驗收。現在可用 `specwit verify <change>` 執行宣告 checks，再用 `specwit verify <change> --run <uuid> --review review.json` 匯入 reviewer envelope；`specwit status <change>` 重新檢查版本與結果。CLI 已接部分資料檢查，但下列隔離、snapshot 與 reviewer 啟動仍需外部接入：

1. 停止／隔離 Writer 對待驗版本的寫入，擷取實際輸入快照與 digest。只記 commit SHA 未必包含 dirty files、fixture 與其他材料。
2. 以固定 plan、binding、policy、verifier 對 Candidate 執行 Gate A；核對預期與實際 checks、attempts、完整結果及版本。
3. 需要 Gate B 時，用受控設定啟動新 reviewer session，提供唯讀 Candidate、規格、rubric 與 Evidence，不繼承 Writer 的自評。
4. 接收端驗證 reviewer JSON Schema，再檢查每個預期 criterion 恰有一筆、evidence 可讀且屬於該版本。由接收端附加可信 run/candidate/model metadata。
5. `unknown` 的 confidence 為 null；其餘信心只是模型自報參考，不能覆寫 Gate A FAIL。人工項目與 blocking finding 仍需有效處置。

回覆格式提案：

```json
{
  "schemaVersion": 1,
  "assessments": [{
    "criterionId": "implementation-risk",
    "verdict": "unknown",
    "confidence": null,
    "rationale": "尚未提供 Candidate 與執行證據。",
    "evidenceIds": [],
    "limitations": ["目前只有規劃文件"]
  }]
}
```

預期接收條件為「必要檢查全部 CURRENT＋PASS、人工項目與 findings 已處置、交付版本一致」。缺結果、INCONCLUSIVE、STALE 或 INVALID 不得自動接受。SpecWit 的 Observe 判斷已檢查必要結果與人工待辦，仍未驗證身分、受保護來源及交付版本，因此不是受信任 gate。

修復或改變計畫、binding、verifier、policy、base 後需重判有效性；建立新 Candidate／attempt，不覆寫先前失敗。OpenSpec 本身不管理這種失效。

## 5. 交付與 LOCAL／CI 明確完成

Task、Run、OpenCode session 與 runtime process 是不同物件。一次 Run PASS、session 結束、tasks 全勾選，都不是 Task 完成要求。

| 位置 | 流程 | 目前支援程度 |
|---|---|---|
| LOCAL | 核對必要驗證、人工處置、授權交付與明確完成要求，再清理 | specwit complete 只預覽，finalizer 未實作 |
| CI | 保留可重建契約；同 Task、新 Run 重驗實際 head／integration tree；另一步明確完成 | 只有契約草稿，workflow／publisher 未接入 |

交付沿用已有授權，沒有額外授權時不得推導 push、PR、merge 或 deploy。若正式 specs 需要納入交付，可以在授權範圍使用獨立的 `/opsx-sync`；這會改變檔案，仍需把更新納入最終版本核對，不能拿同步前的 PASS 直接套用。

## 6. 資料歸屬與清理

本示例沿用 OpenSpec 的 change 作為尚未完成 Task 的契約位置，不另外複製到 `.governance/tasks/`：

```text
openspec/config.yaml、schemas/、specs/、contracts/    共用設定／正式規格，保留
openspec/changes/<task-id>/                         任務規劃與驗證契約
.governance/runtime/<task-id>/<run-id>/              執行證據與暫存，gitignored
```

真實 Task 完成後，外部 finalizer 應驗證資源擁有者與明確允許清單，停止相關 workers，再移除 task-owned change、runtime 與自行建立的 reviewer 資料。不能依模型輸出的任意路徑刪檔。交付程式、正式測試、共用規則、其他任務與使用者既有 session 要保留。

目標 finalizer 在清理失敗時應保持 COMPLETING 並可重試；未完成或未知時保留必要資料。只有通過適用 Profile 的驗收與完成核對，才可啟動清理。此範例的 `specwit complete <change> --dry-run` 只提供預覽，維持 BLOCKED_EXTERNAL，不實際刪除示例。

OpenSpec archive 會保留整份 change，也可能在未完成任務時經確認或 `--yes` 繼續；它不是 finalizer。`operations.archive.guidance` 只能提醒差異，不能取代內建流程。

內建 apply 在清單全勾選後會建議 archive；清理 change 則連 tasks.md 都會移除。因此最終完成必須由外部入口接管，不能要求 OpenSpec 在刪除任務資料後繼續提供 all_done 狀態。這也是最後一項 task 在本示例保持未完成的原因。

CI runner 清理、Git 追蹤檔案清理及離線本機副本是不同目標。刪除契約改變 SHA 時必須針對實際最終版本重驗，並暫時保留重驗需要的契約。[D16 與 D17](../docs/feasibility-and-decisions.md#f6) 仍未解決；不以永久完成收據或遠端 evidence store 迴避這些決策。
