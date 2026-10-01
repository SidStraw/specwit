# AI Engineering Execution Governance Framework  
**工程 AI 執行治理框架 — 產品與技術規格草案**

**文件狀態：** Concept / Architecture Draft  
**目的：** 整理目前討論形成的完整架構、原始理念、設計取捨、產品定位與 MVP 方向。  
**注意：** 本文件描述的是目前設計方向，不代表已完成實作；部分機制仍需 Prototype 驗證。

---

# 1. 背景

Coding Agent 的能力已逐漸從：

```text
產生一段程式碼
```

演進為：

```text
理解 Repository
→ 修改多個檔案
→ 執行指令
→ 撰寫測試
→ 修正失敗
→ 自行判斷完成
```

Codex、Claude Code、OpenCode、Pi 等 Harness 已能自主完成大量工程任務。

目前真正逐漸形成瓶頸的，不再只是「AI 能不能寫」，而是：

> **工程師如何知道 AI 實際完成的結果，真的符合原始目標，而不是只有表面上正常？**

最危險的錯誤通常不是：

```text
build fail
type error
頁面直接壞掉
```

這些很容易發現。

而是：

```text
原本應由 config 動態取得的值被 hardcode
原本 Server authoritative 的狀態被 Frontend 自行推導
Agent 為了解決 A，順手修改高影響範圍的 B
implementation 與 Agent 自己寫的 test 同時誤解 Requirement
功能 happy path 正常，但 failure / reload / concurrency 行為錯誤
Agent 宣稱 test 通過，但實際 verifier 沒有完整執行
```

這些問題讓目前實務上即使 AI 已完成 80～90% 工作，資深工程師仍常需要重新閱讀大量 diff。

本框架試圖解決的就是：

> **如何在不要求工程師重新人工驗證所有 AI 工作的情況下，建立足夠可信的執行證據。**

---

# 2. 原始設計理念

原始治理架構最重要的理念不是「用另一個 AI Review AI」。

而是：

> **不相信任何只存在於 Prompt、Skill、Agent instruction 裡的要求。**

例如：

```text
請不要 hardcode
請記得跑 test
請不要修改 payment module
請使用 generated API client
請務必處理 error state
```

這些都只是：

```text
Model instruction
```

模型可能：

- 遺忘；
- 誤解；
- 跳過；
- 自行合理化；
- 在 context 壓縮後失去；
- 正確執行 9 次、第 10 次漏掉。

因此核心原則是：

> **可以由外部程式觀察與驗證的事情，就不要依賴模型自律。**

例如：

```text
Agent 說 tests passed
```

不算證據。

Controller 實際執行：

```bash
pnpm test
```

並取得：

```text
exit 0
```

才算。

同樣：

```text
Agent 說沒有修改 dependency
```

不算。

應直接比較：

```text
package.json
lockfile
dependency graph
```

---

# 3. 核心定位

本產品不是新的 Coding Agent Harness。

它不與：

- Codex
- Claude Code
- OpenCode
- Pi

競爭。

它定位在：

```text
Engineering Task
       │
       ▼
┌─────────────────────────┐
│ Execution Governance    │
│                         │
│ authorization           │
│ observation             │
│ verification            │
│ evidence                │
│ risk control            │
└────────────┬────────────┘
             │
             ▼
   Coding Agent Harness
```

更精確地說：

> **一個位於工程任務與 Coding Agent Harness 之間的 AI Engineering Execution Governance Runtime。**

---

# 4. 不做什麼

這個邊界非常重要。

本框架不是：

- Jira / Linear 的替代品；
- OpenSpec 的替代品；
- Requirement Management System；
- Figma 管理工具；
- QA Management System；
- 新的 Coding Agent；
- 新的 CI 平台；
- 要求所有團隊採用 SDD 的框架。

它治理的是：

> **Task 已經存在之後，Agent 的工程執行。**

---

# 5. 與 OpenSpec / SDD 的關係

OpenSpec / SDD 主要解決：

```text
要做什麼？
為什麼做？
怎麼拆？
規格是什麼？
Task 是什麼？
```

Governance Framework 主要解決：

```text
Agent 實際做了什麼？
有沒有超出合理範圍？
哪些 Requirement 真正被驗證？
哪些仍然沒有證明？
執行結果是否可信？
```

因此：

```text
OpenSpec / Jira / Prompt / Human
                │
                │ Intent
                ▼
       Governance Runtime
                │
                │ Controlled execution
                ▼
       Codex / Claude / etc.
```

有 OpenSpec 時可以直接將它作為 intent source。

沒有 OpenSpec 時同樣必須能運作。

例如：

