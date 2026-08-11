# apps\web\lib\pandit-api.ts

- Offering · interface · L7-L18 — interface Offering
- PriestSummary · interface · L20-L32 — interface PriestSummary
- PriestWithOfferings · interface · L34-L36 — interface PriestWithOfferings extends PriestSummary
- CreateOfferingInput · interface · L38-L45 — interface CreateOfferingInput
- UpdateOfferingInput · type · L47-L47 — type UpdateOfferingInput = Partial<CreateOfferingInput>;
- authHeaders · function · L51-L53 — function authHeaders(token: string | undefined): Record<string, string>
- describeFailure · function · L55-L63 — async function describeFailure(res: Response, fallback: string): Promise<string>
- listMyOfferings · function · L67-L74 — async function listMyOfferings(token: string | undefined): Promise<Offering[]>
- createOffering · function · L76-L91 — async function createOffering( token: string | undefined, input: CreateOfferingInput, ): Promise<Offering>
- updateOffering · function · L93-L109 — async function updateOffering( token: string | undefined, id: string, input: UpdateOfferingInput, ): Promise<Offering>
- deleteOffering · function · L111-L120 — async function deleteOffering( token: string | undefined, id: string, ): Promise<void>
- toggleOfferingActive · function · L122-L133 — async function toggleOfferingActive( token: string | undefined, id: string, ): Promise<Offering>
- PriestReview · interface · L140-L148 — interface PriestReview
- getMyReviews · function · L150-L157 — async function getMyReviews(token: string | undefined): Promise<PriestReview[]>
- PublicPriestsQuery · interface · L161-L164 — interface PublicPriestsQuery
- getPublicPriests · function · L166-L180 — async function getPublicPriests(q: PublicPriestsQuery = {}): Promise<PriestSummary[]>
- getPublicPriest · function · L184-L191 — async function getPublicPriest(id: string): Promise<PriestWithOfferings | null>
