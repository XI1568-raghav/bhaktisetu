# apps\web\lib\content.ts

- KnowledgeCategory · type · L4-L4 — type KnowledgeCategory = 'sanskrit' | 'ved' | 'sanatan';
- Frontmatter · interface · L6-L17 — interface Frontmatter
- Article · interface · L19-L23 — interface Article
- parseFrontmatter · function · L27-L65 — function parseFrontmatter(raw: string): { frontmatter: Record<string, unknown>; body: string }
- stripQuotes · function · L67-L72 — function stripQuotes(s: string): string
- normalizeFrontmatter · function · L74-L88 — function normalizeFrontmatter(raw: Record<string, unknown>, fallbackSlug: string, category: KnowledgeCategory): Frontmatter
- loadCategory · function · L92-L109 — function loadCategory(category: KnowledgeCategory): Article[]
- ensureCache · function · L111-L118 — function ensureCache(): Map<KnowledgeCategory, Article[]>
- getAllArticles · function · L120-L122 — function getAllArticles(category: KnowledgeCategory): Article[]
- getArticle · function · L124-L126 — function getArticle(category: KnowledgeCategory, slug: string): Article | undefined
- getAllSlugs · function · L128-L130 — function getAllSlugs(category: KnowledgeCategory): string[]
- getAllArticlesAcrossCategories · function · L132-L138 — function getAllArticlesAcrossCategories(): Article[]
- SearchIndexEntry · interface · L140-L146 — interface SearchIndexEntry
- buildSearchIndex · function · L148-L156 — function buildSearchIndex(): SearchIndexEntry[]