```text
工程師直接貼 Jira
工程師貼 PM 規格
工程師描述 Task
GitHub Issue
甚至只是一段 prompt
```

都可以成為輸入。

### 關鍵差異

如果 Governance 最後只是：

```text
讀 Spec
→ 產 Task
→ 提醒 Agent
→ 再讓另一個 Agent review
```

那沒有足夠存在價值。

它值得存在的最低條件是：

> **能從 Agent 外部觀察執行事實，並將部分 Requirement 轉化成可重複執行的證據。**

---

# 6. 核心信任模型

整體系統將元件分為兩大 Trust Boundary。

## 6.1 Trusted Control Plane

```text
Governance Controller
Authorization
Policy
Verifier
Evidence Store
Audit Signer
```

這些元件決定：

- 任務允許如何執行；
- 哪些結果算 PASS；
- 哪些行為需要中斷；
- Evidence 如何保存。

## 6.2 Untrusted Execution Plane

```text
Codex
Claude Code
OpenCode
Pi
Agent-written code
Agent-written tests
Candidate repository
```

這裡的「Untrusted」不是表示 Agent 有惡意。

而是：

> **治理判定不能依賴它自身宣稱正確。**

---

# 7. 原始架構中的重要概念

原始設計包含數個值得保留的元素。

## 7.1 Immutable Authorization

一次 Run 必須知道：

```text
誰允許這件事
基於哪個 Task
基於哪個 Repository state
使用哪套 Policy / Verifier
```

Authorization 一旦開始執行，不應被 Run 自己修改。

推薦包含：

```text
task reference
base commit
policy version/hash
verifier version/hash
expiration
run limits
```

---

## 7.2 Hook 只負責 Trigger

例如：

```text
GitHub webhook
Jira webhook
Harness hook
```

不能因為收到事件就代表：

```text
事件內容本身具有執行權限
```

應為：

```text
Trigger
   ↓
Controller
   ↓
Authorization / Policy Decision
```

---

# 8. Controller

Controller 是整個系統真正的核心。

負責：

- 建立 Run；
- snapshot base state；
- 控制 Harness；
- 收集 mutation；
- 啟動 verifier；
- 判定 Gate；
- 管理 risk escalation；
- 保存 evidence；
- 建立 audit trail；
- 控制 Candidate 是否可以成為最終輸出。

Controller 應該：

> **對單次 Run 版本固定。**

而不是「永遠不能更新」。

例如：

```text
controller-v3
controller-v4
```

歷史 Run 永遠知道當時使用哪一版。

---

# 9. Harness Architecture

Governance 不應綁定特定 Coding Agent。

核心介面概念上可以是：

```ts
interface HarnessAdapter {
  capabilities(): HarnessCapabilities

  execute(input: AgentRunInput):
    AsyncIterable<HarnessEvent>

  abort(runId: string): Promise<void>
}
```

支援：

```text
CodexAdapter
ClaudeCodeAdapter
OpenCodeAdapter
PiAdapter
```

Controller 只關心：

```text
Input
workspace
task
capabilities

Output
events
candidate
observed model
exit state
```

而不需要理解 Harness 內部 agent loop。

---

# 10. 本機開發整合

日常工程師不應被要求放棄慣用工具。

理想體驗：

```text
工程師 A → Codex
工程師 B → OpenCode
工程師 C → Claude Code
```

全部可以接相同 Governance Core。

架構：

```text
           Codex Plugin
               │
        OpenCode Plugin
               │
      Claude Code Hooks
               │
               ▼
             govd
               │
     Governance Controller
```

---

# 11. Plugin / Hook / MCP 的分工

三者不應混在一起。

## Skill

用途：

```text
教模型怎麼與 Governance 合作
```

例如：

```text
遇到 scope conflict 時使用 request-expansion
```

但 Skill：

> **不能作為 enforcement。**

---

## MCP

提供 Agent 主動操作 Governance 的能力。

例如：

```text
gov_status
gov_get_findings
gov_request_expansion
gov_submit_candidate
```

MCP 是 API。

不是信任邊界。

---

## Hook / Plugin

負責攔截真正 execution path。

例如：

```text
Agent
 ↓
tool.execute
 ↓
PreTool Hook
 ↓
Governance
```

這一層才能做到：

```text
ALLOW
DENY
ESCALATE
```

---

# 12. govd

推薦最終架構：

```text
                Coding Harness
                     │
           Plugin / Hook / MCP
                     │
                     ▼
                  govd
                     │
        ┌────────────┼────────────┐
        ▼            ▼            ▼
      Policy       Verifier     Evidence
```

真正可信的：

- policy；
- signer；
- verifier；
- audit log；

不應放在 Agent 可修改的 project workspace 中。

