# apps\api\src\routes\notifications.ts

- StoredSub · interface · L22-L24 — interface StoredSub extends PushSubscriptionPayload
- notificationRoutes · function · L28-L209 — async function notificationRoutes(server: FastifyInstance)
- FcmTokenModel · type · L135-L137 — type FcmTokenModel = { upsert: (args: unknown) => Promise<{ id: string }>; };
- FcmTokenModel · type · L167-L169 — type FcmTokenModel = { deleteMany: (args: { where: { deviceToken: string; userId: string } }) => Promise<{ count: number }>; };
- FcmTokenModel · type · L183-L186 — type FcmTokenModel = { findMany: (args: { where: { userId: string }; select: { deviceToken: true } }) => Promise<Array<{ deviceToken: string }>>; deleteMany: (args: { where: { deviceToken: { in: string[] } } }) => Promise<{ count: number }>; };
- notifyUser · function · L215-L246 — async function notifyUser( userId: string, payload: { title: string; body: string; url?: string }, ): Promise<number>
