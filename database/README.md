# Recipient listings integration

The application uses the mixed-case tables (`Item`, `Organization`, `Donor`,
`Recipient`, `Category`, `AcceptedTier`, `RefusedCategory`, `Claim`, `Pickup`).
The uppercase duplicate tables are not used by this integration.

## Prerequisites

- Apply `migrations/001_listing_details.sql` once, or have the schema owner apply
  equivalent columns. This application does not run migrations automatically.
- Configure `DB_HOST`, `DB_USER`, `DB_PASSWORD`, and `DB_NAME` on the Next.js server.
- Store `Item.ready_at` and `Item.safe_until` as UTC DATETIME values.
- Store item weights in pounds. Decimal values are converted to JSON numbers.
- Seed organizations and recipient records with IDs matching `lib/demo-users.ts`
  (11 and 12 for pantries, 13 for the farm, 14 for compost), or coordinate changes
  to the demo identities with the schema owner. The demo cookie is not production
  authentication.
- Add `AcceptedTier` rows for each recipient, and `RefusedCategory` rows where needed.

## API

`GET /api/listings` returns a JSON array for the signed-in recipient, or the
signed-in donor’s own posted items (see donor posting below).
`?tier=1`, `?tier=2`, or `?tier=3` optionally narrows the results.
An optional `recipientId` must match the signed-in identity; it cannot override it.
Responses are not cached. Signed-out requests return 401; requests for another recipient return 403; invalid tiers return 400; database failures return 503.

The query returns at most 100 positive-quantity items with a name, unit, ready
time, an accepted tier, and a category the recipient has not refused. Expired
items and any item with a Claim are excluded. Claims currently reserve a whole
item. Availability DATETIME values are returned as UTC ISO strings. Items without
migration details are omitted rather than given invented names or availability.
Distance is null because the organization schema has no coordinates. Unknown
meat content remains null. Category names are not restricted to the frontend's
old hardcoded category union.

The recipient screen reads listings and saved claims and books through the POST
claims API below. The recipient screen submits pickup confirmations through the pickup API below.
Neither endpoint certifies food safety.

## Verify on the OCI-connected application

1. Open `/database-check` and confirm the mixed-case tables can be read.
2. Ensure at least one Item has positive quantity, item_name, unit, ready_at,
   a future safe_until when applicable, and no Claim. Existing rows need real
   donor-provided details filled in after migration.
3. Sign in as a recipient whose AcceptedTier and RefusedCategory rules permit it.
4. Open `/api/listings` in that browser to inspect the array.
5. Open `/recipient` to view the same food cards. Refresh fetches current data.
6. Verify another tier or refused category is excluded. If the API returns [],
   check recipient IDs and rules before changing the query.

Local checks: `node --test tests/listings.test.mjs`, `npx tsc --noEmit`,
and `npm run lint`. Tests isolate DB/session dependencies; they do not verify
connectivity or execute SQL against OCI.


## Whole-listing reservations and completion

Each listing can have one claim (`uq_claim_item`), and each claim can have one
completed pickup (`uq_pickup_claim`). Completion must collect the entire positive
remaining item quantity. Partial reservations/pickups, cancellation, and
reassignment are outside this version. The existing stock trigger decrements
quantity exactly once; the new guard validates and locks stock before it runs.
Future APIs must also enforce ownership, recipient rules, expiry and pickup times.

For an existing database, run from the project root on a machine that can reach
OCI, with a schema administrator's database credentials:

```bash
node scripts/migrate-whole-listings.mjs --check
node scripts/migrate-whole-listings.mjs --apply
```

The default and `--check` are read-only. `--apply` runs
`migrations/002_whole_listing_reservations.sql` after preflight. Coordinate a pause
in writes with the schema owner while applying. Preflight rejects existing
multiple claims for an item, multiple pickups for a claim, nonpositive pickup
quantities, or a missing `before_pickup_insert` trigger. It never deletes records
or repairs inventory. Existing partial pickups cannot be identified reliably
from current remaining stock alone and need manual review if any were used.

Run the upgrade once. MySQL DDL commits each statement separately: if an apply
fails partway, inspect the constraints/triggers before resuming; do not assume
rollback or rerun the entire migration blindly. Do not replay the initial,
commented Drizzle introspection migration against existing tables. New databases
created from `db/schema.sql` already contain these constraints and the guard, so
must not run this upgrade.