---

# 13. CI / Cloud 模式

本機整合重視：

```text
Developer UX
```

CI 則重視：

```text
authoritative verification
```

因此：

```text
Local Plugin
```

即使可以被開發者繞過，也沒關係。

最後：

```text
GitHub Required Check
```

仍然可以作為真正的 enforcement boundary。

---

# 14. Pi / Headless Runner

CI / Cloud 不需要：

- TUI；
- interactive permission UI；
- Desktop App；
- 人類 session UX。

因此可以使用較輕量的 Harness，例如 Pi，作為：

> **Reference Headless Runner**

例如：

```text
GitHub Actions
      │
      ▼
     gov
      │
      ▼
     Pi
      │
      ▼
LLM Provider
```

Pi 仍然只是 executor。

Governance policy 不屬於 Pi。

---

# 15. 三種執行模式

## Developer Mode

```text
人類 + Coding Harness
```

適合日常開發。

重點：

- 低干擾；
- runtime observation；
- verification summary；
- risk escalation。

---

## CI Mode

```text
PR
 ↓
Governance
 ↓
Verifier
 ↓
Required Check
```

作為 authoritative Gate。

---

## Autonomous Worker Mode

```text
Jira / GitHub / Sentry
        ↓
Governance Queue
        ↓
Ephemeral Worker
        ↓
Pi / other Harness
        ↓
Candidate PR
```

適合未來更高自治程度。

---

# 16. Task Intake

沒有 SDD 時，工程師可以直接提供：

```text
PM 規格
Jira Issue
Figma
Backend Proto
Prompt
```

以「每日簽到」為例：

```text
PM Spec
Design
gRPC Proto
Existing Repository
```

Framework 第一階段不是立刻讓 Writer 修改程式。

而是先做：

> **Task Intake / Requirement Normalization**

---

# 17. Requirement Normalization

系統嘗試把自然語言需求分成：

```text
PROVABLE
PARTIALLY_PROVABLE
HUMAN_ONLY
INCONCLUSIVE
```

例如：

| Requirement | 分類 |
|---|---|
| 未簽到顯示 CTA | PROVABLE |
| CheckIn 僅送一次 | PROVABLE |
| Error 不得顯示完成 | PROVABLE |
| Reload 從 Server 恢復 | PROVABLE |
| Figma layout | PARTIAL |
| 動畫有「獎勵感」 | HUMAN_ONLY |
| PM 要求 Server timezone，但 Proto 沒提供 | INCONCLUSIVE |

---

# 18. Behavior IR

這是目前方向中最重要、同時也最需要驗證的技術核心。

前面的：

```text
STATE available
RPC GetStatus -> AVAILABLE
EXPECT ...
```

只是討論中的 pseudo-DSL。

**目前沒有決定要發明專用語言。**

真正需要的是一個 Machine-readable IR。

例如：

```json
{
  "id": "checkin-failure",
  "precondition": {
    "GetStatus": "AVAILABLE"
  },
  "action": {
    "click": "check-in"
  },
  "stub": {
    "CheckIn": "ERROR"
  },
  "expect": [
    "error-visible",
    "completed-absent"
  ]
}
```

它主要給：

```text
Controller
Verifier Compiler
Evidence System
```

使用。

---

# 19. Engineer Review View

工程師**不應該直接閱讀 IR**。

正常 UI 應 render 成：

> CheckIn 失敗 → 顯示錯誤，而且不能進入完成狀態

例如：

### Daily Check-in

| 系統理解的行為 | 可驗證性 |
|---|---|
| 未簽到時顯示簽到 | 自動 |
| 點擊只發送一次 CheckIn | 自動 |
| Pending 時不可再次送出 | 自動 |
| 成功顯示完成 | 自動 |
| 失敗不能顯示完成 | 自動 |
| Reload 以 Server 為準 | 自動 |
| Figma 視覺 | 部分 |
| 動畫品質 | 人工 |

工程師只需要：

```text
Confirm
Edit understanding
```

---

# 20. 為什麼需要人確認 Behavior

自然語言 → Behavior IR 的過程本身可能由 LLM 完成。

因此不能：

```text
LLM 讀 Spec
↓
LLM 寫 verifier
↓
相信 verifier
```

否則只是將信任問題往前移。

目前方向是：

```text
Natural language
      ↓
LLM normalization
      ↓
Small Behavior IR
      ↓
Human confirmation
      ↓
Freeze
      ↓
Deterministic verifier generation
```

工程師確認的是：

> 「需求是不是被理解正確？」

而不是：

> 「這 300 行 Playwright 寫對了嗎？」

---

# 21. Verifier

