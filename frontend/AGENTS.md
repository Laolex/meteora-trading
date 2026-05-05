<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Frontend design standards

See `../AGENTS.md` for the full UI design guidelines, motion constants, design tokens, and polish checklist. Always apply them when modifying this frontend.

## Quick reference — motion

```ts
const ease = [0.22, 1, 0.36, 1]

// Hero: y:40 → 0, opacity 0 → 1, 0.8s
// Cards: whileInView, stagger delay i * 0.1s
// Buttons: whileHover scale 1.04, whileTap 0.97, spring stiffness 400 damping 17
```

## Stack

Next.js 16 (App Router) + TypeScript + Tailwind v4 + Motion (`import { motion } from "motion/react"`)

All API calls live in `lib/api.ts` with typed interfaces and mock data. Set `NEXT_PUBLIC_API_URL` to connect the real FastAPI backend.

