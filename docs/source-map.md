# 原稿 73 節追溯對照

> v0.3｜更新日期：2026-09-30。用途：確認原稿概念及後續討論均有去向。已確認方向見 [決策表 F6](feasibility-and-decisions.md#f6)；其餘技術細節仍為提案，不表示已實作。

原稿完整保存於 [original-draft.md](source/original-draft.md)，未改寫原文；其中的舊工具名稱僅供歷史追溯，現行品牌與 CLI 統一為 SpecWit／`specwit`。重整後的技術補充與取捨原因見 [可行性文件 F3](feasibility-and-decisions.md#f3)。

| 原節 | 原標題 | 處理 | 整理後位置與說明 |
|---|---|---|---|
| 1 | 背景 | 保留 | [規格 1](specification.md#s1)：隱性工程偏差與 review 負擔，改列使用者問題。 |
| 2 | 原始設計理念 | 修正 | [規格 7](specification.md#s7)：保留外部事實；exit 0 加上 verifier 與執行完整性條件。 |
| 3 | 核心定位 | 保留 | [規格 1](specification.md#s1)：既有 Task 與 Harness 之間的治理層。 |
| 4 | 不做什麼 | 保留 | [規格 1](specification.md#s1)：Task、SDD、CI、Figma、QA 等產品邊界。 |
| 5 | 與 OpenSpec / SDD 的關係 | 保留 | [規格 1](specification.md#s1)：OpenSpec 可作 intent source，不要求 SDD；細化來源快照於第 5 節。 |
| 6 | 核心信任模型 | 補強 | [規格 3](specification.md#s3)：Control／execution trust boundary 加上實際 OS／身分隔離。 |
| 7 | 原始架構中的重要概念 | 補強 | [規格 5](specification.md#s5)：不可變授權加 revision／supersedes；Webhook 僅 trigger 見第 9 節。 |
| 8 | Controller | 保留 | [規格 4](specification.md#s4)：Controller 的 Run、snapshot、Gate、交付責任；單 Run 版本固定。 |
| 9 | Harness Architecture | 補強 | [規格 9](specification.md#s9)：保留 execute／abort／capabilities，增加 event 與停止確認契約。 |
| 10 | 本機開發整合 | 分期 | [規格 9](specification.md#s9)：首版先 OpenCode Plugin／runtime；其他 Harness 延後。 |
| 11 | Plugin / Hook / MCP 的分工 | 修正 | [規格 9](specification.md#s9)：Skill／MCP／Hook 分工保留，Hook 不作完整安全邊界。 |
| 12 | govd（歷史名稱） | 分期 | [規格 9](specification.md#s9)：specwitd 與可信元件分離保留，daemon 延後按需求導入。 |
| 13 | CI / Cloud 模式 | 調整 | [規格 10](specification.md#s10)：CI 從專案契約建立新 Run，明確完成與清理；不另建遠端 store。 |
| 14 | Pi / Headless Runner | 分期 | [規格 9](specification.md#s9)：Pi 延後，首版已指定 OpenCode；歷史工具查核保留於 F2。 |
| 15 | 三種執行模式 | 保留 | [規格 3](specification.md#s3)：Developer、CI、Autonomous 模式，另分治理 Profile。 |
| 16 | Task Intake | 保留 | [規格 4](specification.md#s4)：Task intake 與執行前理解確認。 |
| 17 | Requirement Normalization | 修正 | [規格 2](specification.md#s2)：可驗證性與需求明確度分離，避免與 verdict 混用。 |
| 18 | Behavior IR | 補強 | [規格 6](specification.md#s6)：Machine-readable IR，加入 template、binding 與觀察範圍。 |
| 19 | Engineer Review View | 保留 | [規格 6](specification.md#s6)：工程師看可讀 behavior；顯示來源與覆蓋缺口。 |
| 20 | 為什麼需要人確認 Behavior | 補強 | [規格 6](specification.md#s6)：Human confirmation＋freeze，不能漏掉未擷取需求。 |
| 21 | Verifier | 保留 | [規格 7](specification.md#s7)：Web／AST／schema／Git 等 verifier，按範圍選擇。 |
| 22 | Gate A | 補強 | [規格 7](specification.md#s7)：Deterministic checks 加上受保護 plan／runner／結果通道。 |
| 23 | Gate A 的判定 | 保留 | [規格 7](specification.md#s7)：PASS／FAIL／INCONCLUSIVE，補足 timeout、缺測試與 retry。 |
| 24 | Gate B | 補強 | [規格 7](specification.md#structured-review)：乾淨 reviewer、結構化評估與 Zod 接收檢查，信心僅供參考。 |
| 25 | Gate B 的定位 | 保留 | [規格 7](specification.md#s7)：Invariant discovery，確認後以新版本提升 Gate A 覆蓋。 |
| 26 | Candidate | 補強 | [規格 5](specification.md#s5)：私有 Candidate、完整 materials 與交付 digest 一致。 |
| 27 | Sandbox | 補強 | [規格 3](specification.md#s3)：clone／scoped HOME 不是安全邊界；測試與安裝亦須隔離。 |
| 28 | Repository Discovery | 保留 | [規格 8](specification.md#s8)：Repository discovery 與不要求每 Task 寫 YAML。 |
| 29 | Repository-level Policy | 補強 | [規格 8](specification.md#s8)：共用 policy 維護者與可信版本，Candidate 只能提案修改。 |
| 30 | Scope 的目前方向 | 保留 | [規格 8](specification.md#s8)：Observed scope＋risk escalation，保留少量真實權限限制。 |
| 31 | Risk-aware Change Observer | 補強 | [規格 8](specification.md#s8)：Risk observer，區分事前阻擋與事後隔離。 |
| 32 | 可觀察的 Risk Signals | 保留 | [規格 8](specification.md#s8)：套件、API、generated、migration、fan-out、刪除、endpoint、env、CI、tests 訊號。 |
| 33 | Tool-call Observation | 補強 | [規格 9](specification.md#s9)：Tool observation 覆蓋與缺口，不能等同完整 audit。 |
| 34 | Harness Capability Model | 補強 | [規格 3](specification.md#s3)：Capability-aware Profile，不支援時明示且禁止靜默降級；契約見第 9 節。 |
| 35 | Verifier 必須在 Candidate 外 | 補強 | [規格 7](specification.md#s7)：Verifier 外置、pin version，保護執行環境與結果通道。 |
| 36 | Agent-written Tests 的角色 | 補強 | [規格 7](specification.md#test-value)：先重用有價值的 checks，新增測試檢查契約／反例／增量證據／成本，避免重述實作。 |
| 37 | Baseline | 修正 | [規格 7](specification.md#s7)：Baseline 比較 check identity／signature，不只比較通過數。 |
| 38 | Integration Verification | 保留 | [規格 10](specification.md#s10)：整合 tree 重驗，無文字衝突不代表沒有語意衝突。 |
| 39 | 多 Candidate Selection | 分期 | [規格 10](specification.md#s10)：首版單 Candidate；未來人選或明確 selection policy。 |
| 40 | Daily Check-in 範例 | 保留 | [規格 13](specification.md#s13)：每日簽到例子，補契約缺口與後端界線。 |
| 41 | 對應 Verification | 補強 | [規格 13](specification.md#s13)：UI／RPC／reload 情境，加觀察窗與 request scope。 |
| 42 | Hardcode Detection | 保留 | [規格 8](specification.md#s8)：Dynamic probe＋static risk；有限案例不等於全面排除 hardcode。 |
| 43 | Human Interaction Model | 保留 | [規格 4](specification.md#s4)：開始、重大例外、結果三個人類介入點。 |
| 44 | Evidence Summary | 修正 | [規格 11](specification.md#s11)：摘要由 PROVED 改為指定情境已驗證，明示未知阻擋。 |
| 45 | Evidence Information Levels | 保留 | [規格 11](specification.md#s11)：L0～L3 摘要、需求證據、執行、原始稽核。 |
| 46 | Audit Trail | 調整 | [規格 11](specification.md#s11)：任務期間核對授權、Candidate、Gate 與模型紀錄；明確完成後清除，不永久稽核。 |
| 47 | Hash Chain | 修正 | [規格 11](specification.md#s11)：Hash chain 不自行防偽造，加入 canonical encoding／可信 checkpoint。 |
| 48 | Tamper-evident，而非 Tamper-proof | 保留／限縮 | [規格 3](specification.md#s3)：威脅模型不含主機 root；本版不導入外部 anchoring，限制見第 11 節。 |
| 49 | Human Approval 也是 Evidence | 補強 | [規格 5](specification.md#s5)：Human approval 綁 actor／reason／scope／digest／期限。 |
| 50 | Evidence Retention | 替換 | [規格 11](specification.md#task-storage)：全部資料放專案內，任務明確完成即清除；不採分類長期保存或 CI artifacts。 |
| 51 | 不把歷史全部寫進 Git | 調整 | [規格 11](specification.md#task-storage)：Git 放共用設定及 CI 必要精簡契約，raw Run 資料不入 Git；刪檔不抹除歷史。 |
| 52 | Provider Concurrency | 補強 | [規格 12](specification.md#s12)：Lease／heartbeat／expiry／fencing，接收端拒絕舊 worker。 |
| 53 | Queue | 調整 | [規格 12](specification.md#s12)：Filesystem queue 保留替代，建議單機 SQLite；補 crash／durability 條件。 |
| 54 | Model Route Evidence | 補強 | [規格 9](specification.md#s9)：Requested／observed model 分開，來源與 unknown 必須記錄。 |
| 55 | UX 原則 | 保留 | [規格 11](specification.md#s11)：摘要先行、證據展開；正常靜默，例外中斷見第 4／8 節。 |
| 56 | 不要求工程師學新的 DSL | 保留 | [規格 6](specification.md#s6)：不要求工程師學 DSL，IR 是機械介面。 |
| 57 | 不要求工程師每 Task 寫 Scope | 保留 | [規格 8](specification.md#s8)：不逐 Task 手寫 scope，共用 policy＋實際變更。 |
| 58 | 不要求所有 Requirement 可程式驗證 | 補強 | [規格 2](specification.md#s2)：能程式化者必須程式化；HUMAN_ONLY／PARTIAL 的人工部分可附模型參考，不能假裝自動通過。 |
| 59 | PROVED 的定義 | 修正 | [規格 2](specification.md#s2)：收斂證明用語；結果受 Candidate、情境、verifier 與環境限制。 |
| 60 | INCONCLUSIVE | 保留 | [規格 13](specification.md#s13)：Server reset 契約缺失不由 Agent 猜；需求 readiness 在第 2 節分離。 |
| 61 | 完整 State Model | 修正 | [規格 4](specification.md#task-lifecycle)：Task／Run／session 分開，完成位置為本機或 CI；清理可重試，結束 Run 不等於完成 Task。 |
| 62 | 初期 MVP | 縮減 | [規格 14](specification.md#s14)：OpenCode 為已指定方向；先 Core 驗證與本機清理，再接 CI，其餘細節仍待實作。 |
| 63 | MVP 支援範圍 | 分期 | [規格 14](specification.md#s14)：Web FE 保留；先六類模板，其餘 forms／CRUD／routing 等漸進擴充。 |
| 64 | MVP 自動 Discovery | 分期 | [規格 8](specification.md#s8)：Discovery 清單保留；依首個 repo 導入，不把所有語言工具都列首版完成條件。 |
| 65 | MVP Behavior Compiler | 補強 | [規格 6](specification.md#s6)：核心 compiler 假設加入 binding；實驗 E1／E2 見可行性 F5。 |
| 66 | MVP 不做 | 保留 | [規格 1](specification.md#s1)：企業平台、多團隊、完整 compliance 等不在首版。 |
| 67 | Product Success Criteria | 補強 | [規格 14](specification.md#s14)：Review compression 與缺陷偵測；加淨工時／成本門檻，詳 F5。 |
| 68 | 設計取捨總結 | 保留 | [規格 1](specification.md#s1)：Runtime-first、programmatic-first、risk-aware、agnostic、progressive autonomy。 |
| 69 | 最大的架構風險 | 補強 | [規格 14](specification.md#s14)：需求誤解、compiler 泛化、capability、錯誤安全感、疲乏，轉成 F1／F3／F5 風險與實驗。 |
| 70 | 目前方向 | 保留 | [規格 1](specification.md#s1)：低文件負擔、跨 Harness 的執行治理方向。 |
| 71 | 最終架構 | 重組 | [規格 4](specification.md#s4)：流程重新排列；Core、adapter、verifier、evidence 分別詳第 3／6～12 節。 |
| 72 | 產品的一句話定義 | 保留 | [規格 1](specification.md#s1)：信任外部可核對證據的產品定義。 |
| 73 | 我認為目前最需要 Prototype 驗證的三件事 | 補強 | [規格 14](specification.md#s14)：三項核心 Prototype 保留，擴為 E1～E5 加上完整性與淨效益驗證。 |

## 本次補充、原稿未完整定義的契約

| 補充 | 位置 |
|---|---|
| Requirement 來源逐條對應與摘要分母 | [規格 6](specification.md#s6) |
| Project Binding、模板限制與 unsupported 行為 | [規格 6](specification.md#s6) |
| 授權 revision、人類決策通道與 API 權限分離 | [規格 5](specification.md#s5)、[規格 9](specification.md#s9) |
| Phase／verdict／acceptance／evidence validity 分層 | [規格 2](specification.md#s2) |
| Snapshot materials、交付 race 與舊證據失效 | [規格 5](specification.md#s5)、[規格 10](specification.md#s10) |
| Verifier 執行完整性、retry、flaky 與 reporter 防偽造 | [規格 7](specification.md#s7) |
| Hook 覆蓋與故障語意的官方查核 | [可行性 F2](feasibility-and-decisions.md#f2) |
| GitHub check 映射與 publisher 權限分離 | [規格 10](specification.md#s10) |
| 專案內資料、敏感資料遮蔽與完成清理 | [規格 11](specification.md#task-storage) |
| 故障復原、預算、成本與量測門檻 | [規格 12](specification.md#s12)、[可行性 F5](feasibility-and-decisions.md#f5) |

覆蓋檢查：原稿章節 1～73 均有對應。這代表章節與概念追溯完整，不代表本提案的技術已通過實作驗證。

<a id="discussion-updates"></a>
## 後續討論對照（v0.3）

| 討論重點 | 文件處理 | 位置 |
|---|---|---|
| 能程式化驗證的條件一定程式化 | 明訂 Gate A；缺 adapter／環境不能用模型信心補成通過 | [7.1](specification.md#s7) |
| 避免常數鏡像等為測而測 | 契約、反例、增量證據與成本；mutation 分數不代替測試價值 | [7.1.1](specification.md#test-value) |
| 乾淨環境提供模型信心參考 | 新 reviewer session、受控設定與唯讀證據；confidence 是未校準自報值 | [7.3](specification.md#structured-review) |
| 不限定 Jev，回覆能通過 Zod 驗證 | 嚴格回傳結構、有限修正、criterion／evidence／Candidate 對應檢查 | [7.3.2](specification.md#structured-review) |
| 先處理 OpenCode 使用情境 | Plugin＋按需 runtime＋獨立 workers；CLI 先完成驗證切片 | [9.5](specification.md#opencode) |
| Runtime session 是否獨立、完成後是否保留 | Task／Run／session／程序分離，共用 runtime 不共用任務授權；完成清除 | [2](specification.md#s2)、[4.2](specification.md#task-lifecycle) |
| 資料都放專案，不另存遠端 | 移除分類長期 retention、遠端 artifacts、永久收據需求 | [11.3](specification.md#task-storage) |
| 需要 CI 就在 CI 明確結束任務 | CI 新 Run 重驗；明確完成步驟與 Git／本機副本清理分開 | [10.1](specification.md#ci-completion) |
| 尚未解決的生命週期細節 | D16：Git 最終版本與本機清理；D17：未完成 Task 的容量、逾期與丟棄 | [F6](feasibility-and-decisions.md#f6) |
