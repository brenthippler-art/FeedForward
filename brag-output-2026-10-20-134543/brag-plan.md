# Brag Plan: FeedForward

## What is this app?
FeedForward lets a kitchen describe tonight's surplus in plain words; AI drafts the listings, explicit rules route each item to its best use (people first, then farms, then compost), and a local pantry claims it with a real pickup time.

## The angle
A closing-time story from one town. It's the end of service at a Bowling Green kitchen, there's good food on the counter, and in about twenty seconds it has a destination and a pickup time. No hype, no stats we can't stand behind (dashboard totals are demo data): just the actual workflow, shown plainly, narrated like a neighbor explaining how it works. The warmth comes from the place and the food; the practicality comes from watching the real screens do real steps.

## Hook (first 2-3 seconds)
The site's own hero line, set big over the three hero photos (kitchen / pantry / farm): "Tonight's leftovers." lands, then "Tomorrow's meals." A small kicker reads "Bowling Green, Kentucky". VO opens on closing time.

## Key moments (the middle)
- The donor types the real placeholder sentence into "Describe your surplus" ("About 30 lbs of romaine, outer leaves wilted, two full trays of rice from lunch, and a bucket of potato peels.") and clicks "Draft listings with AI".
- Three draft items pop in one by one, each with its tier badge and the rule's own reason: Romaine → Tier 1 · People, Rice → Tier 1 · People, Potato peels → Tier 2 · Animals. The donor checks "I reviewed every item…" and clicks "Confirm and post food".
- Recipient side: Fountain Square Community Pantry sees the romaine card from Barren River Barbecue, picks a pickup time, clicks "Claim". The card lands in "Your pickups".

## Outro / punchline
FeedForward wordmark, "People first, then farms, then compost.", "Now testing in Bowling Green, Kentucky", feedforward.brentoncodes.dev.

## User flow worth showing
Describe surplus in plain words → AI drafts + rules assign tiers → donor confirms and posts → pantry claims with a pickup time.

## Tone
- Preset: default
- Creative direction: warm, local, practical (user-provided)
- Interpretation: default pacing (5 scenes, ~4s each) but with polished restraint: no jokes, no exclamation marks, soft crossfades and gentle slides, light paper-green palette straight from the app. Narration is plain and friendly, first-person-plural-adjacent, names the town, and explains what happens rather than selling it.

## Format: landscape — 1920x1080
## Duration: ~22s (flexes to narration, hard cap 25s)

## Visual identity (from the project)
- Background: #F5F6F1 (ground), cards #FFFFFF (surface), lines #D9DDD3
- Accent: #24603A (brand), #1A4A2C (brand-dark), verified tint #E2F0E6
- Text: #18211B (ink), #4B554D (muted)
- Tier colors: Tier 1 #E3EBFA / #173E85, Tier 2 #FBE8DC / #8A3109, Tier 3 #F1E8F7 / #5B2A7A
- Display font: Bricolage Grotesque 700
- Body font: Source Sans 3 400/600/700
- Strongest visual element: the hero triptych (hero-kitchen.png, hero-pantry.jpg, hero-farm.jpg) with the green hero panel; the tier badges

## Share copy (draft)
Closing time at a Bowling Green kitchen: describe what's left in plain words, FeedForward drafts the listings, its rules send food to people first, then farms, then compost, and a nearby pantry claims it.

## Data note
All organization names shown (Barren River Barbecue, Fountain Square Community Pantry) are the app's own fictional demo organizations from `lib/demo-users.ts`. No real people, emails, phone numbers, or impact totals appear. Distance and pickup time on the recipient card are illustrative demo values.

