# AI Pandit MVP — Groq LLM Proxy + Sanskrit/Hindi Knowledge Base Ingest

> **Roadmap item**: R-Q2-E-001 (P0) · **Authored**: 2026-06-13

## Goal

Q2 ship AI Pandit MVP — Groq LLM proxy w/ Sanskrit + Hindi knowledge base. Targets 1K paying subscribers ₹199/mo Q4 via R-Q2-P-001.

## Architecture

```
User question → /api/v1/ai-pandit/ask
  → Rate limit check (5/day free / unlimited paid)
  → Retrieve relevant chunks from knowledge base (vector search)
  → Build prompt: system prompt + retrieved context + user q
  → Groq API (llama-3.1-70b)
  → Stream response back to user
  → Log Q+A for review
```

## Knowledge base

### Sources

- **Bhagavad Gita** (700 verses Sanskrit + 6 commentaries) — Sanskrit Documents Project
- **18 Puranas** (summaries) — Sanskrit Heritage
- **Upanishads** (108 + commentaries)
- **Ramayana** (sarga-level summaries)
- **Mahabharata** (parva-level)
- **Pandit answer logs** (from Bhaktisetu support → curated)
- **Festival + puja explainer docs** (Bhaktisetu /aarti /chalisa already on site)

Total: ~500K tokens of curated content.

### Ingestion

```typescript
// scripts/agents/ai-pandit/ingest-knowledge.ts
import OpenAI from 'openai'
import { createClient } from '@supabase/supabase-js'

const supa = createClient(SUPA_URL, SUPA_KEY)
// embed in 512-token chunks → store in pgvector
for (const doc of docs) {
  const chunks = chunkText(doc.text, 512)
  for (const chunk of chunks) {
    const embedding = await openai.embeddings.create({ model: 'text-embedding-3-small', input: chunk })
    await supa.from('ai_pandit_kb').insert({ text: chunk, embedding: embedding.data[0].embedding, source: doc.source })
  }
}
```

## API endpoint

`apps/api/src/routes/ai-pandit.ts`:

```typescript
fastify.post('/ai-pandit/ask', { preHandler: [authenticateUser] }, async (req, reply) => {
  const { question } = z.object({ question: z.string().min(5).max(500) }).parse(req.body)
  
  // Rate limit
  const userTier = await getUserTier(req.user.id)
  const dailyCount = await getDailyAskCount(req.user.id)
  if (userTier === 'free' && dailyCount >= 5) {
    return reply.status(429).send({ error: 'Daily limit. Upgrade ₹199/mo for unlimited.' })
  }
  
  // Retrieve relevant chunks
  const qEmbedding = await openai.embeddings.create({ model: 'text-embedding-3-small', input: question })
  const { data: chunks } = await supa.rpc('match_kb_chunks', {
    query_embedding: qEmbedding.data[0].embedding, match_count: 5,
  })
  
  // Build prompt
  const systemPrompt = `You are a respectful AI Pandit. Answer in Hindi or English (match user). Cite Sanskrit verses with English translation. Reference Scripture sources. If unsure, suggest consulting a real pandit.`
  const context = chunks.map(c => c.text).join('\n\n')
  
  // Groq call
  const stream = await groq.chat.completions.create({
    model: 'llama-3.1-70b-versatile',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `Context:\n${context}\n\nQuestion: ${question}` }
    ],
    stream: true,
    temperature: 0.3,  // factual
  })
  
  // Stream response
  return reply.send(stream)
})
```

## Engineering tickets

- R-Q2-E-001a: pgvector setup + KB schema
- R-Q2-E-001b: 500K-token KB ingest pipeline
- R-Q2-E-001c: Groq proxy endpoint
- R-Q2-E-001d: Rate-limit + tier check
- R-Q2-E-001e: Web /ask-pandit UI

## Closes

R-Q2-E-001 — spec shipped. Enables R-Q2-P-001 (₹199/mo subscription).
