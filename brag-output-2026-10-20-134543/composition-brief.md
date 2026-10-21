# Hyperframes Composition Brief: FeedForward

## Objective
Create a short, narrated launch-style brag video for FeedForward.

## Output
- Composition directory: `brag-output-2026-10-20-134543/composition/`
- Rendered video: `brag-output-2026-10-20-134543/brag.mp4`
- Format: landscape — 1920x1080, 30fps
- Duration: 23.4s

## Source Material
- Project root: `hacktn-starter/`
- Primary files read: README.md, app/layout.tsx, app/globals.css, app/page.tsx, components/DonorForm.tsx, components/AvailableCard.tsx, components/RecipientListings.tsx, components/TierBadge.tsx, components/BestUse.tsx, lib/tiers.ts, lib/demo-users.ts, lib/format.ts, db/seed.ts
- Product name: FeedForward
- Tagline / strongest claim: "Route surplus food to its best use: people first, then farms, then compost."
- Key UI to recreate: hero triptych + green hero panel; "Describe your surplus" card; draft item cards with tier badges; recipient AvailableCard with pickup select and Claim button
- Copy that must appear verbatim:
  - Tonight's leftovers. / Tomorrow's meals.
  - Describe your surplus · AI drafts · you confirm · What's left in your kitchen?
  - About 30 lbs of romaine, outer leaves wilted, two full trays of rice from lunch, and a bucket of potato peels.
  - Draft listings with AI · Confirm and post food · Claim
  - Tier 1 · People / Tier 2 · Animals / Tier 3 · Compost
  - Edible food goes to people first · Cooked food can go to people: confirm how long it has been out · Not for people, but plant-based scraps can feed animals (never pigs)
  - I reviewed every item, its condition, destination, and pickup availability.
  - People first, then farms, then compost.

## Creative Direction
- Tone preset: default
- Creative direction: warm, local, practical
- Interpretation: calm, plain, friendly; soft slides and crossfades; no jokes or hype; the real workflow is the star.
- Angle: closing time at a Bowling Green kitchen; twenty seconds later the leftovers have a destination and a pickup time.
- Hook: hero copy over the three hero photos with "Bowling Green, Kentucky" kicker.
- Outro: wordmark, tier badges, "People first, then farms, then compost.", "Now testing in Bowling Green, Kentucky", feedforward.brentoncodes.dev
- Avoid: generic SaaS language, abstract filler, impact numbers (dashboard data is demo), redesigning the app's look.

## Visual Identity
- Background: #F5F6F1 · Surface: #FFFFFF · Line: #D9DDD3 · Field: #B9BFB3
- Text: #18211B · Muted: #4B554D
- Accent: #24603A (brand), #1A4A2C (brand dark), #E2F0E6 (verified tint)
- Tiers: #E3EBFA/#173E85, #FBE8DC/#8A3109, #F1E8F7/#5B2A7A
- Display font: Bricolage Grotesque 700 (local woff2 from @fontsource)
- Body font: Source Sans 3 400/600/700 (local woff2 from @fontsource)

## Storyboard (timed to the generated narration)
1. Closing time — 0.0–3.8s — triptych, green panel, "Tonight's leftovers." then "Tomorrow's meals." (line 2 beat-locked 1.60s)
2. Describe it — 3.8–8.8s — donor card, typed placeholder sentence, click "Draft listings with AI"
3. Rules route it — 8.8–15.2s — 3 draft cards on every other beat from 8.96s, checkbox, "Confirm and post food", green status
4. A pantry claims it — 15.2–19.5s — Fountain Square Community Pantry; romaine card; pick time; Claim; moves to "Your pickups"
5. FeedForward — 19.5–23.4s — wordmark and outro lines, hold

## Audio
- Audio role: warm bed under narration + sparse UI accents
- Voiceover: Kokoro af_heart, `assets/voiceover.wav` (lines at 0.25, 4.20, 9.00, 15.60, 19.85s)
- Music: `assets/music/happy-beats-business-moves-vol-11-by-ende-dot-app.mp3`, base 0.30, ducked to ~0.13 under each line, fade in 0.6s, fade out last 1.2s
- Music cue guidance: bundled preset vol-11 (114.8 BPM); strong cues 1.60s, 8.96s; beat 19.49s for the outro start
- Audio-reactive: subtle — music RMS/bass warms the hero panel glow and the outro wordmark shadow (`assets/js/audio-data.js`, pre-extracted with hyperframes-creative extract-audio-data.py)
- SFX: thinned keypresses while typing, click_003/click_002 for clicks, drop_001/drop_002 for draft cards, impactBell_heavy_000 for the claim, impactSoft_medium for hook line and wordmark

## Hyperframes Instructions
Standalone `index.html`, one paused GSAP timeline (local `assets/js/gsap.min.js`), local fonts and media only, `npx hyperframes check` must pass before render, render locally.
