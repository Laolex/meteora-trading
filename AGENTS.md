# Meteora Agent — Agent Instructions

## Project overview

Autonomous Meteora DLMM liquidity agent for Solana. Python orchestrator + Node helper for tx signing. Next.js frontend at `frontend/`. See `README.md` for architecture and quick start.

---

## UI / Frontend design standards

Apply these whenever building or modifying the frontend.

### Motion constants

Always use these values — never default easing:

```ts
// lib/motion.ts
export const ease = [0.22, 1, 0.36, 1]   // start fast, glide to stop

// Hero entrance
initial={{ opacity: 0, y: 40 }}
animate={{ opacity: 1, y: 0 }}
transition={{ duration: 0.8, ease }}

// Scroll-reveal cards (stagger 0.1s per index)
initial={{ opacity: 0, y: 60 }}
whileInView={{ opacity: 1, y: 0 }}
viewport={{ once: true, margin: "-80px" }}
transition={{ duration: 0.6, ease, delay: i * 0.1 }}

// Every button
whileHover={{ scale: 1.04 }}
whileTap={{ scale: 0.97 }}
transition={{ type: "spring", stiffness: 400, damping: 17 }}
```

### Design tokens

```
background:     #0a0a0a
surface:        #111111
surface-raised: #1a1a1a
border:         #222222
text-primary:   #f5f5f5
text-secondary: #888888
accent:         #14f195  (Solana green)
amber:          #f59e0b  (DRY_RUN / warning)
danger:         #ef4444
```

Typography: Inter. Hero 64–72px bold, sections 36px semibold, body 16px, monospace blocks `font-mono`.

### Polish checklist — run before marking UI complete

- [ ] Custom cubic-bezier on every transition (not default ease)
- [ ] Hero content enters from y:40, not just fade-in
- [ ] Below-fold cards stagger 0.1s per item via `whileInView`
- [ ] Every button has spring hover + tap
- [ ] Mobile single-column, no horizontal scroll, touch targets 44px min
- [ ] `prefers-reduced-motion` respected — static fallback for canvas/heavy animations
- [ ] Keyboard focus visible (`outline: 2px solid #14f195`)
- [ ] Semantic heading hierarchy (h1 → h2 → h3)

### Data layer pattern

Always build with typed mock interfaces first. Every API function gets a `// TODO: replace with fetch(...)` comment. Never couple UI to backend before it exists.

### Product reveal video workflow

To build a scroll-driven hero from a product video:
1. Generate product images (closed state + exploded/x-ray) via Gemini / Kling
2. Animate into a 3s reveal clip in Kling or Runway
3. Drop at `frontend/public/reveal.mp4`
4. Wire into hero with scroll-linked `<video>` — frame advances with scroll position

---

## Design resources

| Purpose | Tool |
|---|---|
| UI references | https://styles.refero.design, https://ui.watermelon.sh |
| Inspiration | https://curated.design |
| Fonts | https://fontshare.com |
| Backgrounds | https://grainient.supply |
| Illustrations | https://shadcnuikit.com/illustrations |
| Bento layouts | https://bentogrids.com |
| Remove bg | https://remove.bg |
| Video / animate | https://klingai.com |
| Image gen | https://midjourney.com |
| Design research | https://www.lazyweb.com |
| Image → Figma | https://figmify.ai |

---

## Commit hygiene

- No `Co-Authored-By` trailers — no AI attribution of any kind
- Never `git add -A` or `git add .` — add only files this task touched
- Never commit `.env`, `__pycache__/`, log files, private keys
