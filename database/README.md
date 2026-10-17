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

This step only displays listings. It does not enforce recipient pickup windows,
certify food safety, persist claims, or record pickups. The recipient screen does
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
