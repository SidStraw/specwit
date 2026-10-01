# 可行性分析、設計建議與待決策事項

> v0.3 discussion draft｜更新日期：2026-09-30。初次官方查核為 2026-09-29；本輪補查 OpenCode 與 Zod 文件，並納入後續使用者方向。這是規格與可行性分析，未實測 Harness adapter、隔離、模型呼叫或 verifier；已確認方向與實作提案分列於 F6。

<a id="f1"></a>
## F1. 結論與判斷分級

**值得做小型 Prototype；目前證據不足以承諾做成通用、零設定、跨 Harness 的治理平台。** 基礎工程大多有現成構件。難點在於將需求準確連到可觀察的實際產品行為，並在不增加大量接入與確認工作的情況下提供獨立證據。

本文區分四種確定性：

- **已查核**：本次讀到官方文件明示能力，或有本機命令輸出；不等同整合已成功。
- **工程推論**：依既有構件可合理設計，但需契約測試、隔離測試與失敗演練。
- **產品假設**：是否節省時間、是否被團隊採用、是否願意維護；需真實任務資料。
- **不宜承諾**：任意自然語言全部可驗證、所有 shell 副作用皆由 Hook 攔截、完全沒有 hardcode 或功能全面正確。

| 能力 | 判斷 | 真正難點／限制 | 建議 |
|---|---|---|---|
| 不可變授權、Candidate、Run manifest | 工程推論：高可行性 | 版本、dirty input、race、撤銷與復原 | 首版必要 |
| 外部執行既有 checks | 已有工具支持 | Candidate 可修改 scripts／tests，exit code 證據很薄 | 加外部 plan 與結果完整性 |
| 獨立 Web behavior verifier | 限定範圍高可行性 | DOM、route、fixture、API transport 的 binding | 有限模板先行 |
| 自然語言→精簡且完整的 behaviors | 產品／技術假設 | 看起來合理但漏掉需求；修正成本高 | 與人標準答案對照 |
| 跨 Vue／React／RPC 的通用 compiler | 尚未證實 | Compiler 很容易把複雜度藏到 adapter 或每任務手寫碼 | 先量測 binding 維護成本 |
| Runtime risk observer | 基本訊號可行 | Fan-out 不等於風險，未捕捉的動態相依、誤報與延遲 | Shadow mode 校準 |
| 全執行路徑攔截 | 不能只靠 Hook 承諾 | shell 子行程、既有行程輸入、遠端 MCP、外部副作用 | OS／環境權限補足 |
| CI 作為成果接受邊界 | 條件式可行 | publisher 身分、workflow 信任、branch rule、merge tree | 明確設定與驗證 |
| Hash chain 與任務期間 audit | 工程推論：可行 | 真實性、完整性、截短、root 的控制能力 | 完成後清除，不承諾永久稽核 |
| 專案內 Task／Run 與完成清理 | 工程推論：可行，CI 整合待定 | Git 清理改變 SHA、本機離線副本與未交付成果 | 先做本機清理，再驗證 CI finalization |
| Review compression | 產品假設，最值得優先驗證 | 新增 intake／approval／維護時間可能吃掉節省 | 測淨工時與漏失率 |

<a id="f2"></a>
## F2. Harness 與基礎工具的官方查核

下表是「有何整合入口」的證據，不是已驗證的功能相容矩陣。實作時仍需 pin release，記錄 OS、permission mode、啟用選項及契約測試結果；本機版本不一定與線上文件完全一致。