Behavior IR freeze 後，由受信任的 verifier compiler 產生驗證。

以 Web Frontend 為例可能使用：

```text
Playwright
Vitest
mock server
RPC interception
AST analysis
dependency graph
Git
TypeScript Compiler
```

---

# 22. Gate A

Gate A 是 deterministic verification。

只能依賴：

```text
observable result
exit status
structured evidence
```

不依賴自然語言自述。

典型內容：

```text
typecheck
lint
build
unit tests
integration tests
E2E
contract validation
filesystem invariants
dependency diff
generated-file integrity
public API diff
scope mutation
```

---

# 23. Gate A 的判定

原始架構中特別保留：

```text
PASS
FAIL
INCONCLUSIVE
```

三態。

這很重要。

例如：

```text
test assertion failed
```

是：

```text
FAIL
```

而：

```text
Playwright infrastructure crash
Browser 無法啟動
Verifier dependency 遺失
```

是：

```text
INCONCLUSIVE
```

不能把「不知道」當成成功。

---

# 24. Gate B

仍然存在許多無法 deterministic 驗證的事情，例如：

```text
Architecture 是否合理
Abstraction 是否惡化
Requirement 是否被微妙重新解釋
是不是為了目前資料 hardcode
設計意圖是否被破壞
```

這些交給：

```text
Semantic Review
```

也就是 Gate B。

可由不同模型 / Harness 執行。

例如：

```text
Writer = Codex
Reviewer = Claude

或

Writer = OpenCode
Reviewer = Codex
```

---

# 25. Gate B 的定位

Gate B 不應被視為 correctness proof。

更合理的定位是：

> **Invariant Discovery Layer**

流程：

```text
Gate B 發現問題
        ↓
Human confirms
        ↓
能形式化？
     /       \
   Yes        No
    │          │
Gate A Rule   Semantic Rule
```

長期目標是：

> **逐漸把已知問題從 probabilistic review 移入 deterministic verification。**

---

# 26. Candidate

Writer 不直接修改 authoritative branch。

推薦：

```text
Base Repository
      ↓
Private worktree / clone
      ↓
Agent
      ↓
Candidate
```

Candidate 可能是：

```text
commit
tree hash
patch
```

Controller 對 Candidate 驗證後，再決定：

```text
Apply
PR
Discard
```

---

# 27. Sandbox

Private clone 與 scoped HOME 只能提供 workspace isolation。

不是完整 security boundary。

真正需要安全隔離時應使用：

```text
container
VM
OS sandbox
```

尤其 autonomous / cloud run。

Agent 執行：

```text
npm install
npm test
shell script
compiler plugin
```

本質上都可能執行 repository-controlled code。

---

# 28. Repository Discovery

一個非常重要的取捨是：

> **工程師不應每個 Task 手寫 governance YAML。**

例如下面這種：

```yaml
deny:
  - payment/**
  - auth/**
```

不適合作為日常工作方式。

Framework 應該優先從 Repo 自動 discovery：

```text
CODEOWNERS
git history
tsconfig
package boundaries
dependency graph
generated headers
CI workflow
existing tests
lint config
OpenAPI / proto / GraphQL schema
```

---

# 29. Repository-level Policy

真正需要人工定義的治理知識應該盡量是：

> **一次定義、所有 Task 重用。**

例如：

```text
Auth / Payment / Checkout → Critical
Migration → Human review
Dependency change → Elevated
Generated source → Read-only
Deployment config → Human approval
```

而不是每張 Task 重複寫。

---

# 30. Scope 的目前方向

原本討論曾傾向：

```text
Task 開始前先列 allow / deny path
```

但這不符合實際工程工作。

因為工程師自己也常無法事前精確知道：

```text
最後會碰哪些檔案。
```

因此目前方向改為：

> **Observed Scope + Risk-aware Escalation**

---

# 31. Risk-aware Change Observer

例如 Agent 修改：

```text
src/features/daily-checkin/*
```

分析得到：

```text
feature-local
low fan-out
```

正常繼續。

Agent 修改：

```text
src/shared/request.ts
```

Dependency Graph：

```text
212 transitive dependents
auth
payment
checkout
event
```

此時才：

```text
High-impact change detected

[Allow]
[Inspect]
[Reject]
```

而不是事前要求工程師宣告：

```yaml
approval_required:
  - src/shared/**
```

---

# 32. 可觀察的 Risk Signals

第一版可以利用：

```text
Dependency additions/removals
lockfile changes
public API changes
generated source mutation
migration changes
critical CODEOWNERS areas
high fan-out files
large deletion
unusually large diff
new network endpoint
new environment variable
CI config change
build config change
test removal
```

這些都不依賴 Agent 是否記得 Prompt。