Verify after applying:

```sql
SHOW INDEX FROM Claim WHERE Key_name = 'uq_claim_item';
SHOW INDEX FROM Pickup WHERE Key_name = 'uq_pickup_claim';
SELECT TRIGGER_NAME, ACTION_ORDER
FROM information_schema.TRIGGERS
WHERE TRIGGER_SCHEMA = DATABASE() AND EVENT_OBJECT_TABLE = 'Pickup'
ORDER BY ACTION_ORDER;
```

Both indexes must have `Non_unique = 0`; `before_pickup_whole_listing` must run
before `before_pickup_insert`. To validate behavior, use a disposable test database:
a second claim for the same item and a second completion for the same claim must
fail; zero, negative, or partial pickup quantities must fail; one full completion
must leave item quantity zero. Verify rejected inserts leave stock unchanged.
Run two simultaneous claims for the same item and confirm only one succeeds.

Local migration-runner checks:
`node --test tests/whole-listing-migration.test.mjs`. These isolate the SQL client;
they do not replace executing the constraints and triggers in a MySQL test database.


## Create a claim

`POST /api/claims` accepts JSON from a signed-in recipient:

```json
{"listingId": 1, "pickupTime": "2026-10-18T15:00:00Z"}
```

Use a future time appropriate to the actual listing. The identity comes from the
demo session; omit `recipientId`, or provide the same numeric ID. A successful
response is HTTP 201 with `{ id, listingId, recipientId, pickupTime }`. The
normalized pickupTime is UTC ISO. The DB stores it in UTC DATETIME with whole
second precision. Invalid JSON, IDs, timestamps, or pickup times return 400;
signed-out callers get 401; donors, spoofed identities and rejected recipient
rules get 403; missing listings get 404; already claimed/unavailable listings get
409. Unexpected database failures return 503 without exposing SQL details. If a
booking could not be confirmed, refresh before retrying: a network error can
occur after commit. This endpoint does not offer idempotent replay yet.

The endpoint locks the Item row, checks for an existing Claim, and holds shared
locks on the recipient and acceptance rules through commit. It requires positive
stock, a name, unit and ready_at, an accepted tier, no refused category, and a
matching AcceptanceRule window. A missing pickup-window rule means no booking is
permitted. Pickup must be in the future, at/after ready_at, and strictly before
safe_until when supplied. Tier 1 requires a donor-provided safe_until; tiers 2/3
may have no deadline. No safety deadline is inferred from unknown data.

AcceptanceRule times are interpreted as **America/Chicago** wall time, consistent
with the existing UI. day_of_week is the start day. Start is inclusive and end is
exclusive; an earlier end wraps into the next day, including Sunday boundaries.
Equal endpoints span the whole local day from that start time. Both occurrences
of a repeated DST hour follow the same wall-time rule. All organizations currently
share this timezone; supporting other zones needs an organization timezone field.

Apply the whole-listing upgrade above before enabling writes. The database
unique constraint is a second defense against duplicate claims. The application
also serializes attempts on the Item row. A claim never changes stock or inserts
a Pickup. Saved claims and booking controls are described below.

To verify on OCI, sign in as a seeded recipient and POST JSON through browser
DevTools or an authenticated API client. Use a listing accepted by the recipient,
with future availability and an AcceptanceRule for the requested Central time.
Expect one 201, then 409 for a repeated booking; confirm one Claim row and
unchanged Item.quantity. Also test refused categories, times outside pickup
windows, and two simultaneous requests for the same item in a test database.

Local checks: `node --test tests/*.test.mjs`. Claim tests include the policy,
transaction rollback/release, route responses, and a simulated concurrent lock.
They do not exercise a live MySQL transaction or replace OCI verification.


## Saved pickups and booking controls

`GET /api/claims` returns up to 100 reservations for the signed-in recipient.
The array contains `claimId`, `listing` (id, item, donorName, quantity, unit,
estimatedLbs, tier), `pickupTime`, `status` (`claimed` or `picked_up`), and
`actualLbs` (number or null). Pending reservations are first, in scheduled order;
completed pickups follow, newest completion first. Past reservations stay visible
and acceptance-rule changes do not erase history. An existing Pickup row marks
completion even if its measured weight was never recorded. Completed quantities
come from Pickup.quantity, since Item.quantity is decremented at collection.

