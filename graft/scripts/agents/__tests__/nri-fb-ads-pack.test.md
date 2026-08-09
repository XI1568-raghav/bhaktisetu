# scripts\agents\__tests__\nri-fb-ads-pack.test.mjs

Test suite that guards the NRI Facebook ads launch pack deliverables by verifying the pack directory, budget README, three creative briefs, two audience specs, UTM plan, PostHog funnel events, and launch/kill-criteria docs all exist and satisfy Facebook's copy-length and tracking requirements.

- readCreative · function · L10-L13 — Helper that loads a creative brief markdown file by deriving its numbered filename from the creative id's position in CREATIVE_IDS.
- frontmatter · function · L15-L27 — Minimal YAML-frontmatter parser that extracts the --- delimited header of a markdown file into a flat key/value object so tests can assert on creative metadata fields.
