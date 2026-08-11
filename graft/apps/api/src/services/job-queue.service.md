# apps\api\src\services\job-queue.service.ts

- JobQueueName · type · L21-L21 — type JobQueueName = 'email' | 'whatsapp' | 'payout' | 'notification';
- EnqueueResult · interface · L23-L27 — interface EnqueueResult
- warnNoopOnce · function · L35-L43 — function warnNoopOnce(name: JobQueueName, jobName: string)
- getQueue · function · L45-L77 — async function getQueue(name: JobQueueName): Promise<BullQueue | null>
- parseRedisUrl · function · L79-L93 — function parseRedisUrl(url: string): { host: string; port: number; password?: string; username?: string; tls?: object }
- enqueue · function · L105-L123 — async function enqueue<TData extends Record<string, unknown>>( queueName: JobQueueName, jobName: string, data: TData, opts: JobsOptions = {} ): Promise<EnqueueResult>
- enqueuePayout · function · L132-L152 — async function enqueuePayout<TData extends Record<string, unknown>>( jobName: string, data: TData, opts: JobsOptions = {} ): Promise<EnqueueResult>
- emitQueueNoopEvent · function · L159-L171 — function emitQueueNoopEvent(queueName: JobQueueName, jobName: string, reason: 'disabled' | 'construct-failed'): void
- isJobQueueAvailable · function · L180-L182 — function isJobQueueAvailable(): boolean
- QueueHealth · interface · L184-L189 — interface QueueHealth
- getQueueHealth · function · L195-L226 — async function getQueueHealth(): Promise<QueueHealth[]>
- closeAllQueues · function · L231-L241 — async function closeAllQueues(): Promise<void>
