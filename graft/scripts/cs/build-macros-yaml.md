# scripts\cs\build-macros-yaml.mjs

Build-time generator that emits the 240-string multilingual customer-support macro YAML (40 intents × 6 languages), marking EN/HI as production-grade and TA/TE/BN/MR as drafts requiring native-speaker review.

- regional · function · L108-L118 — Produces first-pass regional-language macro drafts by stripping the English greeting and prepending a respectful native salutation, so founders have a placeholder to replace before customer-facing use.
- escapeYamlString · function · L120-L123 — Escapes backslashes and double quotes so macro text can be safely embedded as double-quoted YAML scalars.
- build · function · L125-L152 — Assembles the full YAML document: header metadata plus, per intent, the EN/HI translations and the four flagged regional drafts.
- main · function · L154-L159 — Writes the generated YAML to the docs output path, creating directories as needed.
