# apps\web\app\gaushala-portal\cows\page.tsx

- Cow · type · L9-L19 — type Cow = { id: string; tagNumber: string; name: string; breed: string | null; ageYears: number | null; gender: string; healthStatus: string; arrivalDate: string; notes: string | null; };
- HealthRecord · type · L21-L27 — type HealthRecord = { id: string; recordType: string; notes: string; vetName: string | null; recordedAt: string; };
- CowsPage · function · L38-L44 — function CowsPage()
- CowsPageContent · function · L46-L456 — function CowsPageContent()
- loadCows · function · L77-L95 — loadCows = async ()
- handleRegister · function · L102-L143 — handleRegister = async ()
- openDetail · function · L145-L163 — openDetail = async (c: Cow)
- addHealthRecord · function · L165-L186 — addHealthRecord = async ()
- Field · function · L458-L471 — function Field({ label, value, onChange, placeholder, type = 'text' }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string })
- Stat · function · L473-L480 — function Stat({ label, value }: { label: string; value: string })
