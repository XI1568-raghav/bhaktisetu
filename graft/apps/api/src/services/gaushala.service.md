# apps\api\src\services\gaushala.service.ts

- Gaushala · interface · L3-L19 — interface Gaushala
- Cow · interface · L21-L34 — interface Cow
- MonthlyUpdate · interface · L36-L40 — interface MonthlyUpdate
- AdoptionPlan · interface · L42-L52 — interface AdoptionPlan
- Adoption · interface · L54-L66 — interface Adoption
- generateAdoptionId · function · L581-L583 — function generateAdoptionId(): string
- GaushalaService · class · L587-L725 — class GaushalaService
- getGaushalas · method · L591-L602 — getGaushalas()
- getGaushalaById · method · L607-L613 — getGaushalaById(id: string)
- getCows · method · L618-L630 — getCows(gaushalaId?: string, available?: boolean)
- getCowById · method · L635-L637 — getCowById(id: string): Cow | null
- getAdoptionPlans · method · L642-L644 — getAdoptionPlans(): AdoptionPlan[]
- adoptCow · method · L649-L704 — adoptCow(userId: string, cowId: string, planId: string): Adoption
- getMyAdoptions · method · L709-L711 — getMyAdoptions(userId: string): Adoption[]
- getAdoptionUpdates · method · L716-L724 — getAdoptionUpdates(adoptionId: string, userId: string): MonthlyUpdate[] | null
