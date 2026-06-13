# AR Puja MVP — WebXR Camera Overlay + Diya Placement + GLB Deity Model

> **Roadmap item**: R-Q4-E-008 (P1) · **Authored**: 2026-06-13

## Goal

Q4 ship AR puja MVP. WebXR camera overlay + virtual diya placement + 3D deity model. Differentiates Bhaktisetu in devotional commerce.

## Use case

User opens /ar-puja → grants camera permission → AR scene activates → user places virtual diya + flower + 3D deity model in their physical space → captures photo or video → shares to social.

## Tech stack

- WebXR API (Chrome + Safari iOS 17+ support)
- Three.js + 8thwall (web AR)
- GLB models: 5 deities (Ganesh, Krishna, Durga, Shiva, Lakshmi)
- Cloudflare R2 hosting for GLB files

## UI

- /ar-puja landing — feature explainer + browser support check
- "Start AR" button → camera permission prompt
- AR scene controls: rotate / scale / change deity / add diya / capture
- Social share: photo + #BhaktisetuAR tag

## Engineering tickets

- R-Q4-E-008a: 5 GLB deity models commissioned
- R-Q4-E-008b: WebXR scene scaffold
- R-Q4-E-008c: AR controls UI
- R-Q4-E-008d: Photo capture + share

## Q4 success

- 1K AR puja launches
- 100 photo captures
- 50 social shares (#BhaktisetuAR)
- Browser compat: Chrome Android + Safari iOS 17+

## Closes

R-Q4-E-008 — spec shipped.