---

# 33. Tool-call Observation

Harness 支援時，可以觀察：

```text
file.write
file.delete
shell.execute
network call
MCP invocation
permission request
```

但需要注意：

> Harness Hook 不是最終 authoritative trust boundary。

因為不同 Harness capability 不同。

所以 Adapter 應宣告：

```text
preToolInterception
structuredEvents
abort
readOnlyMode
sandboxSupport
observedModel
```

---

# 34. Harness Capability Model

不要假裝所有 Harness 能力完全一樣。

例如：

```ts
{
  preToolInterception: true,
  structuredEvents: true,
  interactiveApproval: false,
  sandboxSupport: true
}
```

某治理 Profile 如果要求：

```text
preToolInterception = true
```

而 Harness 不支援：

```text
INCONCLUSIVE / unsupported profile
```

---

# 35. Verifier 必須在 Candidate 外

非常重要。

如果 Candidate 可以修改：

```text
verify.sh
tests
config
```

然後 Gate A 直接相信它，

Agent 理論上可以：

```bash
exit 0
```

因此：

```text
Trusted Verifier
       │
       ▼
Untrusted Candidate
```

Verifier 最好：

```text
外置
hash-pinned
versioned
```

---

# 36. Agent-written Tests 的角色

Agent 可以寫：

```text
unit tests
component tests
regression tests
```

這些仍然有價值。

但不能作為唯一 evidence。

因為：

```text
implementation
+
test
```

可能同時基於相同錯誤理解。

因此至少要區分：

```text
Repository Tests
Governance Acceptance Verifiers
```

---

# 37. Baseline

對多年運作的 Legacy / Production Repo，開始前應先建立 baseline。

例如：

```text
Base

typecheck PASS
unit 983 PASS / 2 FAIL
build PASS
```

Candidate：

```text
985 PASS / 2 FAIL
```

就能區分：

```text
existing failure
new regression
```

---

# 38. Integration Verification

如果存在多 Candidate 或多 Task：

```text
Candidate A
Candidate B
Candidate C
```

每個獨立 PASS 不代表 merge 後 PASS。

因此需要：

```text
Candidates
    ↓
Integration Tree
    ↓
Final Gate A
    ↓
Final Gate B
```

Git merge 只能找到：

```text
text conflict
```

找不到：

```text
semantic conflict
```

---

# 39. 多 Candidate Selection

如果：

```text
A PASS
B PASS
C PASS
```

「選誰」本身就是 governance decision。

Policy 必須定義，例如：

```text
first passing
minimum diff
human selection
```

MVP 建議：

> **Human select 或 deterministic first-pass。**

避免讓 Reviewer 自己隱性選擇。

---

# 40. Daily Check-in 範例

假設：

```text
PM 規格
Figma
gRPC Proto
Vue Frontend Repo
```

Task Intake 後得到：

```text
未簽到顯示 CTA               PROVABLE
CheckIn 只能送一次            PROVABLE
Pending 禁止再次送出          PROVABLE
Success → completed           PROVABLE
Failure → not completed       PROVABLE
Reload → Server authoritative PROVABLE
Figma fidelity                PARTIAL
Animation quality             HUMAN
```

---

# 41. 對應 Verification

例如：

```text
GetStatus = AVAILABLE
↓
open page
↓
CTA enabled
```

：

```text
click twice
↓
observe CheckIn RPC
↓
count == 1
```

：

```text
CheckIn = ERROR
↓
completed absent
error visible
```

：

```text
localStorage = CHECKED
GetStatus = AVAILABLE
reload
↓
UI = AVAILABLE
```

最後都由外部 verifier 判斷。

---

# 42. Hardcode Detection

Hardcode 無法單靠：

```text
搜尋所有 literal
```

解決。

目前方向包含兩層。

## Dynamic Probe

Requirement 若描述：

```text
值來自 config
```

Verifier 可以測：

```text
config = 1
config = 3
config = 7
```

確定 output 跟著變化。

這比檢查：

```text
是否出現 literal 3
```

可靠。

---

## Static Risk Analysis

新增 business constant：

```ts
const TIMEZONE = 'Asia/Taipei'
```

如果：

```text
沒有 config/API/prop source
但流入核心 business logic
```

可以產生：

```text
Risk Finding
```

不一定直接 FAIL。

交給 Gate B / Human。

---

# 43. Human Interaction Model

正常 Run 最理想只需要三個介入點。

---

## Phase 1：開始前

只看：

> **系統認為 Task 要達成什麼？**

例如：

```text
7 automatic
2 human
```

約 5～15 條 behavior。

---

## Phase 2：執行中

正常路徑：

