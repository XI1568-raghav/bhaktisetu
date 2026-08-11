# apps\web\app\gaushala-portal\profile\page.tsx · [[gaushala-manager-portal]] [[graceful-degradation-in-portal-data-fetching]]

- Profile · type · L9-L17 — type Profile = { id: string; gaushalaName: string; address: string | null; city: string | null; description: string | null; verified: boolean; approved: boolean; };
- GaushalProfilePage · function · L19-L25 — function GaushalProfilePage()
- Content · function · L27-L213 — function Content()
- handleSave · function · L80-L108 — handleSave = async ()
- ReadOnly · function · L215-L225 — function ReadOnly({ label, value, icon: Icon }: { label: string; value: string | null | undefined; icon?: any })
- Editable · function · L227-L238 — function Editable({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void })
- DocRow · function · L240-L254 — function DocRow({ label, value, verified }: { label: string; value: string | null; verified: boolean })
