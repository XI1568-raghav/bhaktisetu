# apps\api\src\routes\semantic-search.ts

- SearchKind · type · L25-L25 — type SearchKind = 'content' | 'temple' | 'puja' | 'all';
- SearchHit · interface · L27-L34 — interface SearchHit
- vectorSearch · function · L51-L84 — async function vectorSearch( table: 'content_items' | 'temples' | 'puja_types', embedding: number[], limit: number, ): Promise<Array<{ id: string; title: string; snippet: string; score: number }>>
- fallbackLike · function · L86-L153 — async function fallbackLike( kind: SearchKind, q: string, limit: number, ): Promise<SearchHit[]>
- semanticSearchRoutes · function · L155-L206 — async function semanticSearchRoutes(server: FastifyInstance)
