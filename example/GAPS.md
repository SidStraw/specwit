# OpenSpec 配置後的不足與外部補強

結論：OpenSpec 已足以承載需求、行為、驗證計畫、review 格式與完成流程的**指引**。我們仍需補上的部分集中在可信確認、實際執行、結果接收、版本有效性與完成清理；不必因此先建立完整治理平台。

查核日期：2026-10-01。實測版本：OpenSpec 1.14.0。對照基準：[治理規格 v0.3](../docs/specification.md)。以下區分 CLI 已實測、文件／架構分析，以及尚未整合驗證的提案。

## 已完成的配置

| 能力 | 本例做法 | 保證界線 |
|---|---|---|
| 來源到需求／行為的對照 | proposal、specs、behavior-plan 範本 | 模型仍可能漏列或誤解，需核對內容 |
| 規劃產物相依性 | 六種 artifact 與完整 apply.requires | 檔案存在檢查，不是內容／核准檢查 |
| 行為與測試價值 | 六類情境、反例、既有測試與增量價值欄位 | 不會產生或執行受信任 verifier |
| 結構化契約 | verification-contract.json、review-result JSON Schema | OpenSpec 不會自動驗證這些自訂資料 |
| 實作與完成流程 | apply 指引、九項示例 tasks、LOCAL／CI 分流 | 依賴 Agent 遵循；沒有外部 finalizer |
| 專案內儲存 | change 放契約，gitignored runtime 放執行資料 | 未建立權限隔離或清理程式 |

## 外部缺口清單

| ID | 不足與證據等級 | 最小外部補強 | 如何驗證補強有效 |
|---|---|---|---|
| G01 | **已實測**：confirmation=PENDING、binding=MISSING，apply 仍 ready。文件相依性不是人核准。 | 可核對的確認入口，把確認綁定 plan/相關輸入版本；必要時接人工 CI 環境 gate。 | 自填核准、錯誤版本、過期確認不能取得接受資格；已有有效確認不要求重複。 |
| G02 | **已實測**：verification-contract 寫成無效 JSON，仍 done，strict spec validation 仍通過。 | Runtime schema validator；另驗 requirement/check/criterion 覆蓋、唯一性與有效引用。 | 空契約、漏 ID、重複 ID、無效格式及引用不符皆拒絕；不能只驗 JSON 可解析。 |
| G03 | **文件／架構分析**：instructions 提供文字，不替專案執行 browser/API 驗證，也不知道真實 binding。 | 一個試點 repo 的 route/locator/transport/fixture/startup 接法；重用測試，加有限 verifier 模板。 | 正確對照能過，已知缺陷被找到；環境無法執行列 INCONCLUSIVE，不能算成功偵測缺陷。 |
| G04 | **文件／架構分析**：配置、範本及候選程式都在可寫工作區，流程文字沒有建立權限邊界。 | 受保護 policy/verifier/reporter、隔離 Candidate 執行；憑證及可發布 gate 的權限分離。 | Writer/Candidate 無法修改 verifier、偽造結果來源或取得 publisher 權限；同使用者換目錄不算通過。 |
| G05 | **已實測部分**：上游 behavior-plan 改變，下游文件仍 done。Candidate 與 Evidence 的完整性尚無執行元件。 | Candidate snapshot、材料 digest、plan/binding/policy/verifier/environment 對應與失效規則。 | 驗完再改程式／base／計畫，舊 PASS 不可套用；dirty files 與 fixture 不能遺漏。 |
| G06 | **已實測**：全部 tasks 勾選，即使沒有執行證據仍 all_done。 | 獨立結果接收與決策器；比對 expected/actual checks、完整 attempts、CURRENT/PASS/未知與人工處置。 | 自填 PASS、漏跑、INCONCLUSIVE、STALE、INVALID 不能形成成功 gate。 |
| G07 | **文件／架構分析**：可要求 reviewer 回覆 JSON，但沒有啟動新 session、隔離設定或接收結果。 | OpenCode reviewer launcher＋唯讀權限＋受控設定；接收端載入本例 JSON Schema 並核對證據。 | repository skills/plugins/AGENTS 不改寫評估規則；漏 criterion、假 evidence、錯 Candidate 被拒絕。 |
| G08 | **已實測部分**：archive --yes 可在確認 pending、tasks 未完成時封存，且保留契約。安全清理未實作。 | 明確 finalizer、資源所有權與允許清單、可重試清理；完成要求與驗證分離。 | 不把 archive/session/PASS 當完成；失敗保留資料，重試不誤刪其他 Task 或交付成果。 |
| G09 | **尚未整合**：沒有 CI workflow、required check 或可信結果 publisher。 | 同 Task、新 Run 的 CI runner，依可信契約重驗實際版本；publisher 與不可信程式分離。 | 不採信本機 PASS；head/base 改變重驗；缺契約不能當作「沒有任務」通過。 |
| G10 | **尚未整合**：OpenSpec 沒有提供本方案的 runtime observer、撤銷、程序回收或預算控制。 | 先用既有 Harness/CI 的 timeout、取消與隔離能力；有量測需求才加 Plugin／supervisor。 | 定義實際覆蓋路徑；取消後遲到結果不被接受，不能以主程序結束推論所有子程序停止。 |

