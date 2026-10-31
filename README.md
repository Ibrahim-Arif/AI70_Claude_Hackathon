# Tally

A mobile-first web demo of **Tally**, a personal finance app that shows which companies your money reaches and how that matches values you define yourself. Everything runs on illustrative mock data. Two small AI features call Claude from server routes, and both have scripted fallbacks, so the whole demo works with no API key.

## Setup

```bash
npm install
npm run dev        # http://localhost:3000
npm test           # engine + AI-layer unit tests (Vitest)
npm run build      # production build
```

Node 20+ (tested on Node 24).

## Environment variables

Both are optional. Copy `.env.example` to `.env.local`.

| Variable | Default | What it does |
|---|---|---|
| `ANTHROPIC_API_KEY` | none | Turns on live AI. Without it, every AI call uses the scripted responses. |
| `ANTHROPIC_MODEL` | `claude-haiku-5-5` | Model used by `/api/parse-preference` and `/api/explain`. |

The key is only read in server route handlers. It never reaches the browser.

## How it fits together

| Path | What's there |
|---|---|
| `lib/engine.ts` | Deterministic rules: `evaluate`, `label`, reasons, summary, flags, alternatives, generic mode. AI never computes labels, totals or ratings. |
| `data/` | Merchants and ratings, ~60 October transactions, `merchantMap.json` (bank descriptor → merchant), alternatives, static September and November numbers. |
| `lib/ai/` | zod schemas, system prompts, scripted responses, the explanation template and its validator, and the client helpers (900 ms minimum processing time, per-merchant + profile-hash cache). |
| `app/api/` | `parse-preference`, `explain`, `status`. Live calls time out at 6 s; failures, invalid JSON or failed validation fall back silently. |
| `components/ui/` | The component library (buttons, rows, cards, sheet, toast, tab bar, halftone compass, AI summary). |
| `app/globals.css` | Design tokens. Tailwind v4 is configured in CSS (`@theme`), so this replaces `tailwind.config`. The default palette is cleared, so only brand colors exist. |

Above 500 px wide, the app renders inside a centered 390×844 phone frame that scales down to fit shorter screens (projectors).

## Demo script (about 2 minutes, no API key needed)

1. **Start** → name "Maya" → **Values**: Climate, Worker treatment, Local business → **Add your own**: "I prefer not to eat at fast food chains" → answer **No** → **Add** → **Continue** → leave the defaults (+5%) → **See my spending** → **Link with Plaid** → Demo Bank → loading screen → **Home shows 78%**.
2. **Spending** → Maple Street Bakery → Unknown, with "There isn't enough reliable evidence to recommend a change here."
3. **Values** tab → Worker treatment → **Dealbreaker** → toast "3 merchants changed" → **Home** animates 78% → 64%.
4. **Spending** → **Flagged** → Amazon (Conflicts, reason line, Parent company scope, AI summary) → **Find alternatives** → Northwind Goods (+4%), "1 more option is over your budget."
5. **Set a goal** → $100 → **Save goal** → Home shows the goal card.
6. **October report** → **November** → goal progress $213 → $120.

Other inputs the Add sheet handles in scripted mode: "Avoid Amazon", "political association" (two clarifying questions), "companies with good parental leave" (not tracked yet), and identity-based avoidance (declined, with a support-framed alternative).

### Presenter controls

- **Demo panel**: triple-tap the "Tally" wordmark, or open any URL with `?demo=1`. Reset, jump to any step, switch AI mode (Live / Scripted), or fill Maya's profile.
- **Keyboard (desktop)**: `R` reset, `1`–`9` jump (Start, Home 78%, Values, Home 64%, Spending, Amazon sheet, Report November, Report October, Loading), `S` toggle scripted AI.
- **`?fill=maya`** on any URL loads Maya's finished profile before the page renders.

## Deploy to Vercel

1. Push this folder to a GitHub repository.
2. In Vercel, **Add New → Project** and import the repository. The defaults (Next.js, `npm run build`) need no changes.
3. Optional: under **Settings → Environment Variables**, add `ANTHROPIC_API_KEY` (and `ANTHROPIC_MODEL` if you want a different model), then redeploy.

Or from the CLI:

```bash
npx vercel          # preview deployment
npx vercel --prod   # production
```

## Notes

- Ratings, sources and alternatives are illustrative demo data. Source links point to example.com.
- Labels follow the rules in the brief: a Dealbreaker fail → Conflicts; an unknown on an Important or Dealbreaker value → Unknown; an Important fail → Mixed; otherwise Aligned. Nice-to-have values only add notes. Unknown is never shown as Aligned.
- "Keep it" removes a merchant from flags but not from the percentage.
- Reduced motion is respected: motion becomes fades and count-ups and typewriter effects are skipped.