| 工具 | 官方文件已建立的事實 | 對本產品的含義 | 尚未實測 |
|---|---|---|---|
| Codex | SDK 可程式控制；App Server 提供事件及 approval request；Hooks 文件有 `PreToolUse` | 可選 SDK／App Server 做受控 runner，Hooks 做本機整合；需區分兩種控制入口 | 現有 Desktop session 能否以所需方式掛入、每種工具的 deny／abort |
| Claude Code | `PreToolUse` 可給 allow／deny／ask 等決策；非互動環境另有互動 host 規則 | 能支援事件前的治理決策；不能與 Codex 的欄位語意視為完全一致 | Hook timeout／錯誤、各模式及子工具完整覆蓋 |
| OpenCode | Plugin 有 `tool.execute.before/after`；SDK 有 session API 與 JSON Schema structured output | 本輪首個整合對象，可接 Writer Plugin 與獨立 reviewer | 版本變更、背景工具、MCP、plugin failure、停止行為與 reviewer 設定隔離 |
| Pi | 官方 RPC 文件描述 headless JSON protocol；extensions 可用 `tool_call` 改輸入或 block | 適合受控 reference runner 的候選 | 實際取消／恢復、環境隔離與載入哪些 extensions |
| Playwright | 可攔截／mock HTTP(S)，並從外部觀察 UI 與 requests | Web templates 有實作基礎 | 真實專案 binding、RPC codec、Service Worker 與 flaky |
| GitHub | 可要求 checks；可選預期 check 來源 App；規則有 bypass 與版本條件 | 可管接受成果，但配置是信任模型的一部分 | 實際 repository plan／ruleset／App 權限，merge queue 接法 |

