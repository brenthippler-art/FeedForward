# FeedForward

Route surplus food to its best use: **people first, then farms, then compost.**
Built for HackTN26, Challenge #1: *From Surplus to Social Good.*

**Live demo:** http://163.192.109.118

## The problem
Restaurants, campus dining halls and hospital kitchens throw out usable food because nothing connects what's available tonight to who could use it. Pantries and shelters can't see the surplus, and farms that would take scraps for animal feed never hear about it. The handoff (what's safe, who takes it, when it's picked up) happens by phone, if at all.

## How it works
1. A donor describes surplus in plain words.
2. **OCI Generative AI** turns that into structured listings (item, quantity, condition, category).
3. Our tier rules, not the AI, assign each item a tier: **1 · People**, **2 · Animals** (plant-based only), or **3 · Compost**.
4. The donor reviews and confirms every listing.
5. The app suggests up to 3 verified recipients whose own acceptance rules fit.
6. A recipient claims the listing, pickup weight is logged, and the impact dashboard updates.

**The trust rule:** the AI drafts, the recipient's own rules decide the match, and a person confirms every step.

## Team
| Role | Name |
| --- | --- |
| Hacker: Frontend, design, deploys | Brenton Hippler |
| Hacker: Backend, database, AI | Niranjan |
| Herder: Project lead | Amber E. |
| Hustler: Business and pitch | Meklit Sitotaw |

## Stack
- **Frontend:** Next.js (App Router), TypeScript, Tailwind CSS v4
- **Backend:** Next.js API routes, mysql2
- **Oracle Cloud Infrastructure:** Compute (Oracle Linux, nginx, pm2), MySQL HeatWave, Generative AI
- **CI:** GitHub Actions (lint, type check, build on every PR)

## Architecture
```
Browser
  └─ http → nginx (port 80, OCI Compute)
              └─ Next.js app (port 3000, pm2)
                   ├─ MySQL HeatWave (private subnet, 10.0.1.x:3306)
                   └─ OCI Generative AI (us-chicago-1)
```
The database sits on a private subnet and is reachable only from the web server. GenAI calls are signed with an OCI API key stored on the server, never in this repo.

## API
| Endpoint | Receives | Returns |
| --- | --- | --- |
| `POST /api/extract` | `{ text, passcode }` | `DraftListing[]` (not saved) |
| `POST /api/listings` | `{ confirmed: true, listings: [...] }` with per-unit weight and UTC availability; donor from session | Saved listings |
| `GET /api/listings` | Optional `?tier=` | Available food for recipients; own posted food for donors |
| `GET /api/matches?listingId=` | `listingId` | Up to 3 `RecipientMatch` |
| `POST /api/claims` | `{ listingId, recipientId, pickupTime }` | `Claim` |
| `POST /api/pickups` | `{ claimId, actualLbs }` | `Pickup` |
| `GET /api/impact` | — | `Impact` |
| `GET /api/health` | — | `{ ok, db }` |

Shapes are defined in [`types/index.ts`](types/index.ts). Errors return `{ error }` with a 400 or 500 status.

## Technical decisions
- **The AI classifies; code decides.** Tiers come from `lib/tiers.ts`, built on USDA time-and-temperature guidance and the Swine Health Protection Act (Kentucky and Tennessee prohibit feeding food waste to pigs). Matching is deterministic, so it's explainable and repeatable.
- **Shared types as a contract**, so frontend and backend could build in parallel against mock data.
- **Advisory, not certification.** FeedForward cites its sources and requires human confirmation; it doesn't make legal or food-safety determinations.

## Accessibility and testing
- Labels on every input, `aria-current` on navigation, `aria-live` for drafted results, a skip link, and 44px touch targets
- Layout works at phone width
- CI runs ESLint, `tsc --noEmit` and `next build` on every pull request

## Screenshots
_Coming Sunday._

## Local setup
```bash
git clone https://github.com/brenthippler-art/hacktn-starter.git
cd hacktn-starter
npm install
npm run dev
```
Create `.env.local` (never commit it):
```
DB_HOST=
DB_USER=
DB_PASSWORD=
DB_NAME=hacktn
```
The database and GenAI are reachable only from the OCI server, so locally the screens run on mock data from `lib/mock.ts`.

## Deploy (OCI server)
```bash
~/hacktn-starter/deploy.sh   # git pull, npm ci, build, pm2 restart
```

## Sources
- [USDA APHIS: Swine Health Protection Act and human food waste](https://www.aphis.usda.gov/sites/default/files/shpa-human-food-waste-and-swine.pdf)
- [CHLPI: Food Donation Improvement Act](https://chlpi.org/news-and-events/news-and-commentary/food-law-and-policy/new-federal-food-donation-law-seen-as-welcome-and-overdue/)
- [Modern Farmer: Kentucky food donation law (2017)](https://modernfarmer.com/2017/05/kentucky-food-immunity-bill/)