## Audio direction
- Role: warm bed under narration, sparse UI accents
- Music: happy-beats-business-moves-vol-11 (warm, business-y)
- Music treatment: fade in over ~0.6s, sit at ~0.30, duck to ~0.13 under voiceover, lift slightly between lines, fade out over the last ~1.2s
- Music cue guidance: preset `assets/music/cues/happy-beats-business-moves-vol-11-by-ende-dot-app.music-cues.json` (114.8 BPM). Strong cues: 1.60s (hook second line), 8.96s (draft cards begin), 17.91s (outro wordmark). Beat grid ~0.52s; draft cards snap to every other beat (≈1.05s apart) so each badge holds readably.
- Audio-reactive treatment: subtle; music RMS/bass gently warms the green hero panel glow and the outro wordmark's soft shadow. No waveform visuals.
- SFX posture: sparse, warm, motion-matched
- Audio-coupled moments: typed description (very light key ticks, thinned), button clicks (Draft / Confirm / Claim), three draft-card arrivals (soft drop), claim success (one gentle bell), outro wordmark (soft impact)
- Restraint rule: no SFX over a spoken word's key stress; never more than one accent per half-second; nothing bright or glassy.

## Voiceover script
1. (hook) "Closing time in Bowling Green. There's good food left over."
2. (describe) "Just describe it, the way you'd tell a coworker."
3. (route) "FeedForward drafts the listings, and its rules send it to people first, then farms, then compost."
4. (claim) "A pantry nearby picks a time, and claims it."
5. (outro) "FeedForward. Now testing in Bowling Green."

Voice: Kokoro af_heart. Each line is generated separately and placed at its scene; scene durations flex to the measured lines.

## Storyboard

### Scene 1 — Closing time — ~3.8s
Hero triptych (kitchen / pantry / farm photos) with their labels "Kitchens donate", "People first", "Then farms". Brand-green panel slides down from the top: kicker "Bowling Green, Kentucky", then "Tonight's leftovers." and "Tomorrow's meals." (verbatim hero copy) in Bricolage uppercase.
Sequential/interaction: yes — line 1 then line 2 (second line on the 1.60s strong cue); photos drift slowly (Ken Burns).
Audio intent: warm open, music fades in.
Audio-coupled idea: soft impact as line 2 lands.
Transition mood: soft → Scene 2 (panel lifts, screen slides up)

### Scene 2 — Describe it — ~5.0s
Recreated donor screen card: "Describe your surplus" + "AI drafts · you confirm" chip, label "What's left in your kitchen?", textarea. The placeholder sentence types in character by character. Cursor glides to "Draft listings with AI" and clicks; button flips to "Drafting…".
Sequential/interaction: yes — typing + simulated click.
Audio intent: quiet, tactile.
Audio-coupled idea: thinned key ticks, one click.
Transition mood: clean slide → Scene 3

### Scene 3 — Rules route it — ~5.6s
Three draft item cards stack in one by one (≈1s apart): name, quantity, condition, tier badge, reason line from `lib/tiers.ts`. Then the confirmation checkbox ticks and the cursor clicks "Confirm and post food"; the green status bar appears.
Sequential/interaction: yes — 3 cards, checkbox, click.
Audio intent: gentle momentum.
Audio-coupled idea: soft drop per card, click on confirm.
Transition mood: clean slide → Scene 4

### Scene 4 — A pantry claims it — ~4.4s
Header "Signed in as Fountain Square Community Pantry". "Available food" card: "Romaine lettuce" · Barren River Barbecue · 2.1 mi, Tier 1 · People, Quantity 30 lbs, Condition "Outer leaves wilted". Pickup time select fills with a time; cursor clicks "Claim"; status "Reserved" and the card appears under "Your pickups".
Sequential/interaction: yes — select, click, card moves.
Audio intent: small, satisfying resolution.
Audio-coupled idea: click, then one gentle success bell.
Transition mood: soft crossfade → Scene 5

### Scene 5 — FeedForward — ~3.6s
Paper background, FeedForward wordmark (Bricolage), three tier badges in a row, "People first, then farms, then compost.", "Now testing in Bowling Green, Kentucky", URL feedforward.brentoncodes.dev. Hold.
Sequential/interaction: badges arrive left to right.
Audio intent: settle and fade.
Audio-coupled idea: soft impact on wordmark (~17.9s cue).
Transition mood: hold to end

**Music mood for this video:** warm, steady
**Audio summary:** a warm bed fades in under a calm narrator, ducks for each line, and lets quiet clicks and drops mark the real UI actions before settling under the wordmark.
