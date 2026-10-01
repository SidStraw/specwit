// A small executable model, without a browser or production API.
export function createCheckIn(sendRequest) {
  let pending = false
  let completed = false
  let reward = null
  return {
    get state() { return { pending, completed, reward } },
    async activate() {
      if (pending || completed) return false
      pending = true
      try {
        const response = await sendRequest()
        reward = response.reward
        completed = true
        return true
      }
      finally { pending = false }
    },
  }
}
