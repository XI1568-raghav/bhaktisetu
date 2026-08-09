# apps\web\lib\tirthas.ts

- TirthaCategory · type · L5-L5 — type TirthaCategory = 'shaiva' | 'vaishnava' | 'shakti' | 'jain' | 'sikh' | 'syncretic';
- Tirtha · interface · L7-L33 — interface Tirtha
- tirthaSlugs · function · L2387-L2389 — function tirthaSlugs(): string[]
- getTirtha · function · L2391-L2393 — function getTirtha(slug: string): Tirtha | undefined
- tirthasByCategory · function · L2395-L2397 — function tirthasByCategory(cat: TirthaCategory): Tirtha[]
