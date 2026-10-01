import { simulate } from './simulation.js';

const layers = {
  intent: { number: '01', title: '先理解，再執行。', description: '把 Task、設計與 API 契約保存成來源快照，再整理成可確認的行為計畫。每條需求都有去向，未知也必須被看見。', responsibilities: ['Intent snapshot 保留來源位置、版本與 digest。', 'Behavior IR 表達預期行為；Project Binding 對應真實 UI、transport 與 fixture。', '人確認需求理解與關鍵 binding，凍結 plan。'], boundary: '自然語言的自動轉換準確度尚未證實。來源文件提供意圖，不會自動授予執行權。' },
  control: { number: '02', title: '自治需要可執行的規則。', description: 'Controller 管理授權與生命週期；Policy 定義限制；Observer 觀察變更。只有具體且重要的例外，才交回人類處置。', responsibilities: ['凍結政策、執行範圍、期限與成本上限。', '記錄授權 revision；擴大範圍需要新的決策。', '依實際 adapter 能力，選擇 Observe 或 Controlled 等保證範圍。'], boundary: '事後 diff 可以阻擋成果被接受，但無法撤銷已發生的網路傳送或遠端寫入。' },
  execution: { number: '03', title: '給 Agent 空間，也給執行邊界。', description: '沿用 Coding Harness，在隔離工作區產生成果。完成後停止或隔離寫入者，擷取不可變的 Candidate，交給下一階段。', responsibilities: ['Harness Adapter 回報事件、支援能力及 abort 結果。', '隔離憑證、檔案與網路權限；不把發布權交給 Candidate。', '凍結包含必要材料的快照，固定成果 digest。'], boundary: 'Hook 的存在不代表所有執行路徑都受控；中止主行程也不代表所有子行程確定停止。' },
  verification: { number: '04', title: '讓成果，接受外部驗證。', description: '在新的隔離快照，以受保護且固定版本的 Verifier Pack 驗證行為。Gate A 產生可機械判定結果，Gate B 揭露語意風險。', responsibilities: ['Gate A 比對畫面、請求、契約與變更 invariants。', 'Gate B 提供位置、理由與影響範圍，供人處置風險。', '核對預期 checks 是否全部執行，保留缺漏、retry 與未知。'], boundary: 'exit 0 或 Agent 自述 PASS 都不足以支持通過。有限情境也不能證明全面正確。' },
  delivery: { number: '05', title: '交付的，是證據所指的版本。', description: '把需求、Candidate、驗證環境與結果連成可追溯的摘要。接受政策綜合必要檢查、人工處置與授權，再交由獨立流程交付。', responsibilities: ['Evidence 顯示 PASS、FAIL、未知、未跑與人工項目。', '交付前重新核對 Candidate digest、目標 base 與 action grant。', 'base 更新或多份成果整合後，由 CI 驗證實際 integration tree。'], boundary: 'ELIGIBLE 表示具備接受資格，不代表已授權 apply、push、merge 或 deploy。' },
};
const architectureDetail = document.querySelector('#architecture-detail');
function selectLayer(key) {
  const layer = layers[key];
  document.querySelectorAll('[data-layer]').forEach(button => {
    const selected = button.dataset.layer === key;
    button.classList.toggle('selected', selected);
    button.setAttribute('aria-pressed', String(selected));
  });
  architectureDetail.innerHTML = `<span class="detail-number">LAYER ${layer.number} / RESPONSIBILITY</span><h3>${layer.title}</h3><p>${layer.description}</p><div class="detail-block"><h4>WHAT THIS LAYER DOES</h4><ul>${layer.responsibilities.map(item => `<li>${item}</li>`).join('')}</ul></div><div class="boundary-note"><strong>信任邊界</strong>${layer.boundary}</div>`;
}
document.querySelectorAll('[data-layer]').forEach(button => button.addEventListener('click', () => selectLayer(button.dataset.layer)));
selectLayer('control');

