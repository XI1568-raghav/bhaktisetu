# apps\api\src\services\payout.service.ts

- ProviderRoleKey · type · L31-L37 — type ProviderRoleKey = | 'PANDIT' | 'ASTROLOGER' | 'WELLNESS_INSTRUCTOR' | 'STORE_OWNER' | 'TEMPLE_MANAGER' | 'GAUSHALA_MANAGER';
- getPayoutBalance · function · L42-L70 — async function getPayoutBalance(providerId: string)
- getKycStatus · function · L73-L90 — async function getKycStatus(providerId: string): Promise<{ verified: boolean; hasBank: boolean; hasUpi: boolean; }>
- requestPayout · function · L97-L136 — async function requestPayout(providerId: string, role: ProviderRoleKey, method = 'upi')
- processPayout · function · L143-L198 — async function processPayout( payoutId: string, action: 'complete' | 'reject' | 'fail', adminId: string, reference?: string, failureReason?: string, )
- listMyPayouts · function · L201-L207 — async function listMyPayouts(providerId: string)
- listPayoutRequests · function · L210-L228 — async function listPayoutRequests(status?: string)
