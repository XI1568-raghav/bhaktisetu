# apps\remotion-pitch\src\components\AiPanditChat.tsx

- Props · type · L22-L25 — type Props = { durationFrames: number; phase?: 'question' | 'answer'; // question = typing the Q, answer = streaming the Gita verse };
- AiPanditChat · function · L32-L333 — AiPanditChat: React.FC<Props> = ({ durationFrames, phase = 'answer' })
- PhoneFrame · function · L337-L366 — PhoneFrame: React.FC<{ children: React.ReactNode }> = ({ children })
