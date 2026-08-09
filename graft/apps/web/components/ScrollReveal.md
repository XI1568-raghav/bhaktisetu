# apps\web\components\ScrollReveal.tsx

- ScrollReveal · function · L15-L162 — Wrapper component whose mount effect wires up IntersectionObservers and a single passive, rAF-throttled scroll listener so decorative scroll animations run without per-frame layout thrash.
- animateCounter · function · L60-L83 — Animates a numeric stat from zero to its target value when scrolled into view, preserving currency prefixes and suffixes and respecting reduced-motion preferences.
- tick · function · L71-L81 — Per-frame step that applies cubic ease-out to the counter value and writes the rounded intermediate number into the element until the duration completes.
- ParallaxEntry · type · L88-L88 — Tracks one parallax element with its speed multiplier and current near-viewport visibility flag so off-screen elements skip transform writes.
- updateParallax · function · L112-L120 — Writes a translate3d Y offset proportional to each visible parallax element's distance from viewport center, skipping off-screen entries to avoid layout reads.
- updateProgress · function · L124-L130 — Scales the scroll progress bar via scaleX based on how far the page has scrolled relative to total scrollable height.
- onScroll · function · L133-L141 — Scroll handler that coalesces bursts of scroll events into at most one parallax/progress update per animation frame using a ticking flag.
