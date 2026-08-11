# apps\api\src\routes\wellness-portal.ts

- WellnessSessionRow · type · L28-L42 — Row-shape type describing the snake_case columns returned by the raw SQL query in GET /instructor/mine so results can be mapped to camelCase API fields.
- wellnessPortalRoutes · function · L44-L291 — Registers the wellness instructor portal endpoints, enforcing the WELLNESS_INSTRUCTOR role and computing instructor earnings as their (1 - platform commission) share of paid enrollment revenue rather than gross.
