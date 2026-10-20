// Wipes and reseeds demo data via Drizzle, in FK-dependency order:
// Organization -> Donor/Recipient -> Category -> Item -> AcceptedTier/RefusedCategory/AcceptanceRule -> Claim -> Pickup
//
// Preserves the original demo rows (org 1 "Barren River Barbecue", org 11 "Fountain Square Community Pantry", 
// their Donor/Recipient rows, Item 1 "DEMO - Fresh carrots", and the
// AcceptedTier (11, 1) row) — everything else is deleted and rebuilt fresh on every run.
//
// Org IDs match lib/demo-users.ts exactly, since the demo sign-in flow depends on them:
// donors 1-3, recipients 11 (pantry/tier1), 12 (pantry/tier1), 13 (farm/tier2), 14 (compost/tier3).
//
// Shelf-life business rule: for perishable categories, the safety clock starts at
// prep/harvest, not at listing time, so hours_out (time already elapsed before listing)
// eats into the remaining window: safe_until = ready_at + (shelf_life_hours - hours_out).
// Shelf-stable categories (bakery, other) don't track hours_out at all (always NULL) —
// bakery gets a flat window from ready_at, and "other" (canned/packaged goods) never expires.

import { config } from 'dotenv';
config({ path: '.env.local' });

import mysql from 'mysql2/promise';
import { drizzle } from 'drizzle-orm/mysql2';
import { and, eq, ne, not, notInArray } from 'drizzle-orm';
import * as schema from '../drizzle/schema';

const {
  organization,
  donor,
  recipient,
  category,
  item,
  acceptedTier,
  refusedCategory,
  acceptanceRule,
  claim,
  pickup,
} = schema;

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

const db = drizzle(pool, { schema, mode: 'default' });

function toMySQLDateTime(d: Date): string {
  return d.toISOString().slice(0, 19).replace('T', ' ');
}

const now = new Date();
const hoursFromNow = (h: number) => new Date(now.getTime() + h * 3600 * 1000);

// Hours of safe shelf life from prep/harvest, per category. null = shelf-stable (no decay clock).
const SHELF_LIFE_HOURS: Record<string, number | null> = {
  cooked: 2,
  meat: 8,
  produce: 48,
  dairy: 24,
  bakery: 72, // shelf-stable: flat window from ready_at, not hours_out-adjusted
  other: null, // shelf-stable: never expires
};
const SHELF_STABLE = new Set(['bakery', 'other']);

function safeUntil(categoryName: string, readyAt: Date, hoursOut: number | null): string | null {
  const shelfLife = SHELF_LIFE_HOURS[categoryName];
  if (shelfLife === null) return null;
  const elapsed = SHELF_STABLE.has(categoryName) ? 0 : (hoursOut ?? 0);
  return toMySQLDateTime(new Date(readyAt.getTime() + (shelfLife - elapsed) * 3600 * 1000));
}

