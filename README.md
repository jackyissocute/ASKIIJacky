# ASKIIJacky — Interactive ASCII Background

Strict replica of the **contentarchitecture.dev** background effect:

- Full-screen monospace text grid
- Source **image luminance → character opacity** (picture rendered as text halftone)
- **Cursor circular mask** — text disappears inside a soft-edged radius around the pointer
- Subtle **text drift** animation (character index shifts over time)

## Run

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) and move your cursor.

## Customize

| File | Purpose |
| --- | --- |
| `public/portrait.jpg` | Replace with your own high-contrast portrait |
| `src/lib/asciiBackground.ts` | Core renderer — grid size, cursor radius, text pool, contrast |
| `src/components/AsciiInteractiveBackground.tsx` | React wrapper |

## Core algorithm

```
for each grid cell (col, row):
  1. Sample source image brightness at (col, row)
  2. alpha = dimOpacity + brightness * (1 - dimOpacity)
  3. If distance(cell, cursor) < cursorRadius:
       alpha *= smoothstep mask   // circular void
  4. Draw textPool[index] at (col, row) with rgba(255,255,255, alpha)
```

Replace `public/portrait.jpg` with any image to see it rendered as moving text.
