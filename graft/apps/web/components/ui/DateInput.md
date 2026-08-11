# apps\web\components\ui\DateInput.tsx

- DateInputProps · interface · L6-L14 — interface DateInputProps
- formatForDisplay · function · L39-L44 — function formatForDisplay(iso: string): string
- parseFromDisplay · function · L46-L57 — function parseFromDisplay(input: string): string
- toIso · function · L59-L61 — function toIso(year: number, month: number, day: number): string
- parseIso · function · L63-L71 — function parseIso(iso: string): { year: number; month: number; day: number } | null
- isInRange · function · L73-L77 — function isInRange(iso: string, min?: string, max?: string): boolean
- DateInput · function · L79-L316 — function DateInput({ value, onChange, min, max, label, required, className, }: DateInputProps)
- handler · function · L110-L114 — handler = (e: MouseEvent)
- handleTextChange · function · L119-L131 — function handleTextChange(e: React.ChangeEvent<HTMLInputElement>)
- handleTextBlur · function · L133-L141 — function handleTextBlur()
- selectDate · function · L143-L149 — function selectDate(day: number)
- prevMonth · function · L151-L158 — function prevMonth()
- nextMonth · function · L160-L167 — function nextMonth()
- DateTimeInput · function · L318-L367 — function DateTimeInput({ value, onChange, min, max, label, required, className, }: DateInputProps)
- commit · function · L340-L342 — function commit(d: string, t: string)
