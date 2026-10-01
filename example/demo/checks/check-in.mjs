import assert from 'node:assert/strict'
import { createCheckIn } from '../src/check-in.mjs'

const checkId = process.env.SPECWIT_CHECK_ID
const observations = []
try {
  if (checkId === 'B01') {
    let calls = 0
    let respond
    const response = new Promise(resolve => { respond = resolve })
    const subject = createCheckIn(() => { calls++; return response })
    const first = subject.activate()
    const repeated = subject.activate()
    observations.push(`pending 期間啟動兩次，實際請求數=${calls}，預期=1`)
    assert.equal(subject.state.pending, true)
    assert.equal(subject.state.completed, false)
    assert.equal(calls, 1, 'pending 期間送出了重複請求')
    respond({ reward: 7 })
    await Promise.all([first, repeated])
    assert.equal(subject.state.completed, true)
    assert.equal(subject.state.pending, false)
  }
  else if (checkId === 'B02') {
    for (const expected of [7, 23]) {
      let respond
      const subject = createCheckIn(() => new Promise(resolve => { respond = resolve }))
      const pending = subject.activate()
      assert.deepEqual(subject.state, { pending: true, completed: false, reward: null })
      respond({ reward: expected })
      await pending
      observations.push(`回應 reward=${expected}，實際 reward=${subject.state.reward}`)
      assert.equal(subject.state.reward, expected)
      assert.equal(subject.state.completed, true)
    }
  }
  else throw new Error(`未知 check：${checkId}`)
  console.log(JSON.stringify({ schemaVersion: 1, checkId, verdict: 'PASS', observations }))
}
catch (error) {
  observations.push(error.message)
  console.log(JSON.stringify({ schemaVersion: 1, checkId, verdict: 'FAIL', observations }))
  process.exitCode = 1
}
