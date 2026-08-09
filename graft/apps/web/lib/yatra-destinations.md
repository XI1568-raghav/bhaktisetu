# apps\web\lib\yatra-destinations.ts

- AffiliatePartner · type · L14-L14 — type AffiliatePartner = 'makemytrip' | 'goibibo' | 'irctc';
- AffiliatePartnerLink · interface · L16-L21 — interface AffiliatePartnerLink
- YatraDestination · interface · L23-L38 — interface YatraDestination
- partnersFor · function · L44-L50 — function partnersFor(slug: string): AffiliatePartnerLink[]
- getDestinationBySlug · function · L617-L619 — function getDestinationBySlug(slug: string): YatraDestination | undefined
- destinationSlugs · function · L621-L623 — function destinationSlugs(): string[]
- formatINRPrice · function · L625-L627 — function formatINRPrice(amount: number): string
