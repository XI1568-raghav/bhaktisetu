# apps\web\app\yatra\plan\page.tsx

- PlanData · type · L27-L39 — type PlanData = { destinations: string[]; // site ids startDate: string; endDate: string; adults: number; seniors: number; budget: 'economy' | 'standard' | 'premium'; pace: 'relaxed' | 'moderate' | 'fast'; transport: 'cab' | 'train' | 'mixed' | 'flights'; stay: 'budget' | 'mid' | 'premium'; specialNeeds: string[]; notes: string; };
- CustomPlanPage · function · L54-L479 — function CustomPlanPage()
- toggleDest · function · L80-L85 — function toggleDest(id: string)
- toggleNeed · function · L87-L92 — function toggleNeed(n: string)
- handleGenerate · function · L94-L129 — function handleGenerate()
- CounterRow · function · L481-L497 — function CounterRow({ label, value, onChange, hint }: { label: string; value: number; onChange: (v: number) => void; hint?: string })
- Section · function · L499-L509 — function Section({ title, icon: Icon, children }: { title: string; icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>; children: React.ReactNode })
- ChipButton · function · L511-L525 — function ChipButton({ active, onClick, label }: { active: boolean; onClick: () => void; label: string })
- ReviewRow · function · L527-L534 — function ReviewRow({ label, value }: { label: string; value: string })
