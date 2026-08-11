# apps\api\src\lib\wa-warm-intro-helpers.ts

- WarmIntroAudience · type · L13-L13 — type WarmIntroAudience = "friends-family" | "professional";
- WarmIntroContact · interface · L15-L18 — interface WarmIntroContact
- RenderWarmIntroOptions · interface · L20-L26 — interface RenderWarmIntroOptions
- buildWarmIntroShareUrl · function · L35-L41 — function buildWarmIntroShareUrl(baseUrl: string = DEFAULT_BASE_URL): string
- renderWarmIntroMessage · function · L52-L98 — function renderWarmIntroMessage( contact: WarmIntroContact, opts: RenderWarmIntroOptions = {}, ): string
- renderWarmIntroBatch · function · L105-L113 — function renderWarmIntroBatch( contacts: ReadonlyArray<WarmIntroContact>, opts: RenderWarmIntroOptions = {}, ): Array<{ name: string; message: string }>