const steps = [
  ['把需求變成共同理解。', '保存來源、對應行為，標示待澄清與人工項目。工程師確認系統的理解，避免從一開始就驗錯目標。', 'Intent snapshot + Behavior IR', '例如：簽到請求失敗時，顯示錯誤，且不能短暫或最終顯示完成。'],
  ['固定這次工作的規則。', '確認 Project Binding、Verifier Pack 與政策，建立包含範圍、期限和動作限制的不可變授權。', 'Frozen plan + Authorization', '接入設定可以跨 Task 重用；必要的遠端動作仍有各自的權限。'],
  ['執行中觀察，遇例外再介入。', 'Harness 在隔離工作區實作。Observer 記錄範圍與契約變動，重要例外需要具體的人工處置。', 'Run events + Candidate', '成果完成後凍結快照；驗證期間不能同時修改相同 Candidate。'],
  ['讓獨立觀察支持結論。', '固定版本的外部驗證器執行 Gate A，並依政策加入 Gate B。缺漏、失敗與不確定都保留原始紀錄。', 'Verification attempts + Findings', '某次 retry 通過，不會抹去先前失敗；flaky 結果依預先設定的政策處理。'],
  ['先看摘要，再追到原始證據。', '從已驗證、失敗、未知與人工項目開始，展開需求對應、執行版本及原始紀錄。工程師處置剩餘風險。', 'Evidence + Human decision', '有些品質需要人判斷；人工確認不會被包裝為自動驗證通過。'],
  ['確認交付版本，也確認授權。', '接受資格、交付授權各自檢查。成果或 base 改變時，重新驗證最終整合版本，避免沿用過期證據。', 'Action grant + Integration check', '指定版本通過驗證，不會自動觸發 push、merge 或 deploy。'],
];
function selectStep(index) {
  document.querySelectorAll('[data-step]').forEach(button => {
    const active = Number(button.dataset.step) === index;
    button.classList.toggle('active', active);
    button.setAttribute('aria-pressed', String(active));
  });
  const [title, description, artifact, example] = steps[index];
  document.querySelector('#workflow-detail').innerHTML = `<div><h3>${title}</h3><p>${description}</p></div><div class="workflow-artifact"><span>OUTPUT / 本階段產物</span><strong>${artifact}</strong><p>${example}</p></div>`;
}
document.querySelectorAll('[data-step]').forEach(button => button.addEventListener('click', () => selectStep(Number(button.dataset.step))));
selectStep(0);