The session owns the recipient ID. An optional `recipientId` query parameter
must match it. Signed-out requests get 401, donors or other-recipient requests
get 403, and read failures get 503. Responses use `Cache-Control: no-store`.

`GET /api/listings` also adds `pickupSlots`, a UTC ISO string array generated from
the database clock, listing availability, and the recipient's Central-time pickup
rules. Options are future half-hour appointments, strictly before expiry, limited
to the next seven days and the first 48 matching options. Tier 1 without a donor
pickup deadline has no booking options. An empty array leaves the listing visible
with a message explaining that no time matches; it does not infer safe availability.
The POST API remains the authority and revalidates every booking.

The recipient page fetches both arrays independently and shows existing bookings
under Your pickups after reload. During POST it disables booking and refresh
controls. On success it displays the confirmed reservation, then refreshes both
resources. Conflict or uncertain network outcomes also trigger a read refresh;
there is no automatic POST retry. A failed read is reported explicitly and blocks
booking until refreshed, while retaining previously loaded records for context.

PickupCard displays pending reservations and already completed records from the
database. The live screen does not expose the old local-only completion action;
completion controls will be connected when POST /api/pickups is implemented.
No new schema migration is required for this integration.

Verification after deploying: sign in as a recipient; reserve an item at an offered
time; confirm it disappears from Available food and appears in Your pickups;
reload the page and confirm the same claim persists. A second recipient must not
see that reservation. Test a conflict with another booking and a read failure.
Browser checks during development can mock the API to test these cases without
creating live reservations. Database SELECT verification can be performed separately.


## Donor posting

`POST /api/listings` accepts a reviewed batch of 1–20 items from a signed-in donor:

```json
{
  "confirmed": true,
  "listings": [{
    "item": "Fresh carrots",
    "quantity": 2,
    "unit": "boxes",
    "unitWeight": 5.25,
    "condition": "Chilled, whole",
    "category": "produce",
    "containsMeat": false,
    "hoursOut": null,
    "tier": 1,
    "readyAt": "2026-10-19T14:00:00Z",
    "safeUntil": "2026-10-19T20:00:00Z"
  }]
}
```

Use actual availability, not the example dates. Timestamps are UTC with whole
seconds. The website accepts device-local datetime inputs and converts them to
UTC; it does not assume the browser is in Central time. Ready time may be in the
past for food already available. A supplied deadline must be later than both the
ready time and the current database clock. Tier 1 requires a deadline; no expiry
is invented for other tiers. The server revalidates using its database clock
after locking the donor record.

Quantity must be a positive whole number because Item.quantity is INT. unitWeight
is pounds per unit, positive with at most two decimal places. Both per-unit and
generated total weight must fit DECIMAL(8,2), up to 999999.99 lbs. The database
computes total_weight; clients cannot supply it. The response's estimatedLbs is
read back from that generated column. For fractional bulk quantities, use one
container/lot with its measured per-container weight rather than fractional counts.

