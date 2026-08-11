# apps\api\src\lib\lead-role-mapping.ts

- LeadRole · type · L18-L18 — Union type of the five lead-intake role strings accepted by self-onboard and admin lead-conversion routes, derived from the LEAD_ROLE_VALUES constant.
- OnboardingRoleType · type · L28-L28 — Union type of the six role values the OnboardingService understands, derived from the ONBOARDING_ROLE_TYPES constant.
- mapLeadRoleToOnboarding · function · L38-L40 — Translates a lead role into the onboarding RoleType the OnboardingService requires, preventing invalid roles like 'PRIEST' from reaching the onboarding flow.
- isLeadRole · function · L42-L44 — Type guard that validates an arbitrary string is one of the accepted lead role values before it is used in onboarding conversion.
