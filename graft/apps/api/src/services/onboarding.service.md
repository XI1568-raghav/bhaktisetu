# apps\api\src\services\onboarding.service.ts

- RoleType · type · L6-L6 — Enumerates the six provider roles (pandit, store owner, astrologer, wellness instructor, gaushala manager, temple manager) that are allowed to go through onboarding.
- OnboardingProgress · interface · L8-L19 — Data shape returned to clients describing where a user stands in their onboarding wizard, including per-step completion and whether everything is submitted.
- StepData · interface · L21-L23 — Open-ended payload type for whatever form data a user submits at an individual onboarding step.
- OnboardingService · class · L42-L457 — Encapsulates the full provider-onboarding lifecycle: starting step tracking, recording step completion, gating final submission on all steps done, and creating/approving the role-specific profile that makes a provider bookable.
- getStepsForRole · method · L43-L45 — Returns the ordered list of onboarding step labels for a given role so the UI can render the correct wizard.
- startOnboarding · method · L47-L90 — Initializes a user's onboarding by seeding their role assignment and one incomplete step row per wizard step, falling back to in-memory state if the database write fails.
- getProgress · method · L92-L138 — Builds the user's onboarding status by deriving the current step and submitted flag from how many steps are completed, resolving the role from their latest non-devotee assignment when not given.
- completeStep · method · L140-L169 — Marks a single onboarding step as completed and stores its form data, then returns the recomputed progress.
- submitForApproval · method · L171-L196 — Enforces the rule that every onboarding step must be completed before submission, then merges all step data and creates the provider profile for admin review.
- upsertProviderProfile · method · L205-L220 — Single-shot, idempotent provisioning used at signup: upserts the role assignment and the role-specific profile (defaulting to unapproved so it appears in the admin approvals queue) without flipping approval state on re-posts.
- approveProviderProfile · method · L231-L264 — Flips a provider profile to approved so it becomes immediately bookable, used by the lead-conversion path to activate a provider in one step without the admin-approval side effects.
- getProviderProfile · method · L266-L283 — Fetches the role-specific profile row for a user by dispatching to the correct profile table.
- fetchProfileId · method · L285-L288 — Returns just the id of the user's role-specific profile, if one exists.
- createProviderProfile · method · L290-L456 — Upserts the role-specific profile row from collected onboarding data; for pandits it additionally mirrors a Priest record so priest-dashboard routes and payout issuance can resolve the account.