Required fields include the food name, unit, known condition, category, meat
content, tier and ready time. Categories must be one of produce/dairy/meat/bakery/
cooked/other and must already exist in Category. A missing category fails the
whole batch; this endpoint does not create category records. Cooked food requires
hoursOut. Tier 2 rejects meat-containing/contact items. Cooked food reported out
for more than two hours is rejected for tier 1. These are rejection checks, not
food-safety certification or a complete tier classifier; shorter exposure limits
can apply in hot conditions. See [USDA leftovers guidance](https://www.fsis.usda.gov/food-safety/safe-food-handling-and-preparation/food-safety-basics/leftovers-and-food-safety)
and the existing donation safety panel. The donor must choose an appropriate
route and availability. Shared tier-rule/AI integration remains a separate task.

The donor ID comes from the session. An optional numeric donorId must match it.
The server verifies Donor membership, locks category records, inserts the batch,
reads the stored values, and commits in one transaction. Validation or insert
failures roll back the entire batch. Item IDs, donor ownership, generated total
weight and tierReason are server-owned; the reason is recorded as donor-confirmed,
not presented as an AI safety determination.

Success returns HTTP 201 with the saved-item array. Invalid or unconfirmed data
returns 400 with `{ error, fields }`; fields use keys like
`listings.0.unitWeight` or `confirmed`. Authentication failures return 401/403;
unexpected DB failures return 503 without SQL details. There is no idempotency
key yet. The UI disables double submission and never automatically retries a
POST. After an uncertain outcome it refreshes posted food and locks the old form
until the donor reviews history and explicitly starts a new post.

`GET /api/listings` for donors returns only their own last 100 items, newest first,
including availability, remaining quantity/weight, and status derived from Claim
and Pickup. Optional tier filtering still applies. Recipient behavior remains
unchanged apart from the already added booking options; a donor cannot use
recipientId to inspect recipient-specific listings.

The donor form supports manual entry and clearly labeled editable sample items.
It saves real confirmed items and shows Your posted food, including after refresh.
It does not call an AI extraction service or redirect to the still-mocked matches
page. No schema migration is required. Existing demo sign-in is not production
authentication. Do not run db/seed.ts to verify posting: it deletes existing rows.

Verification: deploy the code, sign in as a donor, add food with a known condition
and actual future pickup deadline, confirm and post. Verify its stored ID and
weight in Your posted food, reload, then sign in as a recipient whose rules accept
it and refresh Available food. Check read/write error states without automatically
retrying submissions. Local regression command: `node --test tests/*.test.mjs`.
Browser tests can mock persistence; live insertion and subsequent claim/pickup
verification should use designated test records with the schema owner.

## Pickup confirmation API

`POST /api/pickups` accepts `{ "claimId": 7, "actualLbs": 10.125 }` from a
signed-in recipient. The session determines ownership; the client cannot choose
another recipient or submit a partial quantity. Actual weight must be a JSON
number from 0.001 through 9999999.999 pounds, with at most three decimal places.

The transaction locks Item before Claim, rechecks ownership, rejects an existing
Pickup, and inserts the entire current item quantity with measured weight and a
UTC completion timestamp. The existing stock trigger alone decrements inventory.
The API requires current recipient acceptance rules, an open Central-time pickup
window, food that is ready, the reserved pickup time reached, and an unexpired
pickup deadline (required for Tier 1). It does not backdate completion.

Success returns 201 with `{ id, claimId, actualLbs, pickedUpAt }`. Invalid input
returns 400, signed-out requests 401, wrong role/ownership or changed food rules
403, missing reservations 404, and duplicate/unavailable completions 409.
Unexpected database errors return 503: refresh saved pickups before retrying,
since a connection failure during commit can leave the outcome uncertain.

Prerequisites: `Pickup.actual_lbs`, unique `uq_pickup_claim`, the whole-listing
guard, and the existing inventory trigger must be installed. This endpoint does
not run migrations. The recipient button posts to this endpoint and reloads saved pickups after
every write attempt. API/service tests use isolated database doubles and do not verify OCI SQL,
trigger execution, or real concurrent database transactions.


## Live workflow screens

- `/recipient` loads saved reservations, submits actual weight to `/api/pickups`,
  disables actions during a write/reload, and rereads saved state after success or
  failure. A lost POST response is never retried automatically.
- Donor posted-food cards link to `/donor/matches?listingId=...`. The page loads
  the donor's saved listings and `/api/matches` for the selected available item.
  Reserved, empty, or expired items cannot return match results. Suggestions do
  not assign a recipient or create a claim; recipients book from their own account.
- `/dashboard` reads `/api/impact` with loading, retry and refresh states. Signed-in
  recipients receive their own totals; donors and anonymous visitors receive
  platform-wide totals, clearly labeled. The endpoint derives scope from the
  session and rejects another organization's ID.
- Impact is all-time completed-pickup data, not monthly or AI-generated copy.
  Measured weight is preferred; old unmeasured rows use Pickup.quantity times
  Item.unit_weight, since remaining Item.quantity is decremented by the trigger.
  Meal conversions remain unavailable rather than invented.

After deployment, verify: donor posts and reloads food → views that saved item's
suggested recipients → recipient reserves it → at the reserved time, within the
acceptance window and before expiry, confirms actual weight → refresh still
shows Picked up → dashboard displays the recorded weight and completed pickup.
An early completion or expired pickup is rejected by the existing backend rules.

Local browser verification uses controlled API fixtures for loading, error/retry,
selection, completion, repeat-click prevention and lost-response reconciliation.
It does not execute SQL or mutate the OCI demo database; verify database triggers
and completion on the deployed application before declaring the live flow tested.