async function main() {
  // 0. Wipe everything except the original demo rows (org 1/11, Item 1, AcceptedTier (11,1)).
  await db.delete(pickup);
  await db.delete(claim);
  await db.delete(acceptanceRule);
  await db.delete(refusedCategory);
  await db.delete(acceptedTier).where(not(and(eq(acceptedTier.recipientId, 11), eq(acceptedTier.tier, 1))!));
  await db.delete(item).where(ne(item.itemId, 1));
  await db.delete(category).where(ne(category.categoryId, 7)); // 7 = produce, referenced by Item 1
  await db.delete(recipient).where(ne(recipient.orgId, 11));
  await db.delete(donor).where(ne(donor.orgId, 1));
  await db.delete(organization).where(notInArray(organization.orgId, [1, 11]));
  console.log('Wiped existing data (kept demo rows: org 1/11, Item 1, AcceptedTier 11/1)');

  // 1. Organization (2, 3, 12-14; 1 and 11 are preserved, untouched)
  await db.insert(organization).values([
    {
      orgId: 2,
      orgName: 'Hiilltop Dining Hall',
      streetAddress: 'Sample address',
      city: 'Bowling Green',
      state: 'KY',
      zipCode: '42101',
      contactName: 'Jimmy Dean',
      contactEmail: 'dining@example.com',
      contactPhone: '270-555-0102',
    },
    {
      orgId: 3,
      orgName: 'Warren Regional Hospital',
      streetAddress: '1 Hospital Way',
      city: 'Bowling Green',
      state: 'KY',
      zipCode: '42101',
      contactName: 'Florence Nightingale',
      contactEmail: 'hospital@example.com',
      contactPhone: '270-555-0103',
    },
    {
      orgId: 12,
      orgName: 'Porch LightSupper Table',
      streetAddress: '1 Porch Light',
      city: 'Bowling Green',
      state: 'KY',
      zipCode: '42101',
      contactName: 'Demo Recipient',
      contactEmail: 'shelter@example.com',
      contactPhone: '270-555-0112',
    },
    {
      orgId: 13,
      orgName: 'Drakes Creek Goat & Garden',
      streetAddress: '123456 Old Scottsville Rd',
      city: 'Bowling Green',
      state: 'KY',
      zipCode: '42104',
      contactName: 'Joel Salatin',
      contactEmail: 'farm@example.com',
      contactPhone: '270-555-0113',
    },
    {
      orgId: 14,
      orgName: 'Last Call Compost',
      streetAddress: 'Sample address',
      city: 'Bowling Green',
      state: 'KY',
      zipCode: '42101',
      contactName: 'Demo Recipient',
      contactEmail: 'compost@example.com',
      contactPhone: '270-555-0114',
    },
  ]);

  // 2. Donor / Recipient (subclasses of Organization)
  await db.insert(donor).values([{ orgId: 2 }, { orgId: 3 }]);
  await db.insert(recipient).values([
    { orgId: 12, type: 'pantry' },
    { orgId: 13, type: 'farm' },
    { orgId: 14, type: 'compost' },
  ]);
  console.log('Seeded Organization, Donor, Recipient');

  // 3. Category (produce = id 7, preserved; the rest rebuilt)
  await db.insert(category).values([
    { categoryName: 'dairy' },
    { categoryName: 'meat' },
    { categoryName: 'bakery' },
    { categoryName: 'cooked' },
    { categoryName: 'other' },
  ]);
  const categories = await db.select().from(category);
  const categoryId = Object.fromEntries(categories.map((c) => [c.categoryName, c.categoryId]));
  console.log('Seeded Category');

  // 4. Item — diverse categories/tiers, shelf-life computed per the rules above,
  // including one already-expired item to exercise the exclusion path in lib/listings.ts.
  const itemRows = [
    {
      // Cooked dish, correctly categorized "cooked" (not "meat" — it's prepared food).
      donorId: 1,
      categoryId: categoryId['cooked'],
      quantity: 12,
      unitWeight: '2.00',
      tier: 1,
      itemName: 'Fried chicken tenders',
      unit: 'trays',
      condition: 'Still warm, end of dinner service',
      containsMeat: 1,
      hoursOut: '0.50',
      tierReason: 'Cooked meat, safe for same-day human consumption',
      readyAt: toMySQLDateTime(now),
      safeUntil: safeUntil('cooked', now, 0.5),
    },
    {
      donorId: 3,
      categoryId: categoryId['cooked'],
      quantity: 8,
      unitWeight: '3.00',
      tier: 2,
      itemName: 'Cooked vegetable scraps',
      unit: 'bins',
      condition: 'End of service, plant-based',
      containsMeat: 0,
      hoursOut: '1.50',
      tierReason: 'Cooked, plant-based: OK for animal feed',
      readyAt: toMySQLDateTime(now),
      safeUntil: safeUntil('cooked', now, 1.5),
    },
    {
      // Raw meat: fresh, still within the 8h window.
      donorId: 1,
      categoryId: categoryId['meat'],
      quantity: 10,
      unitWeight: '1.00',
      tier: 1,
      itemName: 'Fresh ground turkey, unopened',
      unit: 'lbs',
      condition: 'Refrigerated, unopened',
      containsMeat: 1,
      hoursOut: '2.00',
      tierReason: 'Fresh raw meat within safe window: OK for people',
      readyAt: toMySQLDateTime(hoursFromNow(-1)),
      safeUntil: safeUntil('meat', hoursFromNow(-1), 2),
    },
    {
      // Raw meat: already past its 8h window by the time it's listed -> compost, and
      // already-expired (tests the "expired items get excluded" path).
      donorId: 1,
      categoryId: categoryId['meat'],
      quantity: 6,
      unitWeight: '1.50',
      tier: 3,
      itemName: 'Raw beef trim, past safe window',
      unit: 'bins',
      condition: 'Refrigerated too long, no longer fit for people or animals',
      containsMeat: 1,
      hoursOut: '10.00',
      tierReason: 'Past the 8h raw-meat safety window: compost only',
      readyAt: toMySQLDateTime(hoursFromNow(-10)),
      safeUntil: safeUntil('meat', hoursFromNow(-10), 10),
    },
    {
      donorId: 2,
      categoryId: categoryId['produce'],
      quantity: 40,
      unitWeight: '1.00',
      tier: 1,
      itemName: 'Romaine lettuce, whole heads',
      unit: 'lbs',
      condition: 'Outer leaves wilted',
      containsMeat: 0,
      hoursOut: '6.00',
      tierReason: 'Produce in usable condition: OK for people',
      readyAt: toMySQLDateTime(hoursFromNow(-2)),
      safeUntil: safeUntil('produce', hoursFromNow(-2), 6),
    },
    {
      donorId: 1,
      categoryId: categoryId['produce'],
      quantity: 15,
      unitWeight: '2.00',
      tier: 3,
      itemName: 'Vegetable peels and trim',
      unit: 'bins',
      condition: 'Raw trim',
      containsMeat: 0,
      hoursOut: '1.00',
      tierReason: 'Raw trim: compost only',
      readyAt: toMySQLDateTime(hoursFromNow(-1)),
      safeUntil: safeUntil('produce', hoursFromNow(-1), 1),
    },
    {
      // This is the item we'll claim + pick up below.
      donorId: 3,
      categoryId: categoryId['dairy'],
      quantity: 24,
      unitWeight: '0.50',
      tier: 1,
      itemName: 'Unopened 2% milk cartons',
      unit: 'cartons',
      condition: 'Unopened, refrigerated',
      containsMeat: 0,
      hoursOut: '2.00',
      tierReason: 'Unopened dairy within date: OK for people',
      readyAt: toMySQLDateTime(hoursFromNow(-0.5)),
      safeUntil: safeUntil('dairy', hoursFromNow(-0.5), 2),
    },
    {
      // Shelf-stable: hoursOut is always NULL, flat window from ready_at.
      donorId: 2,
      categoryId: categoryId['bakery'],
      quantity: 60,
      unitWeight: '0.15',
      tier: 1,
      itemName: 'Day-old dinner rolls',
      unit: 'rolls',
      condition: 'Baked yesterday',
      containsMeat: 0,
      hoursOut: null,
      tierReason: 'Shelf-stable baked good: OK for people',
      readyAt: toMySQLDateTime(hoursFromNow(-20)),
      safeUntil: safeUntil('bakery', hoursFromNow(-20), null),
    },
    {
      // Shelf-stable: hoursOut NULL, never expires.
      donorId: 2,
      categoryId: categoryId['other'],
      quantity: 10,
      unitWeight: '5.00',
      tier: 3,
      itemName: 'Expired canned goods, unopened',
      unit: 'cases',
      condition: 'Past date, sealed',
      containsMeat: 0,
      hoursOut: null,
      tierReason: 'Past date, not fit for people or animals: compost',
      readyAt: toMySQLDateTime(hoursFromNow(-5)),
      safeUntil: safeUntil('other', hoursFromNow(-5), null),
    },
  ];

  // $returningId() can't infer a type here because drizzle-kit's introspected schema
  // declares primary keys via the table-level primaryKey() helper rather than chaining
  // .primaryKey() on the column, so we read the raw insertId instead. MySQL guarantees
  // contiguous auto-increment IDs within a single multi-row INSERT, so the milk item
  // (7th row, index 6) is insertId + 6.
  const [itemResult] = await db.insert(item).values(itemRows);
  const milkItemId = (itemResult as unknown as { insertId: number }).insertId + 6;
  console.log(`Seeded Item (${itemRows.length} rows)`);

  // 5. AcceptedTier / RefusedCategory / AcceptanceRule (recipient rules, 3NF)
  // (11, 1) already exists and was preserved above.
  await db.insert(acceptedTier).values([
    { recipientId: 12, tier: 1 },
    { recipientId: 13, tier: 2 },
    { recipientId: 14, tier: 3 },
  ]);

  await db.insert(refusedCategory).values([
    { recipientId: 12, categoryId: categoryId['dairy'] }, // shelter kitchen: no refrigeration
    { recipientId: 13, categoryId: categoryId['bakery'] }, // farm: no sugary baked goods for livestock
  ]);

  await db.insert(acceptanceRule).values([
    { recipientId: 11, dayOfWeek: 'Mon', pickupStart: '08:00:00', pickupEnd: '14:00:00' },
    { recipientId: 11, dayOfWeek: 'Thu', pickupStart: '08:00:00', pickupEnd: '14:00:00' },
    { recipientId: 12, dayOfWeek: 'Tue', pickupStart: '09:00:00', pickupEnd: '17:00:00' },
    { recipientId: 13, dayOfWeek: 'Fri', pickupStart: '07:00:00', pickupEnd: '11:00:00' },
    { recipientId: 14, dayOfWeek: 'Sun', pickupStart: '00:00:00', pickupEnd: '00:00:00' }, // 24-hour drop-off
  ]);
  console.log('Seeded AcceptedTier, RefusedCategory, AcceptanceRule');

  // 6. Claim (recipient 11 reserves the milk cartons)
  const [claimResult] = await db.insert(claim).values([
    {
      itemId: milkItemId,
      recipientId: 11,
      pickupTime: toMySQLDateTime(hoursFromNow(2)),
    },
  ]);
  const milkClaimId = (claimResult as unknown as { insertId: number }).insertId;
  console.log('Seeded Claim');

  // 7. Pickup (the claim gets fulfilled; trigger decrements Item.quantity)
  await db.insert(pickup).values([
    {
      claimId: milkClaimId,
      quantity: 24,
      actualLbs: '11.800',
    },
  ]);
  console.log('Seeded Pickup');
}

main()
  .then(() => {
    console.log('Done.');
    return pool.end();
  })
  .catch(async (err) => {
    console.error('Seed failed:', err);
    await pool.end();
    process.exit(1);
  });
