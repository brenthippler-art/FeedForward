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

`GET /api/listings` returns a JSON array for the signed-in recipient.
`?tier=1`, `?tier=2`, or `?tier=3` optionally narrows the results.
An optional `recipientId` must match the signed-in identity; it cannot override it.
Responses are not cached. Signed-out requests return 401; donors or requests for
another recipient return 403; invalid tiers return 400; database failures return 503.

The query returns at most 100 positive-quantity items with a name, unit, ready
time, an accepted tier, and a category the recipient has not refused. Expired
items and any item with a Claim are excluded. Claims currently reserve a whole
item. Availability DATETIME values are returned as UTC ISO strings. Items without
migration details are omitted rather than given invented names or availability.
Distance is null because the organization schema has no coordinates. Unknown
meat content remains null. Category names are not restricted to the frontend's
old hardcoded category union.

The recipient screen currently only displays listings. The POST claims API
below validates and persists bookings; the UI is not connected to it yet.
Neither this screen nor the API certifies food safety or records pickups. The recipient screen does
not offer claim controls until a transactional booking API is implemented. The
older `RecipientBoard` remains an unused demo component with local-only actions.

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
a Pickup. GET /api/claims and recipient booking controls are separate next steps.

To verify on OCI, sign in as a seeded recipient and POST JSON through browser
DevTools or an authenticated API client. Use a listing accepted by the recipient,
with future availability and an AcceptanceRule for the requested Central time.
Expect one 201, then 409 for a repeated booking; confirm one Claim row and
unchanged Item.quantity. Also test refused categories, times outside pickup
windows, and two simultaneous requests for the same item in a test database.

Local checks: `node --test tests/*.test.mjs`. Claim tests include the policy,
transaction rollback/release, route responses, and a simulated concurrent lock.
They do not exercise a live MySQL transaction or replace OCI verification.
