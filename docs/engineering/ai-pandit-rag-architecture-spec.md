# AI Pandit RAG Architecture Spec — Deep Technical

> Detailed RAG (Retrieval-Augmented Generation) architecture for AI Pandit subscription product (per R-Q2-E-001). Engineer-ready implementation guide.

## Why AI Pandit RAG matters

- Differentiator vs generic ChatGPT (lacks Sanskrit + scripture grounding)
- Differentiator vs Sri Mandir (they don't have AI Pandit)
- Foundation for ₹199/mo subscription monetization
- Proprietary corpus = competitive moat
- Sanskrit accuracy = devotee trust

## Tech stack

| Component | Choice | Why |
|---|---|---|
| LLM | Groq llama-3.1-70b-versatile | Fast inference + Sanskrit comprehension |
| Embeddings | OpenAI text-embedding-3-small | Multilingual + Indic language support |
| Vector store | pgvector on Supabase | Existing infrastructure + low cost |
| Knowledge base | Curated Sanskrit + Hindi + English corpus | Proprietary moat |
| Reranking | Cohere Rerank v3 | Better than default similarity |
| Caching | Upstash Redis | Reduce inference cost |
| Monitoring | Helicone proxy | LLM-specific monitoring |

## Knowledge base composition

### Sources (target 500K tokens curated)

1. **Bhagavad Gita** (700 verses Sanskrit + 6 commentaries) — Sanskrit Documents Project (free)
2. **18 Puranas** (summaries + key chapters) — Sanskrit Heritage
3. **108 Upanishads** (primary + commentaries) — Vedanta Society
4. **Ramayana** (sarga-level summaries) — Valmiki + Tulsidas + Kamban
5. **Mahabharata** (parva-level summaries) — Critical edition
6. **Pandit answer logs** (from Bhaktisetu support history) — proprietary
7. **Festival + puja explainer docs** (already on Bhaktisetu) — proprietary
8. **Vedic astrology corpus** (Brihad Parashara + Lal Kitab + classical jyotisha) — Sanskrit Documents
9. **Devi Mahatmyam** (Durga Saptashati + commentaries) — Devi Bhagavata Purana
10. **Yoga Sutras of Patanjali** (4 padas + commentaries) — Vyasa + modern interpretations

### Multi-language coverage

- Sanskrit (source texts)
- Hindi (translations + commentaries)
- English (translations + modern interpretations)
- Tamil (Vaishnav + Saiva commentaries)
- Telugu (Carnatic + Saiva tradition)
- Bengali (Bhakti tradition)
- Marathi (Saint tradition)

## RAG flow

```
User question: "What should I chant on Sankashti Chaturthi?"
  ↓
Embedding generation (OpenAI text-embedding-3-small)
  ↓
pgvector cosine-similarity search → top 20 chunks
  ↓
Cohere Rerank → top 5 most relevant chunks
  ↓
Prompt construction:
  System: "You are AI Pandit. Answer per Hindu scripture..."
  Context: [5 retrieved chunks]
  User Question: [original question]
  ↓
Groq llama-3.1-70b-versatile inference (streaming)
  ↓
Response with scripture citations + Hindi/Sanskrit
  ↓
Cache response (Redis) for 24hr (similar questions hit cache)
  ↓
Audit log (Helicone)
  ↓
Return to user (web/mobile)
```

## Embedding ingestion pipeline

```typescript
// scripts/agents/ai-pandit/ingest-corpus.ts
import OpenAI from 'openai'
import { createClient } from '@supabase/supabase-js'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)

async function ingestText(source: string, fullText: string, language: string) {
  // Chunk into 512-token segments with 50-token overlap
  const chunks = chunkText(fullText, 512, 50)
  
  for (const chunk of chunks) {
    const embedding = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: chunk.text
    })
    
    await supabase.from('ai_pandit_kb').insert({
      source,
      language,
      chunk_text: chunk.text,
      embedding: embedding.data[0].embedding,
      metadata: {
        chapter: chunk.chapter,
        verse: chunk.verse,
        sanskrit_original: chunk.sanskritOriginal
      }
    })
  }
}
```

## Database schema

```prisma
model AiPanditKnowledgeBase {
  id          String   @id @default(cuid())
  source      String   // Bhagavad_Gita, Vishnu_Sahasranama, etc.
  language    String   // sanskrit, hindi, english, tamil
  chunkText   String   @map("chunk_text") @db.Text
  embedding   Unsupported("vector(1536)")
  metadata    Json
  createdAt   DateTime @default(now())
  @@index([source])
  @@index([language])
  @@map("ai_pandit_knowledge_base")
}

model AiPanditQuery {
  id          String   @id @default(cuid())
  userId      String   @map("user_id")
  question    String   @db.Text
  answer      String   @db.Text
  cached      Boolean  @default(false)
  responseTime Int     @map("response_time_ms")
  tokenCount  Int      @map("token_count")
  cost        Decimal? @db.Decimal(10, 4)  // USD cents
  feedback    QueryFeedback?
  createdAt   DateTime @default(now())
  user        User @relation(fields: [userId], references: [id])
  @@index([userId, createdAt])
  @@map("ai_pandit_queries")
}

enum QueryFeedback { helpful unhelpful inappropriate }
```

## API endpoint

```typescript
// apps/api/src/routes/ai-pandit.ts
fastify.post('/ai-pandit/ask', { preHandler: [authenticateUser] }, async (req, reply) => {
  const { question } = z.object({
    question: z.string().min(5).max(500)
  }).parse(req.body)
  
  const userId = req.user.id
  
  // Rate limit check
  const userTier = await getUserTier(userId)
  const dailyCount = await getDailyAskCount(userId)
  
  if (userTier === 'free' && dailyCount >= 3) {
    return reply.status(429).send({
      error: 'Daily limit reached. Upgrade to Bhakti Pro for unlimited Q&A.',
      upgradeLink: '/subscribe/bhakti-pro'
    })
  }
  
  // Cache check
  const cacheKey = `aipandit:${crypto.createHash('sha256').update(question).digest('hex')}`
  const cached = await redis.get(cacheKey)
  
  if (cached) {
    await logQuery({ userId, question, answer: cached, cached: true })
    return reply.send({ answer: cached, source: 'cache' })
  }
  
  // Embedding
  const qEmbedding = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: question
  })
  
  // Vector search
  const { data: chunks } = await supabase.rpc('match_kb_chunks', {
    query_embedding: qEmbedding.data[0].embedding,
    match_threshold: 0.7,
    match_count: 20
  })
  
  // Rerank
  const reranked = await rerank(question, chunks, 5)
  
  // Build prompt
  const systemPrompt = `You are AI Pandit — a respectful Hindu scripture-grounded AI. Always:
1. Cite specific scripture references (Bhagavad Gita 2.47, Yoga Sutra 1.13, etc.)
2. Include Sanskrit shloka where relevant
3. Provide English translation
4. If uncertain, recommend consulting a real pandit
5. Be culturally sensitive — no controversial sectarian statements
6. Use respectful Hindu terms (Bhagwan, Devi, Shri, etc.)
7. Format response: Sanskrit → Transliteration → English meaning → Practical guidance`
  
  const context = reranked.map(c => `[${c.source}]: ${c.chunk_text}`).join('\n\n')
  
  // Groq inference (streaming)
  const stream = await groq.chat.completions.create({
    model: 'llama-3.1-70b-versatile',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `Context from Hindu scriptures:\n${context}\n\nQuestion: ${question}` }
    ],
    stream: true,
    temperature: 0.3,
    max_tokens: 1024
  })
  
  let fullResponse = ''
  for await (const chunk of stream) {
    fullResponse += chunk.choices[0]?.delta?.content || ''
    // Stream to client
  }
  
  // Cache for 24hr
  await redis.setex(cacheKey, 86400, fullResponse)
  
  // Log query + token usage
  await logQuery({
    userId, question, answer: fullResponse,
    responseTime: Date.now() - startTime,
    tokenCount: estimateTokens(question + fullResponse),
    cost: estimateCost(question + fullResponse)
  })
  
  return reply.send(stream)
})
```

## Cost monitoring

| Per query | Cost |
|---|---|
| Embedding generation | ~$0.00002 |
| pgvector search | ~$0.00001 (Supabase free tier) |
| Cohere rerank | ~$0.001 per query |
| Groq llama-70b inference | ~$0.05 per 1K tokens |
| Average per AI Pandit query | ~$0.06-0.10 |
| Monthly per Bhakti Pro user (₹199 = ~$2.40) | 24 queries breakeven |

## Cost optimization

- 24hr cache for similar questions = 30-40% queries hit cache
- Free-tier limit 3 queries/day = limits cost exposure
- Quarterly query review identifies expensive patterns
- Bhakti Bhagat (annual ₹1499 = $18) = 18 queries/month average

## Quality monitoring

- Sample 1% of queries for manual review (founder weekly)
- Track user feedback (helpful / unhelpful / inappropriate)
- Quarterly review of top-100 questions for content gaps
- Update knowledge base based on patterns

## Engineering tickets

- Week 1: pgvector setup + Supabase schema
- Week 2: Embedding ingestion pipeline (500K tokens)
- Week 3: Vector search + rerank integration
- Week 4: Groq API integration + streaming response
- Week 5: Caching + rate limiting
- Week 6: Web /ask-pandit UI
- Week 7: Mobile /(devotee)/ask-pandit screen
- Week 8: Pilot + iteration
- Week 9: Public launch ₹199/mo subscription

## Success metrics

- 100+ subscribers Q2-end
- 1000+ queries/day at scale
- 4.5+ satisfaction rating
- 30%+ Bhakti Bhagat conversion (annual upgrade)
- Cost per subscriber: $1-2/mo (operational margin healthy)
