# apps\api\src\services\wallet.service.ts

- CreditLedgerReason · type · L17-L22 — type CreditLedgerReason = | 'referral_reward' | 'refund_to_credit' | 'promo_grant' | 'redemption_debit' | 'adjustment';
- CreditUserInput · interface · L24-L32 — interface CreditUserInput
- CreditResult · interface · L34-L38 — interface CreditResult
- WalletBalance · interface · L40-L43 — interface WalletBalance
- WalletInvariantError · class · L45-L50 — class WalletInvariantError extends Error
- constructor · method · L46-L49 — constructor(message: string)
- WalletService · class · L52-L152 — class WalletService
- constructor · method · L53-L53 — constructor(private readonly prisma: PrismaClient)
- creditUser · method · L59-L120 — async creditUser(input: CreditUserInput): Promise<CreditResult>
- getBalance · method · L125-L131 — async getBalance(userId: string): Promise<WalletBalance>
- verifyInvariant · method · L137-L151 — async verifyInvariant(userId: string): Promise<{ balancePaise: number; ledgerSumPaise: number }>
- isUniqueViolation · function · L155-L157 — function isUniqueViolation(err: unknown): boolean
