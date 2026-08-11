# apps\admin\app\temples\[slug]\page.tsx

- Temple · interface · L7-L15 — interface Temple
- TimingInfo · interface · L17-L22 — interface TimingInfo
- AuditEntry · interface · L24-L30 — interface AuditEntry
- DetailResponse · interface · L32-L35 — interface DetailResponse
- Row · type · L39-L39 — type Row = { key: string; value: string };
- rowsFromTiming · function · L41-L44 — function rowsFromTiming(t: TimingInfo | null | undefined): Row[]
- TempleEditPage · function · L46-L294 — function TempleEditPage()
- updateRow · function · L114-L116 — function updateRow(i: number, patch: Partial<Row>)
- removeRow · function · L118-L120 — function removeRow(i: number)
- addRow · function · L122-L124 — function addRow()
- handleSave · function · L126-L158 — async function handleSave()
