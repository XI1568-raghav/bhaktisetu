# apps\remotion-pitch\src\components\PujaBookingFlow.tsx

- Props · type · L16-L19 — type Props = { durationFrames: number; step?: 1 | 2 | 3 | 4; // 1=select puja, 2=aadhaar priest, 3=video proof, 4=80G receipt };
- PujaBookingFlow · function · L25-L153 — PujaBookingFlow: React.FC<Props> = ({ durationFrames, step = 2 })
- CardFrame · function · L155-L170 — CardFrame: React.FC<{ children: React.ReactNode }> = ({ children })
- SelectPujaCard · function · L172-L202 — SelectPujaCard: React.FC = ()
- AadhaarPriestCard · function · L204-L315 — AadhaarPriestCard: React.FC<{ frame: number; fps: number }> = ({ frame, fps })
- VideoProofCard · function · L317-L444 — VideoProofCard: React.FC<{ frame: number; fps: number }> = ({ frame, fps })
- ReceiptCard · function · L446-L602 — ReceiptCard: React.FC<{ frame: number; fps: number }> = ({ frame, fps })