G04 是宣稱受保護驗收的必要條件，不能等到量產才補；沒有它時只能提供 advisory／Observe 結果。G03 的 binding 成本與缺陷偵測效益，也仍是本方案最大未知。

G08 還有狀態歸屬問題：內建 apply 在全勾選後會建議 archive，但外部清理會移除 change 與 tasks.md。完成入口必須在清理前核對條件、清理後核對資源，而不是期待 OpenSpec 保留一份永久 all_done 紀錄。

## SpecWit CLI 0.3.0 現有能力

上表保留 OpenSpec 本身的界線；目前另有 [TypeScript CLI](../packages/cli/README.md)，以 minimist 解析參數、Zod 驗證資料、Ajv 載入 reviewer JSON Schema，並用 tsdown 打包。這是可執行的 Observe 切片，所有輸出仍為 `eligible: false`。

| 缺口 | 目前已實作 | 仍需補強 |
|---|---|---|
| G01 | 確認來源檔案存在、計畫 digest 對應與失效檢查 | 確認者身分與真正授權不可由檔案欄位證明 |
| G02 | 嚴格契約驗證、需求覆蓋、ID 唯一性、資源引用與 digest | 內容理解正確性、來源需求是否被完整擷取 |
| G03 | argv runner、結構化 check 回覆、實際子程序測試 | 真實產品的 binding、測試 adapter 與缺陷偵測價值 |
| G04 | 明確限制為 Observe | policy/verifier/reporter 隔離與可信結果來源 |
| G05 | 規劃與宣告輸入前後雜湊、版本變動轉為 STALE | 不可變 snapshot、完整 inputs／環境與 head/base 綁定 |
| G06 | 缺漏／重複結果、FAIL／未知、人工項目、追加 Run／review attempts | 受保護結果接收、接受決策與發布權限 |
| G07 | review envelope、專案 JSON Schema、criterion 與同 Run 的 check 證據引用 | 新 reviewer session 啟動、唯讀隔離、模型來源與附件證據 |
| G08 | `complete` 顯示 Task 專屬 change/runtime 清理預覽 | 實際 finalizer、交付與資源所有權核對、可重試清理 |
| G09 | 保留 LOCAL／CI 目標，CI 完成預覽回報 WAITING_FOR_CI | CI workflow、新 Run、required check、可信 publisher |
| G10 | 每項 timeout、Task Run 次數上限、鎖、取消與程序群組終止嘗試 | 全面程序回收、即時 observer、撤銷及預算管理 |

功能測試涵蓋真實子程序的 PASS／FAIL、timeout、無效結果、版本變動、錯誤 review 與隔離目錄中的打包執行；測試的確認資料是合成 fixture，不是人核准，也沒有跑教學簽到產品。`pnpm cli:test` 可重跑。完成清理仍保持 BLOCKED_EXTERNAL，沒有刪除模式。

