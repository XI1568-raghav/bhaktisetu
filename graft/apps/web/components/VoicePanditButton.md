# apps\web\components\VoicePanditButton.tsx

- TurnResponse · type · L19-L28 — type TurnResponse = { transcript: string; reply: string; audioBase64: string; audioMimeType: string; latency_ms: number; breakdown_ms?: { stt: number; llm: number; tts: number }; demo?: boolean; language: 'en' | 'hi'; };
- Status · type · L30-L30 — type Status = 'idle' | 'recording' | 'uploading' | 'playing' | 'error';
- VoicePanditButton · function · L32-L245 — function VoicePanditButton({ language = 'en' }: { language?: 'en' | 'hi' })
- blobToBase64 · function · L247-L263 — function blobToBase64(blob: Blob): Promise<string>