const scenarios = {
  config: { title: '當設定改了，畫面跟著改嗎？', description: '每日簽到天數應由設定決定。看起來正確的七天版面，可能藏著寫死的常數。', requirement: '畫面的日期格數量，必須跟隨 config.days 的合法值。', buggy: '有缺陷：永遠顯示 7 天', fixed: '已修正：讀取 config.days', label: '調整設定天數', options: [[1, '1 天'], [3, '3 天'], [7, '7 天']], value: 3 },
  pending: { title: '多點幾下，會送出幾次？', description: '網路回應還沒回來，使用者又按了簽到。透過請求數量，觀察 pending 保護是否生效。', requirement: '同一頁面在請求 pending 期間，重複點擊只能送出一次 CheckIn。', buggy: '有缺陷：每次點擊都送出請求', fixed: '已修正：pending 期間阻止重複送出', label: '快速點擊次數', options: [[2, '連續點擊 2 次'], [3, '連續點擊 3 次'], [5, '連續點擊 5 次']], value: 3 },
  stale: { title: '改過的版本，還能沿用綠勾嗎？', description: 'r1 通過驗證後又修改了程式。當交付版本與證據版本不同，歷史 PASS 仍然有效嗎？', requirement: '必要證據必須對應即將交付的 Candidate，版本改變時重新驗證。', buggy: '沿用紀錄：只保留 r1 的 PASS', fixed: '重新驗證：對目前版本取得證據', label: '準備交付的版本', options: [[1, 'r1 — 原本的成果'], [2, 'r2 — 修改過的成果'], [3, 'r3 — 再次修改的成果']], value: 2 },
};
let scenario = 'config';
const result = document.querySelector('#simulation-result');
const consoleState = document.querySelector('#console-state');
function clearResult(changed = false) {
  consoleState.textContent = 'READY';
  result.innerHTML = `<div class="empty-console"><div class="empty-symbol" aria-hidden="true">[ _ ]</div><h4>${changed ? '條件已更新，準備重新觀察。' : '讓結果，說明一切。'}</h4><p>左側是你的實驗條件，這裡是可追溯的觀察。<br>按下「執行模擬」，看看成果是否符合需求。</p><div class="console-preview"><span>01</span> &nbsp;固定輸入與成果版本<br><span>02</span> &nbsp;觀察行為與預期值<br><span>03</span> &nbsp;產生結論與接受狀態</div></div>`;
}
function selectScenario(key) {
  scenario = key;
  const data = scenarios[key];
  document.querySelector('#simulation-form').reset();
  document.querySelectorAll('[data-scenario]').forEach(button => {
    const active = button.dataset.scenario === key;
    button.classList.toggle('active', active);
    button.setAttribute('aria-pressed', String(active));
  });
  document.querySelector('#scenario-title').textContent = data.title;
  document.querySelector('#scenario-description').textContent = data.description;
  document.querySelector('#scenario-requirement').textContent = data.requirement;
  document.querySelector('#buggy-label').textContent = data.buggy;
  document.querySelector('#fixed-label').textContent = data.fixed;
  document.querySelector('#scenario-input').innerHTML = `<label class="field-label" for="fixture">${data.label}</label><select id="fixture">${data.options.map(([value, label]) => `<option value="${value}" ${value === data.value ? 'selected' : ''}>${label}</option>`).join('')}</select>`;
  clearResult();
}
document.querySelectorAll('[data-scenario]').forEach(button => button.addEventListener('click', () => selectScenario(button.dataset.scenario)));
document.querySelector('#simulation-form').addEventListener('change', () => clearResult(true));
document.querySelector('#reset-simulation').addEventListener('click', () => selectScenario(scenario));
document.querySelector('#simulation-form').addEventListener('submit', event => {
  event.preventDefault();
  const evidence = simulate({ scenario, implementation: new FormData(event.currentTarget).get('implementation'), value: document.querySelector('#fixture').value, environment: document.querySelector('#environment').value });
  const status = evidence.validity === 'STALE' ? 'STALE' : evidence.verdict;
  const tone = status === 'PASS' ? '' : status === 'FAIL' ? 'fail' : 'unknown';
  consoleState.textContent = 'COMPLETED';
  result.innerHTML = `<div class="result-heading"><span class="verdict ${tone}">${status}${status === 'STALE' ? ' · 歷史 PASS' : ''}</span><h4>${evidence.title}</h4><p>${evidence.description}</p></div><div class="observations">${evidence.observations.map(([label, value]) => `<div class="observation"><span>${label}</span><strong>${value}</strong></div>`).join('')}</div><ol class="trace-list">${evidence.trace.map((line, index) => `<li><span class="trace-index">0${index + 1}</span><span>${line}</span></li>`).join('')}</ol><div class="acceptance"><b>${evidence.acceptance}</b> · ${evidence.acceptance === 'ELIGIBLE' ? '此模擬的必要條件已滿足' : '阻擋自動接受'}<p>${evidence.reason}</p></div><details class="evidence-details"><summary>檢視證據範圍與版本</summary><dl><dt>Candidate</dt><dd>${evidence.candidate}</dd><dt>Verifier pack</dt><dd>${evidence.pack}</dd><dt>Binding</dt><dd>${evidence.binding}</dd><dt>Validity</dt><dd>${evidence.validity}</dd><dt>限制</dt><dd>${evidence.limitation}</dd></dl></details>`;
});
selectScenario('config');

const menu = document.querySelector('.menu-toggle');
const navigation = document.querySelector('#navigation');
function closeMenu() { menu.setAttribute('aria-expanded', 'false'); navigation.classList.remove('open'); }
menu.addEventListener('click', () => {
  const expanded = menu.getAttribute('aria-expanded') !== 'true';
  menu.setAttribute('aria-expanded', String(expanded));
  navigation.classList.toggle('open', expanded);
});
navigation.querySelectorAll('a').forEach(link => link.addEventListener('click', closeMenu));
document.addEventListener('keydown', event => { if (event.key === 'Escape' && menu.getAttribute('aria-expanded') === 'true') { closeMenu(); menu.focus(); } });
