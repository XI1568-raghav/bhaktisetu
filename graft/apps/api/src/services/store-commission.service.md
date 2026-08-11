# apps\api\src\services\store-commission.service.ts

- TxClient · type · L21-L21 — type TxClient = Prisma.TransactionClient | typeof prisma;
- writeStoreOrderCommission · function · L23-L69 — async function writeStoreOrderCommission( storeOrderId: string, tx: TxClient = prisma, ): Promise<void>
