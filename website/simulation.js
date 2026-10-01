// A bounded educational model. No real Agent, verifier, or project is executed.
export function simulate({ scenario, implementation = 'buggy', value, environment = 'ready' }) {
  if (!['config', 'pending', 'stale'].includes(scenario)) throw new Error('Unknown scenario');
  if (!['buggy', 'fixed'].includes(implementation)) throw new Error('Unknown implementation');
  const allowed = scenario === 'config' ? [1, 3, 7] : scenario === 'pending' ? [2, 3, 5] : [1, 2, 3];
  const input = Number(value);
  if (!allowed.includes(input)) throw new Error('Unsupported fixture');
  if (!['ready', 'interrupted'].includes(environment)) throw new Error('Unknown environment');
  const fixed = implementation === 'fixed';
  const candidate = `demo-candidate-r${scenario === 'stale' ? input : fixed ? 2 : 1}`;
  const base = { candidate, scenario, input, implementation, environment, simulated: true, pack: 'demo-pack@0.1', binding: 'daily-checkin-demo@0.1', limitation: '僅涵蓋此頁選定的簡化情境；不證明真實專案、後端冪等性或全面正確。' };
  if (environment === 'interrupted') return { ...base, verdict: 'INCONCLUSIVE', validity: 'INVALID', acceptance: 'BLOCKED', title: '無法判定，保留未知。', description: '觀察器中斷，沒有完整結果可支持通過或失敗。', observations: [['預期檢查', '1'], ['完整結果', '0']], trace: ['固定需求、輸入與 Candidate。', '開始觀察，但結果通道在完成前中斷。', '紀錄不完整，不以最後一行輸出推論 PASS。'], reason: '修復驗證環境後，對相同 Candidate 重新執行。' };
  if (scenario === 'config') {
    const actual = fixed ? input : 7;
    const pass = actual === input;
    return { ...base, verdict: pass ? 'PASS' : 'FAIL', validity: 'CURRENT', acceptance: pass ? 'ELIGIBLE' : 'BLOCKED', title: pass ? '此情境，行為符合契約。' : '畫面正常，行為卻偏離需求。', description: pass && !fixed ? '寫死的值恰好符合這次輸入。把設定改為 1 或 3，試試看。' : pass ? '顯示天數跟隨這次輸入的設定值。' : '外部觀察發現顯示值與設定值不同。', observations: [['輸入設定', `${input} 天`], ['實際顯示', `${actual} 天`]], trace: [`注入 fixture：config.days = ${input}。`, `執行${fixed ? '讀取設定' : '寫死常數'}的行為模型，觀察到 ${actual} 個日期格。`, `比對需求：${actual} ${pass ? '=' : '≠'} ${input} → ${pass ? 'PASS' : 'FAIL'}。`], reason: pass ? '本模擬只包含一項必要檢查，且無待處置人工項目。ELIGIBLE 不代表已授權交付。' : '修正實作、產生新 Candidate，再重新驗證。' };
  }
  if (scenario === 'pending') {
    let pending = false;
    let requests = 0;
    for (let index = 0; index < input; index++) {
      if (fixed && pending) continue;
      requests++;
      pending = true;
    }
    const pass = requests === 1;
    return { ...base, verdict: pass ? 'PASS' : 'FAIL', validity: 'CURRENT', acceptance: pass ? 'ELIGIBLE' : 'BLOCKED', title: pass ? '等待回應時，阻止重複送出。' : '一次操作意圖，多次請求。', description: '模擬回應保持 pending，同一頁面快速觸發簽到。', observations: [['快速點擊', `${input} 次`], ['送出請求', `${requests} 次`]], trace: ['設定 CheckIn 回應維持 pending。', `${input} 次啟動事件依序進入行為模型，${fixed ? 'pending guard 阻止後續送出' : '每次都建立新的請求'}。`, `觀察窗內 request count = ${requests}；必要條件為 1。`], reason: pass ? '此結果只涵蓋同頁 pending 期間的送出控制；跨裝置與後端 exactly-once 需要另外驗證。' : '加入 pending 保護後，以新 Candidate 重跑；前端保護不能取代後端冪等性。' };
  }
  const evidenceRevision = fixed ? input : 1;
  const current = evidenceRevision === input;
  return { ...base, verdict: 'PASS', validity: current ? 'CURRENT' : 'STALE', acceptance: current ? 'ELIGIBLE' : 'BLOCKED', title: current ? '證據對應現在的成果。' : '曾經通過，不代表現在通過。', description: current ? '驗證紀錄與交付 Candidate 的版本一致。' : '歷史 PASS 仍被保留，但不能沿用到修改後的成果。', observations: [['交付版本', `r${input}`], ['證據版本', `r${evidenceRevision}`]], trace: [`交付 Candidate 指向 r${input}。`, `${fixed ? '重新取得' : '沿用'} r${evidenceRevision} 的 PASS 紀錄。`, `版本比對${current ? '一致 → CURRENT' : '不一致 → STALE'}；${current ? '符合此模擬的接受條件' : '阻擋自動接受'}。`], reason: current ? '版本一致僅是必要條件之一；真實系統還需核對 plan、binding、pack、環境及人工處置。' : '針對目前版本重新驗證，不能把舊 PASS 改標成新成果的證據。' };
}
