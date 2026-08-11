# apps\api\src\routes\providers.ts

- ProviderTypeKey · type · L9-L9 — type ProviderTypeKey = typeof PROVIDER_TYPES[number];
- isValidProviderType · function · L46-L48 — function isValidProviderType(type: string): type is ProviderTypeKey
- normaliseProviderType · function · L50-L53 — function normaliseProviderType(type: string): ProviderTypeKey | null
- providerRoutes · function · L57-L198 — async function providerRoutes(server: FastifyInstance)
