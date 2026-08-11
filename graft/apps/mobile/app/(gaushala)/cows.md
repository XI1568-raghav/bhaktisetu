# apps\mobile\app\(gaushala)\cows.tsx

- CreateCowForm · type · L29-L37 — type CreateCowForm = { tagNumber: string; name: string; breed: string; ageYears: string; gender: 'female' | 'male'; healthStatus: 'healthy' | 'treatment' | 'pregnant' | 'recovering'; notes: string; };
- GaushalaCows · function · L49-L241 — function GaushalaCows()
- onRefresh · function · L60-L64 — async function onRefresh()
- handleSubmit · function · L66-L97 — async function handleSubmit()
- Field · function · L243-L250 — function Field({ label, children }: { label: string; children: React.ReactNode })
- SegmentRow · function · L252-L278 — function SegmentRow({ options, value, onChange, }: { options: { key: string; label: string }[]; value: string; onChange: (v: string) => void; })
