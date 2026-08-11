# apps\web\lib\help-articles.ts

- HelpLang · type · L9-L9 — type HelpLang = "en" | "hi" | "ta" | "te" | "bn" | "mr";
- HelpCategory · type · L20-L26 — type HelpCategory = | "puja-bookings" | "live-darshan" | "store-orders" | "payments-refunds" | "account-profile" | "general";
- HelpArticle · interface · L37-L49 — interface HelpArticle
- getHelpArticle · function · L208-L213 — function getHelpArticle( lang: HelpLang, slug: string, ): HelpArticle | undefined
- getHelpArticlesByLang · function · L215-L217 — function getHelpArticlesByLang(lang: HelpLang): HelpArticle[]
- getHelpArticlesByCategory · function · L219-L226 — function getHelpArticlesByCategory( lang: HelpLang, category: HelpCategory, ): HelpArticle[]
- getHelpArticleCount · function · L228-L242 — function getHelpArticleCount(): { total: number; byLang: Record<HelpLang, number>; }