```text
zero interruption
```

只有：

```text
dependency change
critical module
high fan-out
schema/migration
unexpected contract change
```

才打斷人。

---

## Phase 3：完成後

工程師看：

> **哪些已經被證明？哪些仍然需要我？**

---

# 44. Evidence Summary

例如：

```text
Daily Check-in
Candidate a831de2

PROVED              6
HUMAN REVIEW        2
FAILED              0
INCONCLUSIVE        0
```

下面只顯示摘要。

---

# 45. Evidence Information Levels

避免把工程師淹沒在 log 中。

## Level 0 — Summary

```text
6 PROVED
2 HUMAN
Risk: Low
```

## Level 1 — Requirement Evidence

```text
RPC failure must not complete

PASS

CheckIn → INTERNAL
Completed → absent
Error → visible
```

## Level 2 — Execution

```text
Verifier frontend-web-v3
Playwright
exit 0
candidate abc123
```

## Level 3 — Raw Audit

```text
tool calls
process events
file mutation
stdout
```

正常工程師幾乎不需要看 Level 3。

---

# 46. Audit Trail

這是原始設計中另一個核心。

每個重要 decision 應被記錄：

```text
task source
base commit
candidate
authorization
policy version
verifier version
Gate result
risk escalation
human approval
observed model
final commit
```

---

# 47. Hash Chain

原始架構建議：

```text
hash = SHA256(previous_hash + event)
```

產生 tamper-evident event chain。

Signing key：

> 不應交給 Agent / Run writer。

這能防止 Agent：

```text
修改歷史 log
偽造 PASS
刪除某次 mutation
```

---

# 48. Tamper-evident，而非 Tamper-proof

如果：

```text
Controller
Event Store
Signing Key
```

都在同一台主機，

root 仍然可能完整重建歷史。

因此 MVP 的威脅模型應明確定位：

> **主要防止 Agent / Candidate 修改治理證據。**

若未來需要 Compliance：

```text
external append-only store
external hash anchoring
KMS signing
```

可以再增加。

---

# 49. Human Approval 也是 Evidence

例如：

```text
Agent wants to modify:
src/shared/request.ts

212 dependents
```

工程師：

```text
Allow
```

不能只存在 chat。

要變成：

```text
scope_escalation_approved
candidate_before
reason
actor
time
```

未來事故可以回答：

> 為什麼這張 Task 當時允許修改 shared request？

---

# 50. Evidence Retention

不是所有資料都應永久保存。

推薦：

### Long-lived

```text
Run manifest
Authorization
Policy hashes
Candidate hash
Gate results
Human decisions
Audit root
```

### Medium retention

```text
Verifier stdout
screenshots
semantic findings
```

### Short-lived / Optional

```text
Full Agent transcript
temporary workspace
raw tool stream
```

---

# 51. 不把歷史全部寫進 Git

Repository 中推薦只保存：

```text
.governance/
  project policy
  verifier config
```

Run data 放：

```text
local SQLite
CI artifacts
object storage
governance service
```

不要形成：

```text
governance-history/
 thousands of markdown files
```

---

# 52. Provider Concurrency

原始架構中有 Provider Slot 概念。

不建議在長時間 Agent Run 中維持 DB transaction。

應使用：

```text
lease
expiry
heartbeat
fencing token
```

例如：

```text
slot acquired
↓
commit
↓
Agent run
↓
heartbeat
↓
release
```

Worker crash 後 lease 自動到期。

---

# 53. Queue

單機 / MVP 完全不需要 Kafka。

Filesystem queue 可以是：

```text
pending/
running/
completed/
failed/
```

使用：

```text
atomic rename
```

claim task。

未來需求成長再換 DB / Queue Service。

---

# 54. Model Route Evidence

建議區分：

```text
requested_model
observed_model
```

不要相信：

```text
模型自己回答「我是 XXX」
```

應盡可能從：

```text
provider metadata
CLI metadata
API response
adapter observation
```

取得。

---

# 55. UX 原則

整個產品能不能活下來，最大的因素可能不是驗證引擎，而是：

> **不要讓 Governance 自己成為新的 review 負擔。**

核心原則：

### Normal path

```text
silent
```

### Exception path

```text
interrupt
```

### Review

```text
summary first
evidence on demand
```

---

# 56. 不要求工程師學新的 DSL

Machine IR 可以很嚴謹：

```json
{}
```

甚至未來可以存在 DSL。

但 Developer UX 不應暴露：

```text
STATE / EXPECT / TRANSITION
```

除非使用者主動需要。

工程師應看到：

> 「RPC 失敗時不能顯示完成狀態。」

---

# 57. 不要求工程師每 Task 寫 Scope