## CLI 實測紀錄

重跑：`node scripts/check-example.mjs`。腳本在自動清除的暫存副本操作，不改原始範例，也不連接產品服務。

| 探測 | OpenSpec 1.14.0 結果 | 解讀 |
|---|---|---|
| schema 解析與驗證 | project schema，valid=true | 配置可被載入 |
| 六種 artifact 的 instructions | 有 context、對應 rules 與 template | 指引確實注入，包含 JSON template |
| apply／archive instructions | 各自有 operationGuidance | 指引注入成功，不等於強制執行 |
| 移除 design.md | apply blocked，missingArtifacts 含 design | 明列全部 apply.requires 可檢查缺檔 |
| confirmation=PENDING，binding=MISSING | apply ready | 沒有內容層 gate，G01 |
| 自訂契約換成無效 JSON | artifact done、apply ready、strict validate 通過 | G02；strict 不是自訂業務資料驗證 |
| 修改上游 behavior-plan | 六個 artifact 仍 done | 無自動失效，G05 |
| 無 evidence，勾完所有 tasks | apply all_done | 清單不等於驗收，G06 |
| 還原未勾選 tasks，archive --yes | 建立 main spec、封存 change，保留 pending 契約 | 封存不是完成或清除，G08 |

總共 10 項檢查通過；表中 schema 與 strict fixture validation 在腳本分成兩項。測試沒有執行 OpenCode Agent、產品驗證、模型評估、權限攻防或 CI；不由這些結果推導上述整合已可用。

## 建議補強順序

1. **先驗證一個本機驗收切片。** 取一個真實 repo，補 G01–G07 的最低需求：確認來源、binding、既有測試／少量外部 checks、受保護 runner、版本綁定、結果接收與需要的 reviewer。先單 Run，不建常駐服務。
2. **再處理明確完成。** 補 G08，驗證保留／清理／重試與交付版本；需要 CI 時再接 G09。D16 的最終 SHA 與離線本機清理、D17 的未完成任務保留仍需決策，不能只用 shell 刪資料夾解決。
3. **量測後才擴充即時管控。** G10、更多 Harness、平行 worker 與 dashboard 先延後。比較基準包含客製化 OpenSpec＋既有測試／CI＋reviewer；計入需求確認、binding、例外、最終 review 與維護工時。

小型 CLI 已有可執行切片；接下來驗證真實專案與受保護 runner，不預設另做完整 Controller 平台。只有證明額外驗收能抓到有價值的錯誤並降低淨人工成本，才擴大範圍。

## 來源與適用範圍

- [官方 project config](https://openspec.dev/docs/project-config)：context、rules 與 operations 是提供給 Agent 的指引；各欄位到達的步驟不同。
- [官方 schema 契約](https://openspec.dev/docs/schemas/schema-yaml)：完成依輸出檔案存在；requires 與 apply.tracks 各有用途。
- [官方 CLI](https://openspec.dev/docs/cli)：validate 的結構檢查、status 與 archive 行為。
- 本機 init 產生的 [apply skill](.opencode/skills/openspec-apply-change/SKILL.md) 與 [archive skill](.opencode/skills/openspec-archive-change/SKILL.md)：guidance 是補充建議，不會改變內建狀態／操作；archive 不會因這份配置自動變成 finalizer。
- 本專案 [§3 信任模型](../docs/specification.md#s3)、[§7 驗證](../docs/specification.md#s7)、[§9.5 OpenCode](../docs/specification.md#opencode)、[§10.1 CI](../docs/specification.md#ci-completion)、[§11.3 清理](../docs/specification.md#task-storage)。

官方文件會更新；本例的行為結論以已記錄的 1.14.0 探測為準。尚未實測的能力不列為「已證實不能做」，而列出本配置沒有實作、需要接入及驗證的責任。
