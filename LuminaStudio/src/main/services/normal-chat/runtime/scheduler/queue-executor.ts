interface QueueItem {
  requestId: string
  controller: AbortController
  execute(): Promise<void>
}

export class NormalChatQueueExecutor {
  private readonly queue: QueueItem[] = []
  private activeCount = 0

  constructor(private readonly concurrency = 20) {}

  enqueue(item: QueueItem): void {
    this.queue.push(item)
    void this.drain()
  }

  private async drain(): Promise<void> {
    while (this.activeCount < this.concurrency && this.queue.length > 0) {
      const item = this.queue.shift()
      if (!item) {
        return
      }

      if (item.controller.signal.aborted) {
        continue
      }

      this.activeCount += 1
      void item.execute().finally(() => {
        this.activeCount -= 1
        void this.drain()
      })
    }
  }
}