Codex 的程式整合入口見 [SDK](https://learn.chatgpt.com/docs/codex-sdk) 與 [App Server](https://learn.chatgpt.com/docs/app-server)。本機僅執行 `codex --version`、`codex app-server --help`：版本為 `codex-cli 0.156.1`，help 標記 App Server 為 experimental；**未啟動 Agent 或呼叫模型**。

Codex Hooks 文件列出 hosted tools 與部分特殊路徑的例外，也指出 `write_stdin` 不會再次觸發 `PreToolUse`；目前 `PreToolUse` 的 `permissionDecision: "ask"` 尚不支援，某些無效欄位會報錯但繼續工具呼叫。推論：Adapter 應把 escalation 實作成可靠 deny／pause 加外部人工決策，並測試錯誤回應，而非直接照搬其他 Harness 的 JSON。[Codex Hooks](https://learn.chatgpt.com/docs/hooks)

Claude Code 的 `PreToolUse` decision control 與非互動要求應依其文件獨立實作。[Claude Code Hooks](https://code.claude.com/docs/en/hooks)

OpenCode 的可用 Hook 與阻擋範例見 [Plugins](https://opencode.ai/docs/plugins/)，session API／structured output 見 [SDK](https://opencode.ai/docs/sdk/)。SDK 支援依 JSON Schema 回傳資料及格式失敗處理；實作仍須固定相容版本。新 session 不會自動排除多層設定，因此乾淨 reviewer 需要額外控制載入來源及權限。[OpenCode Config](https://opencode.ai/docs/config/)

Zod 可描述嚴格物件、union 與欄位限制，適合作為模型回覆的接收邊界；criterion 覆蓋、evidence 存在性與 Candidate 對應仍由 Controller 檢查，不能只靠格式推論內容正確。[Zod API](https://zod.dev/api)

Pi 原稿的 `badlogic/pi-mono` 文件網址在初次查核時轉址至 `earendil-works/pi`；作為其他 Harness 的歷史研究保留，不再列為首版選型候選。將來導入仍須固定 release。[Pi RPC](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/rpc.md)、[Pi extensions](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/extensions.md)

Playwright 的 API mock 能力與 Service Worker 觀察限制分別見 [Mock APIs](https://playwright.dev/docs/mock) 與 [Network](https://playwright.dev/docs/network)。這證明底層工具可用，沒有證明任意前端專案都能零設定生成正確 verifier。

GitHub 接受的 required check 狀態可能包含 `skipped`／`neutral`，因此 Governance 的 final check 要自行將未知或漏跑判為不合格；同時把具寫入權的 publisher 與執行 PR code 的環境分開。[Protected branches](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches)、[Actions secure use](https://docs.github.com/en/actions/reference/security/secure-use)

### Adapter 契約測試至少涵蓋

正常啟動／結束、structured event 對應、deny 後無副作用、escalation 等待與恢復、Hook 回應格式錯誤／timeout／daemon 斷線、中止與背景子行程、shell 間接寫檔、串流事件遺漏、MCP 遠端操作、既有行程後續 stdin，以及模型 metadata 缺失。

逐條記錄 supported／unsupported／not tested；`abort=true`、`sandbox=true`、`preToolInterception=true` 只能當概略摘要，不能代替結果。

<a id="f3"></a>
## F3. 原稿最值得保留與必須調整的地方

### 先保留的設計

原稿已正確抓住外部觀察、Writer 與 Verifier 分離、immutable authorization、Candidate isolation、三態 Gate、baseline、integration verification，以及 human-only 的必要性。尤其「不要把另一個模型的自信變成證明」與「治理不能比 review 更累」，應持續作為取捨原則。

### 需要修正或補齊的契約

| ID | 原稿問題／缺口 | 建議修正 | 為什麼影響產品成立 |
|---|---|---|---|
| R01 | 第 2 節容易被讀成外部 `pnpm test` exit 0 就足夠 | 驗證 pack、runner、reporter、測試清單與結果通道皆受保護；repo tests 為補充 | 否則改 test script 即可製造綠勾 |
| R02 | 自然語言→IR→compiler 中間缺實際 app 的接法 | 加 Project Binding，凍結並確認關鍵 locator／transport | Compiler 的困難多在 binding，不是 JSON 轉程式 |
| R03 | 「人工確認 5～15 條」可能漏掉未被擷取的需求 | 來源逐條追溯、unknown 明列；摘要有可展開的完整分母 | 確認錯誤摘要並不能防止需求遺漏 |
| R04 | `PROVABLE`、`INCONCLUSIVE`、Run states 混層 | 分開 readiness、verification mode、phase、verdict、acceptance、validity | 否則難以定義重跑、取消、人工核准與完成 |
| R05 | 第 11 節「Hook 這層才能 ALLOW／DENY」與第 33 節限制需整合 | 分開有覆蓋的事前攔截、事後觀察、OS 隔離與成果 Gate | Hook 只是其中一層，不是完整安全邊界 |
| R06 | 「放在 workspace 外」仍可能同 UID 可修改 | 設計實際 sandbox／身分／掛載／socket 邊界 | 不能只用資料夾位置主張防偽造 |
| R07 | Immutable authorization 與 request-expansion 的關係未定義 | Append 新授權 revision，保留 supersedes、actor、digest 與範圍 | 不得讓 Run 覆寫自己的原始權限 |
| R08 | Candidate／final commit／dirty workspace 對應不足 | 不可變 snapshot、input materials、交付前版本檢查與 integration tree 再驗證 | 避免「驗 A 交 B」 |
| R09 | Baseline 用測試數量示例容易過度推論 | 用 check identity＋失敗 signature；測試刪除另列 | 相同失敗數可能是不同錯誤 |
| R10 | Hash chain 被描述成能防止偽造、刪除 | 改為篡改可偵測；需要可信 checkpoint、權限與簽章 | 鏈不能自行證明沒漏記或沒整條重寫 |
| R11 | 首版包含多套 adapters 與通用 FE compiler | 核心切片＋單 adapter；跨工具列 roadmap | 避免把時間先花在尚未證明有價值的整合 |
| R12 | 沒定義不確定、人工 exception 與 GitHub Check 的映射 | 所有必要未知阻擋接受；例外保留原結論 | 不能在 UI 說未知，GitHub 卻允許 merge |
| R13 | 「CheckIn 只送一次」與 authoritative state 太簡略 | 區分 pending 重複送出、retry、跨頁與 backend 冪等性 | FE request count 無法證明整體業務 exactly-once |
| R14 | filesystem queue／lease 有提到，但欠 crash 與舊 worker 語意 | 單機可 SQLite；fencing 在收結果端強制，side effect 要 idempotency | 避免重複執行或舊結果覆蓋新結果 |
| R15 | 成功指標主要是被驗證數量 | 加總確認、打斷、review、維護時間與漏失缺陷 | 自動化變多仍可能讓總工時上升 |
| R16 | 可測即新增測試，容易複製常數／型別／既有 assertion | 依獨立契約、合理反例、增量證據與成本選擇檢查 | 防止 CI runtime 與認知負擔增加，卻沒有新保護 |
| R17 | 模型意見缺乏接收契約與可信引用 | 乾淨 reviewer、Zod 格式檢查、criterion／evidence 對應，confidence 僅供參考 | 格式有效不等於判斷正確，也不能覆寫程式化 FAIL |
| R18 | 長期保存 manifest 與遠端 artifact 不符合目前方向 | Task 資料留專案，明確完成即清除；CI 任務延後到 CI 完成 | 不必讓本機 session 常駐或建立永久資料庫 |
| R19 | CI 完成被混同為 repository／本機都已清理 | 分開 CI checkout、Git 追蹤檔案、本機副本，驗證最終版本 | 避免資料殘留、誤刪成果或把舊 PASS 套在清理後 SHA |

### 特別值得討論的三個取捨

**一，低文件負擔不等於零設定。** 一次專案 binding 與政策接入合理；若每個新 Task 都要人工修 300 行測試，則產品假設失敗。必須把「一次性接入」「每 Task 補 binding」「模板維護」分開量測。

**二，Runtime-first 不必等於每個工具呼叫都先詢問。** Repo diff 與外部行為驗收可以提供高價值；廉價、確定的權限限制走同步路徑，昂貴的影響分析可在背景執行，但事後發現不能宣稱已阻止副作用。

**三，差異化必須在獨立的需求證據。** 既有 CI 已能跑 checks，Harness 已有 permissions 和 Hooks，AI reviewer 已能找疑點。本產品需要證明「來源需求→人確認→受保護驗證→精確成果→剩餘未知」這條鏈具有額外效益。這是本次架構分析的產品推論，尚無市場驗證。

<a id="f4"></a>
## F4. 建議架構與實作順序

| 選擇 | 建議 | 替代方案與代價 |
|---|---|---|
| Core | Core＋CLI 先完成驗證切片，再接按需啟動的 Local Runtime | 常駐 daemon 不是必要條件；一個程序可管理多個獨立 Task |
| Language | 若首個試點是 TypeScript Web，可優先評估 TypeScript Core | 其他語言同樣可行；此處無效能證據可決定選型 |
| Behavior IR | 具 schema 的資料＋有限 op／templates | 自訂 DSL 先增加學習成本；任意程式碼欄位會破壞控制邊界 |
| Verifier | Playwright 外部觀察＋必要靜態檢查，獨立 pack | 全靠 repo tests 容易共用 Writer 的錯誤理解 |
| First adapter | OpenCode Plugin＋SDK reviewer；本輪方向已指定 OpenCode | Codex／Pi／Claude 延後；實際相容能力仍需契約測試 |
| Scope | Repo 共用 policy＋實際變更風險，少量硬限制 | 每 Task path YAML 精細但日常負擔高 |
| Storage | 專案內精簡 Task 契約＋gitignored runtime；SQLite 可選，完成後全部清理任務資料 | 不設遠端 evidence store／CI artifacts 保存／永久完成索引；Git 歷史不因刪檔消失 |
| CI | 同 Task、新 Run，從專案重建驗證，再明確完成與清理 | Git 清理與本機同步需另定流程，不能把 runner 刪檔當全域清理 |
| UI | P0 可先用可讀 Markdown／CLI summary 確認行為 | 提早做 dashboard 並不解決需求與 verifier 的正確性 |
| Semantic review | 乾淨 session、Zod 驗證的結構化評估、人工 disposition；confidence 為自報參考 | 不依賴 Jev，不以多模型投票或高信心當正確性保證 |

建議實作順序：Core／CLI 的一次驗證 → 乾淨 reviewer＋結構化結果 → OpenCode Plugin／runtime＋本機 Task 完成清理 → CI 重驗及明確完成 → risk observer。API 與目錄布局見 [規格 9.5](specification.md#opencode)，仍是未實作提案。

常駐 `govd`、provider queue 與 autonomous worker 延後；外部 audit／evidence storage 不列入目前範圍。不可因沿用原稿 roadmap，就重新導入已取消的永久保存需求。

<a id="f5"></a>
## F5. Prototype、量測方法與停止條件

以下數值是**建議的試點門檻**，不是文獻結論、承諾或已量測成果。先確認任務組成與成本容忍度，再凍結 benchmark；不可實驗後調整分母讓結果變好。

### E1：需求理解與確認負擔

取一個試點 Web repo 的 10 個真實／去識別 Task，包含 API 狀態、error、reload、config、權限或重複送出，不只挑最容易的 CRUD。以 6 個建立模板，4 個保留作未參與設計的評估；首輪結果只能代表此試點，之後另找 repo 驗證外推能力。

由工程師先列 source requirements、critical behaviors、human-only、契約缺口，再讓系統產生計畫。逐項比對遺漏、錯誤推論、錯誤可驗證分類與確認時間。

建議門檻：critical requirements 在此樣本的漏列為 0；全部 requirement 正確對應率至少 90%；每 Task 確認／修正中位時間不超過 5 分鐘。不能因人類最後補齊就不記系統初始漏項。

### E2：驗證器是否真的有判別力

針對六類模板建立至少 30 個已知缺陷變體，例如 hardcode config、error 標 completed、pending 允許重複送出、reload 使用 localStorage、故意跳測試，以及替換 Candidate；另保留無缺陷對照。錯誤由獨立 benchmark 設計，不讓 Writer 同時定義答案與測試。

先驗證測試環境與對照版本正常，再測 defect variant，記錄 caught／missed／inconclusive。因 infrastructure failure 阻擋而未執行到缺陷，不能算「成功抓到該缺陷」。每個 behavior 必須至少有一個會使它失敗的負向案例，避免空測試或永遠為真的 assertion。

本節是 verifier 的限定 benchmark，不要求每張 Task 或每次 CI 重做全量缺陷注入。先確認契約本身有價值；常數鏡像測試即使能抓到常數 mutation，也不因此成為必要驗證。另記錄重用既有 checks 的比例、重複測試、CI 時間與維護負擔。

建議門檻：限定在支援情境內的缺陷偵測率至少 90%；已知正確對照的誤阻擋不超過 5%；已凍結的重跑集至少 20 次重跑無不明 verdict 反轉。樣本小時同時呈現分子／分母，例如 27／30，不以比例暗示已證明普遍可靠。

### E3：信任邊界與交付完整性

覆蓋 [規格 AC02～AC05、AC08～AC13](specification.md#s14)：test script 改 exit 0、少跑 check、偽造 stdout、改 policy／result、寫 verifier volume、呼叫 approval channel、證據後改 code、失效 lease、取消後回傳、PR head 更新、未知被映射成綠燈。

建議門檻：此固定套件的錯誤接受為 **0**。只代表已列出的攻防／故障案例通過，不代表完整資安保證。若這一關不過，產品只能標示 advisory／Observe，不可聲稱 Certified candidate。

### E4：Risk observer 是否減少負擔

先記錄 shadow findings，不中斷真實工作；由工程師對「是否值得當下中斷」標註。加入已知 high-impact 變更案例，避免只追求少提醒而完全不攔截。

建議門檻：正常低風險任務非必要中斷的中位數為 0；升級為中斷的 finding 中至少 80% 被判為有用；列為硬政策的已知違反在樣本中不得漏掉。另報告 event gaps、每次決策延遲與過多提示造成的直接全允許比例。

### E5：Review 淨效益

比較兩組：現有 Harness＋CI＋既有 AI reviewer；相同基礎再加 Governance。使用難度相近的 Task 與輪換順序，避免 reviewer 先看過同一缺陷而縮短第二次的時間；評估人員先不知道系統是否找到預設缺陷。

```text
Governance 人工總時間 = intake 確認 + binding 修正 + 例外處理 + 最終 review
                       + 失敗排查 + 接入／維護時間在合理任務量下的攤提
淨節省率 = 1 - Governance 人工總時間 / 對照組人工總時間
```

建議門檻：相近任務下中位淨工時下降至少 30%，且重要缺陷漏失不得比對照組增加。另列每 Task 額外模型費用、CI／browser 時間、artifact storage，實際可接受金額由使用者設定。不透過假設極大的未來任務量隱藏接入成本。

### E6：結構化評估與 reviewer 隔離

依 [AC16／AC17／AC23](specification.md#s14) 注入 schema 錯誤、缺漏或重複 criterion、錯誤 evidence 引用、錯誤 Candidate、格式修正耗盡，以及 repository plugins／AGENTS 干擾。確認 Controller 拒絕無效評估、unknown 不假裝有信心、Gate A FAIL 不被覆寫；有 rubric 與證據仍不能把模型自報 confidence 當已校準準確率。

### E7：完成、CI 接手與清理

依 [AC18～AC22](specification.md#s14) 驗證本機完成、CI 延後完成、失敗保留、清理中斷重試、晚到 worker、另一個 Task 同時存在、Git 清理產生新 SHA，以及本機離線後重新同步。確認完成後沒有 gov-owned 任務資料殘留，也沒有誤刪交付成果或共用規則。

尤其需先實驗 D16 的 finalization 流程，再承諾 CI 生命週期完整：任務契約能用於驗證最終版本，清理變更確實交付，且本機不以任意檔案缺失當完成證明。不新增遠端 evidence store 或永久 gov 收據。

### Go／No-go

| 結果 | 決策建議 |
|---|---|
| E1／E2／E3 達標 | 進入單 adapter＋CI 垂直切片與真實試點 |
| E6／E7 達標 | 才能宣稱結構化 reviewer 與本機／CI 完成清理符合目前規格 |
| 理解可靠但 binding 花費太高 | 限定專案類型、提供可重用 pack；先不承諾跨 stack |
| 自動理解不可靠，但受保護驗證有價值 | 評估轉為「人工既有驗收契約的執行與證據工具」，明確承認產品定位縮小 |
| E3 無法達標 | 降為輔助提示工具，不能建立強制通過宣稱 |
| Review 總工時不降或重要錯誤增加 | 暫停擴 adapters／dashboard，修核心流程或停止投入 |
| 只有更多摘要與 AI review，沒有獨立行為證據 | 尚未成立原稿期待的差異化 |

在 P0 前不給完整產品工期承諾；完成 E1／E2 後，才能依 binding 與模板的實際工作量估算。現階段擅自給總人週容易掩蓋最大的未知。

<a id="f6"></a>
## F6. 已確認方向與待決策紀錄

`CONFIRMED` 表示使用者已指定方向；`PROPOSED` 是落實方向的技術建議；`OPEN` 表示還需實驗或選定。確認方向不代表工具已實作，也不授權自動 push、merge 或 deploy。

| ID | 決策 | 狀態 | 目前方向／提案 | 尚需確認或驗證 |
|---|---|---|---|---|
| D01 | 第一個價值主軸 | PROPOSED | 獨立驗收證據與 review 淨效益 | 使用者最痛的實際 Task |
| D02 | 第一個支援的 stack／transport | OPEN | 一個真實 repo＋其主要 transport | Vue／React、HTTP JSON／gRPC-web 等 |
| D03 | 接入負擔上限 | PROPOSED | 一次 policy／binding 設定，限制每 Task 補工 | 接入時間與維護者 |
| D04 | 第一個 Harness | CONFIRMED | 先 OpenCode 使用情境，其他 adapter 延後 | 固定版本、Hook／SDK 相容性與隔離 |
| D05 | 治理強度與信任邊界 | PROPOSED | Local 回饋、隔離執行、選用 CI 管成果接受 | OS／容器及 repository rules 權限 |
| D06 | Success criteria | PROPOSED | E1～E5 量測效益，E6／E7 驗證新增契約 | 漏失風險、人力與成本上限 |
| D07 | 未知與 exceptions | PROPOSED | 必要未知阻擋；例外有理由／期限，不改原 verdict | 必要 checks 及例外權責 |
| D08 | Policy／binding／pack 權責 | PROPOSED | 維護者 review，Candidate 只能提出變更 | 可信 revision 與確認來源 |
| D09 | 交付權限 | PROPOSED | 依明示授權交付；完成任務不等於 merge／deploy 授權 | 既有交付流程 |
| D10 | 資料位置與完成後保存 | CONFIRMED | 全在專案內，明確完成後清除；不另存遠端或永久收據 | 目錄／DB 格式及清理恢復為實作提案 |
| D11 | 模型評估 | CONFIRMED（方向） | 不綁 Jev；乾淨環境提供理由、證據與信心參考，回覆需可程式驗證格式 | Zod、欄位 schema、唯讀工具與有限重試為提案；confidence 不代表準確率 |
| D12 | 程序架構 | PROPOSED | Plugin＋Core／CLI＋按需 runtime＋獨立 workers | 先單 Run，依需要再導入常駐 daemon |
| D13 | 程式化驗證與測試價值 | CONFIRMED（原則） | 能程式化就程式化，避免為測而測 | 契約／反例／增量證據／成本四項選擇規則為提案 |
| D14 | 明確完成的位置 | CONFIRMED | 本機任務在本機完成；需 CI 就保留到 CI 明確完成後清除 | finalization 入口與可信身分 |
| D15 | Task／Run／session 分離 | PROPOSED | 一個 Task 跨多 Run；runtime 可共用，reviewer 每次新 session | 狀態名稱、併行與 crash recovery |
| D16 | CI 與 Git／本機清理 | OPEN | 分開 runner 清理、Git 清理變更、本機同步後清理；不留永久 gov 完成紀錄 | 誰提交清理、在哪個分支、如何驗最終 SHA、如何確認本機可清理 |
| D17 | 未完成任務的膨脹控制 | OPEN | 有限 attempts／資源，取消或過期不能視為成功 | 容量、逾期、明確丟棄與未交付成果保護 |

目前最需要收斂的是 D02、D16、D17；D04／D10／D13／D14 不再列為「全部待確認」。本機驗證切片可先推進，CI 清理完整性要等 D16 的實驗結果。

### v0.3 對 v0.2 的替換紀錄

- 首版 Codex／Pi 擇一 → OpenCode 優先。
- 「可自動驗證」泛論 → 必須程式化驗證，新增測試另檢查契約與價值。
- 非結構化 semantic findings → 乾淨 reviewer 的結構化評估，Zod＋語意引用檢查；不依賴 Jev。
- Run 結束含糊地代表完成 → Task／Run／session 分開，依本機／CI 的明確完成入口結束。
- 長／中／短期 retention、CI artifacts、外部 audit roadmap → 專案內保存，完成即清除，不保留永久 gov 歷史。
- 清理視為單一步驟 → 明示 Git 歷史、最終 SHA、本機副本與復原尚需設計。

<a id="f7"></a>
## F7. 查核範圍與來源紀錄

技術查核來源只用官方文件／官方 repository。Codex／Claude／Pi／Playwright／GitHub 內容保留 2026-09-29 查核紀錄；OpenCode 與 Zod 於 2026-09-30 補查。這些都不是依版本鎖定的相容規格，未據此推論帳號權限、商業授權、登入資格、模型可用性或實際 API 成本。CONFIRMED 方向則依本次對話，不是外部文件的建議。

| 來源 | 用途 |
|---|---|
| [Codex SDK](https://learn.chatgpt.com/docs/codex-sdk) | 程式整合與 SDK／App Server 分工 |
| [Codex App Server](https://learn.chatgpt.com/docs/app-server) | 事件、approval request 與 client 決策 |
| [Codex Hooks](https://learn.chatgpt.com/docs/hooks) | Tool coverage、PreToolUse 限制與不支援欄位的行為 |
| [Claude Code Hooks](https://code.claude.com/docs/en/hooks) | PreToolUse 決策與非互動模式 |
| [OpenCode Plugins](https://opencode.ai/docs/plugins/) | before／after 與官方阻擋範例 |
| [OpenCode SDK](https://opencode.ai/docs/sdk/) | session／abort、JSON Schema structured output 與格式失敗處理 |
| [OpenCode Config](https://opencode.ai/docs/config/) | 多層設定合併，乾淨 reviewer 的載入邊界 |
| [Zod API](https://zod.dev/api) | 嚴格物件、union 與欄位限制；不能代替內容正確性檢查 |
| [Pi RPC](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/rpc.md) | Headless protocol |
| [Pi extensions](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/extensions.md) | tool_call 攔截與 extension 契約 |
| [Playwright Mock APIs](https://playwright.dev/docs/mock) | HTTP(S) mock 與外部驗證基礎 |
| [Playwright Network](https://playwright.dev/docs/network) | Service Worker 的攔截限制 |
| [GitHub Protected branches](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches) | Required checks、來源與接受狀態 |
| [GitHub Actions secure use](https://docs.github.com/en/actions/reference/security/secure-use) | PR code 與 privileged workflows 的信任界線 |

文件描述不代表整合成功。下一步需要 E1～E3 的驗證結果，並以 E6／E7 確認 reviewer 與完成清理契約；這些結果在任務期間供核對，依本版生命週期清除。
