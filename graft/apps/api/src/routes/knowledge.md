# apps\api\src\routes\knowledge.ts

- Category · type · L5-L5 — type Category = 'sanskrit' | 'ved' | 'sanatan';
- Frontmatter · interface · L7-L18 — interface Frontmatter
- stripQ · function · L25-L25 — function stripQ(s: string): string
- parseFrontmatter · function · L27-L49 — function parseFrontmatter(raw: string): { frontmatter: Record<string, unknown>; body: string }
- categoryDir · function · L51-L51 — function categoryDir(c: Category): string
- listSlugs · function · L53-L57 — function listSlugs(c: Category): string[]
- readArticle · function · L59-L65 — function readArticle(c: Category, slug: string): { frontmatter: Frontmatter; body: string } | null
- isCategory · function · L67-L69 — function isCategory(s: string): s is Category
- knowledgeRoutes · function · L71-L97 — async function knowledgeRoutes(server: FastifyInstance)
