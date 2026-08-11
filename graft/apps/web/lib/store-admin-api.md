# apps\web\lib\store-admin-api.ts

- StoreReview · interface · L9-L17 — Shape of a provider-level store review as returned by /store/reviews, noting reviews are not yet tied to individual products.
- authHeaders · function · L21-L23 — Builds the Authorization header only when a token is present so requests can be made anonymously or authenticated.
- describeFailure · function · L25-L33 — Turns a failed Response into a useful error string by pulling the server's message/error detail out of the JSON body when available.
- getMyReviews · function · L37-L46 — Fetches the current store owner's reviews, tolerating a missing reviews field by returning an empty list so the UI can render its empty state.
- StoreProduct · interface · L52-L65 — Shape of a store product as returned by the admin API, with price as a string because Prisma Decimal serializes to JSON as a string.
- CreateStoreProductInput · interface · L67-L76 — Input payload for creating a store product, accepting price as a number that the server converts to its Decimal representation.
- UpdateStoreProductInput · type · L78-L78 — Partial variant of the create input so PATCH updates only need to send the fields being changed.
- listStoreProducts · function · L80-L87 — Retrieves all products belonging to the authenticated store owner from the store-admin products endpoint.
- createStoreProduct · function · L89-L101 — Posts a new product to the store-admin endpoint and returns the created record.
- updateStoreProduct · function · L103-L116 — Patches an existing product by id with the supplied partial fields and returns the updated record.
- deleteStoreProduct · function · L118-L127 — Deletes a product by id via the store-admin endpoint, throwing a descriptive error on failure.