Task-specific allow / deny YAML 不符合現實。

Scope 應主要由：

```text
runtime observation
repository knowledge
dependency impact
risk policy
```

推導。

---

# 58. 不要求所有 Requirement 可程式驗證

這個限制必須明確承認。

像：

```text
動畫有獎勵感
Architecture 很優雅
視覺舒服
命名很好懂
```

不適合作為 deterministic Gate。

正確處理是：

```text
HUMAN_ONLY
```

而不是硬造一個 AI 綠勾。

---

# 59. PROVED 的定義

產品必須非常克制地使用「證明」。

例如：

```text
PROVED:
在 candidate abc123，
使用 verifier xyz，
給定 inputs A/B/C，
觀察結果符合 invariant。
```

不代表：

```text
功能在所有世界狀態下完全正確。
```

應避免讓 Evidence UI 製造錯誤安全感。

---

# 60. INCONCLUSIVE

這是非常重要的狀態。

例如：

```text
PM 要求 Asia/Taipei reset
Backend Proto 沒提供 reset/server-time semantics
```

不能讓 Agent自行：

```ts
dayjs().tz('Asia/Taipei')
```

補答案。

正確狀態：

```text
INCONCLUSIVE

Requirement cannot be implemented/verified
from currently available contract.
```

這時必須人介入。

---

# 61. 完整 State Model

最低限度：

```text
PENDING
AUTHORIZED
RUNNING
VERIFYING

PASS
FAIL
INCONCLUSIVE

WAITING_FOR_HUMAN
CANCELLED
DISCARDED
```

其中：

> **INCONCLUSIVE 永遠不能自動轉 completed。**

---

# 62. 初期 MVP

第一版不應試圖成為企業全套 Governance Platform。

推薦 MVP：

```text
Governance Core
+
OpenCode integration
+
Codex integration
+
Pi headless runner
+
GitHub CI integration
```

---

# 63. MVP 支援範圍

優先針對：

> **Web Frontend Development**

因為 observable behavior 相對容易形式化。

第一階段可以支援：

```text
UI states
form behavior
API/RPC invocation
loading
error
retry
routing
CRUD
reload
permission
duplicate submission
backend-authoritative state
```

---

# 64. MVP 自動 Discovery

至少：

```text
package manager
typecheck
lint
test
build
Git
dependency changes
generated files
CODEOWNERS
dependency graph
proto / OpenAPI
CI commands
```

---

# 65. MVP Behavior Compiler

最關鍵的實驗：

```text
Natural Requirement
       ↓
Behavior IR
       ↓
Human confirm
       ↓
Executable Web Verifier
```

如果這條鏈做不出足夠可靠的 Prototype，

產品與：

```text
OpenSpec + CI + AI reviewer
```

的差異就會顯著縮小。

這應該視為 **核心 Product Risk**。

---

# 66. MVP 不做

第一版不需要：

```text
Jira workflow management
PM dashboard
Figma lifecycle
QA management platform
multi-team orchestration
Kubernetes
Kafka
enterprise RBAC
full compliance system
```

---

# 67. Product Success Criteria

這個產品不應以：

```text
AI 產生更多 code
```

衡量成功。

真正指標應該接近：

### Review Compression

原本工程師需要人工確認 10 個行為。

現在：

```text
6 個有 deterministic evidence
4 個仍需人工
```

---

### Hidden Deviation Detection

能找到：

```text
hardcode
server/client authority drift
unexpected dependency
high-blast-radius mutation
missing error state
double submission
```

---

### Lower Human Review Cost

工程師 review 重心從：

```text
「這 800 行到底有沒有偷偷寫錯？」
```

變成：

```text
architecture
human-only requirement
risk findings
```

---

# 68. 設計取捨總結

## 文件化 vs Runtime

選擇：

> **Runtime-first**

不新增大量文件。

---

## Prompt Rules vs Programmatic Observation

選擇：

> **Programmatic-first**

Prompt 只是輔助。

---

## Strict Predefined Scope vs Runtime Risk

選擇：

> **Runtime risk-aware scope**

---

## One Harness vs Cross Harness

選擇：

> **Harness agnostic**

---

## Human Review vs Full Automation

選擇：

> **Progressive autonomy**

---

## Perfect Formal Verification vs Practical Evidence

選擇：

> **最大化可機械驗證比例，但承認剩餘 Human-only。**

---

# 69. 最大的架構風險

目前仍存在幾個尚未證明的核心問題。

## 69.1 Requirement → Behavior IR 的準確度

這可能是整個產品最大難題。

如果人類每次都需要大量修正 IR：

```text
Governance overhead > review saving
```

產品失敗。

---

