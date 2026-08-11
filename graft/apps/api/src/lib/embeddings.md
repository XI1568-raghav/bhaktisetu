# apps\api\src\lib\embeddings.ts

- InputType · type · L20-L20 — type InputType = 'search_document' | 'search_query' | 'classification' | 'clustering';
- CohereEmbedResponse · interface · L28-L32 — interface CohereEmbedResponse
- extractVectors · function · L34-L37 — function extractVectors(data: CohereEmbedResponse): number[][]
- generateEmbedding · function · L43-L70 — async function generateEmbedding( text: string, inputType: InputType = 'search_document', ): Promise<number[] | null>
- generateEmbeddingsBatch · function · L77-L112 — async function generateEmbeddingsBatch( texts: string[], inputType: InputType = 'search_document', ): Promise<(number[] | null)[]>
- toPgVector · function · L118-L120 — function toPgVector(values: number[]): string
