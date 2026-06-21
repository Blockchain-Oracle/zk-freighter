export class CdpClient {
  constructor(url) {
    this.ws = new WebSocket(url)
    this.nextId = 1
    this.pending = new Map()
  }

  async open() {
    await new Promise((resolve, reject) => {
      this.ws.addEventListener('open', resolve, { once: true })
      this.ws.addEventListener('error', reject, { once: true })
    })
    this.ws.addEventListener('message', (event) => this.onMessage(event))
  }

  command(method, params = {}, sessionId) {
    const id = this.nextId
    this.nextId += 1
    const message = sessionId === undefined ? { id, method, params } : { id, method, params, sessionId }
    const result = new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject })
    })
    this.ws.send(JSON.stringify(message))
    return result
  }

  close() {
    this.ws.close()
  }

  onMessage(event) {
    const message = JSON.parse(event.data)
    if (message.id === undefined) {
      return
    }

    const pending = this.pending.get(message.id)
    if (pending === undefined) {
      return
    }

    this.pending.delete(message.id)
    if (message.error) {
      pending.reject(new Error(`${message.error.message}: ${message.error.data ?? ''}`))
      return
    }
    pending.resolve(message.result)
  }
}