## 69.2 Generic Verifier Compiler 的覆蓋率

是否真的能用一組抽象支援足夠多：

```text
Vue
React
different API stacks
different UI libraries
different testing environments
```

需要 Prototype。

---

## 69.3 Harness Interception Capability 不一致

部分 Harness：

```text
可以 PreToolUse
```

部分只能：

```text
觀察最後 diff
```

因此治理強度必須 capability-aware。

---

## 69.4 False Sense of Security

最大的產品風險之一是：

```text
6 PROVED
```

被理解成：

```text
整個功能完全正確。
```

UI 和命名必須非常克制。

---

## 69.5 Governance Fatigue

如果：

```text
每改一個 shared file 就 popup
每次 Agent 都問 permission
```

團隊最後會一直：

```text
Allow
Allow
Allow
```

治理直接失效。

所以 risk threshold 必須足夠精準。

---

# 70. 目前方向

經過目前討論後，產品方向已從：

> 「一套要求工程師先寫 Work Package / Scope / Contract 的治理流程」

明顯收斂為：

> **一套低文件負擔、Runtime-first、跨 Harness 的 AI Engineering Execution Governance Framework。**

核心特徵：

```text
不要求 SDD
不要求新的大量文件
不要求工程師手寫 scope
不要求工程師寫 verifier
不取代現有 Harness
不相信 Agent 自我報告
```

而應做到：

```text
理解現有 Task
↓
自動 discovery repository
↓
抽出可觀察 Requirement
↓
人確認精簡 Behavior
↓
Agent 正常工作
↓
Runtime observation
↓
deterministic verification
↓
semantic review
↓
Evidence summary
↓
human review remaining unknowns
```

---

# 71. 最終架構

```text
┌──────────────────────────────────────┐
│ Intent Sources                       │
│                                      │
│ Prompt / Jira / GitHub / OpenSpec    │
│ PM Spec / Figma / Proto              │
└───────────────────┬──────────────────┘
                    │
                    ▼
          ┌──────────────────┐
          │ Task Intake      │
          │ Normalization    │
          └────────┬─────────┘
                   │
                   ▼
          Requirement / Behavior IR
                   │
            Human Confirmation
                   │
                   ▼
╔══════════════════════════════════════╗
║ Governance Core                     ║
║                                      ║
║ Authorization                       ║
║ Repository Discovery                ║
║ Risk Engine                         ║
║ Runtime Observation                 ║
║ Verification                        ║
║ Evidence / Audit                    ║
╚══════════════════╤═══════════════════╝
                   │
          ┌────────┼────────┐
          ▼        ▼        ▼
       Codex    OpenCode   Claude
                   │
                  Pi
                   │
                   ▼
               Candidate
                   │
          ┌────────┴────────┐
          ▼                 ▼
       Gate A             Gate B
    deterministic       semantic
          │                 │
          └────────┬────────┘
                   ▼
            Evidence Summary
                   │
                   ▼
             Human Review
                   │
                   ▼
                PR / CI
```

---

# 72. 產品的一句話定義

目前我認為最準確的描述是：

> **讓 Coding Agent 可以自主工作，但不讓「模型說它做對了」成為我們相信它的理由。**

更正式一點：

> **AI Engineering Execution Governance Framework 透過 Runtime Observation、Deterministic Verification、Risk-aware Control 與可追溯 Evidence，將 Coding Agent 從「靠 Prompt 約束的自主執行者」轉化為「在可觀察、可驗證邊界內工作的工程執行器」。**

而與 OpenSpec / SDD 最關鍵的區隔則是：

> **SDD 主要強化「Agent 應該理解什麼」；這套框架主要強化「我們如何知道 Agent 實際做到了什麼」。**

---

# 73. 我認為目前最需要 Prototype 驗證的三件事

如果下一步真的要投入開發，我不會先做 Jira、Dashboard 或完整 Audit Server，而會先驗三個問題：

1. **能否從一張普通 FE Task，自動抽出 5～10 個有價值且工程師容易確認的 observable behaviors。**
2. **能否將其中常見 Web 行為穩定編譯成獨立於 Writer 的 executable verifier。**
3. **Runtime risk detection 能否只在真的值得注意時打斷工程師，而不是製造 permission fatigue。**

如果這三個成立，剩下的：

```text
Codex / OpenCode adapter
Pi runner
CI integration
Evidence storage
Jira integration
Cloud worker
```

大部分都屬於可以逐步工程化的問題。

如果第 1、2 點不成立，那無論外圍 architecture 做得多漂亮，最後都很容易退化成：

> **OpenSpec + CI + 第二個 AI Reviewer。**

而那就不是目前這套構想值得存在的理由。