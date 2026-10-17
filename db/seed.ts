// Seeds demo data via Drizzle, in FK-dependency order:
// Organization -> Donor/Recipient -> Category -> Item -> AcceptedTier/RefusedCategory/AcceptanceRule -> Claim -> Pickup
//
// Organization/Donor/Recipient/Category/AcceptedTier/RefusedCategory/AcceptanceRule are
// upserted (safe to re-run). Item/Claim/Pickup have no natural business key, so re-running
// this script will add another round of those rows.
//
// Org IDs match lib/demo-users.ts exactly, since the demo sign-in flow depends on them:
// donors 1-3, recipients 11 (pantry/tier1), 12 (pantry/tier1), 13 (farm/tier2), 14 (compost/tier3).

import { config } from 'dotenv';
config({ path: '.env.local' });

import mysql from 'mysql2/promise';
import { drizzle } from 'drizzle-orm/mysql2';
import { sql } from 'drizzle-orm';
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
const hoursFromNow = (h: number) => toMySQLDateTime(new Date(now.getTime() + h * 3600 * 1000));

async function main() {
  // 1. Organization
  await db
    .insert(organization)
    .values([
      {
        orgId: 1,
        orgName: 'Two-Step Hot Chicken',
        streetAddress: 'Sample address',
        city: 'Nashville',
        state: 'TN',
        zipCode: '37201',
        contactName: 'Demo Donor',
        contactEmail: 'donor@example.com',
        contactPhone: '615-555-0101',
      },
      {
        orgId: 2,
        orgName: 'Athens of the South Dining Hall',
        streetAddress: 'Sample address',
        city: 'Nashville',
        state: 'TN',
        zipCode: '37203',
        contactName: 'Demo Donor',
        contactEmail: 'dining@example.com',
        contactPhone: '615-555-0102',
      },
      {
        orgId: 3,
        orgName: 'Music City Hospital',
        streetAddress: 'Sample address',
        city: 'Nashville',
        state: 'TN',
        zipCode: '37232',
        contactName: 'Demo Donor',
        contactEmail: 'hospital@example.com',
        contactPhone: '615-555-0103',
      },
      {
        orgId: 11,
        orgName: 'Harmony Hall Community Pantry',
        streetAddress: 'Sample address',
        city: 'Nashville',
        state: 'TN',
        zipCode: '37201',
        contactName: 'Demo Recipient',
        contactEmail: 'pantry@example.com',
        contactPhone: '615-555-0111',
      },
      {
        orgId: 12,
        orgName: 'Back Porch Supper Table',
        streetAddress: 'Sample address',
        city: 'Nashville',
        state: 'TN',
        zipCode: '37206',
        contactName: 'Demo Recipient',
        contactEmail: 'shelter@example.com',
        contactPhone: '615-555-0112',
      },
      {
        orgId: 13,
        orgName: 'Riverbend Goat & Garden',
        streetAddress: 'Sample address',
        city: 'Nashville',
        state: 'TN',
        zipCode: '37218',
        contactName: 'Demo Recipient',
        contactEmail: 'farm@example.com',
        contactPhone: '615-555-0113',
      },
      {
        orgId: 14,
        orgName: 'Last Call Compost',
        streetAddress: 'Sample address',
        city: 'Nashville',
        state: 'TN',
        zipCode: '37210',
        contactName: 'Demo Recipient',
        contactEmail: 'compost@example.com',
        contactPhone: '615-555-0114',
      },
    ])
    .onDuplicateKeyUpdate({
      set: {
        orgName: sql`VALUES(org_name)`,
        streetAddress: sql`VALUES(street_address)`,
        city: sql`VALUES(city)`,
        state: sql`VALUES(state)`,
        zipCode: sql`VALUES(zip_code)`,
        contactName: sql`VALUES(contact_name)`,
        contactEmail: sql`VALUES(contact_email)`,
        contactPhone: sql`VALUES(contact_phone)`,
      },
    });
  console.log('Seeded Organization');

  // 2. Donor / Recipient (subclasses of Organization)
  await db
    .insert(donor)
    .values([{ orgId: 1 }, { orgId: 2 }, { orgId: 3 }])
    .onDuplicateKeyUpdate({ set: { orgId: sql`org_id` } });

  await db
    .insert(recipient)
    .values([
      { orgId: 11, type: 'pantry' },
      { orgId: 12, type: 'pantry' },
      { orgId: 13, type: 'farm' },
      { orgId: 14, type: 'compost' },
    ])
    .onDuplicateKeyUpdate({ set: { type: sql`VALUES(type)` } });
  console.log('Seeded Donor, Recipient');

  // 3. Category (lookup table; open-ended, so this just ensures the baseline set exists)
  await db
    .insert(category)
    .values([
      { categoryName: 'produce' },
      { categoryName: 'dairy' },
      { categoryName: 'meat' },
      { categoryName: 'bakery' },
      { categoryName: 'cooked' },
      { categoryName: 'other' },
    ])
    .onDuplicateKeyUpdate({ set: { categoryName: sql`VALUES(category_name)` } });

  const categories = await db.select().from(category);
  const categoryId = Object.fromEntries(categories.map((c) => [c.categoryName, c.categoryId]));
  console.log('Seeded Category');

  // 4. Item (donors list surplus food)
  const itemRows = [
    {
      donorId: 1,
      categoryId: categoryId['meat'],
      quantity: 12,
      unitWeight: '2.00',
      tier: 1,
      itemName: 'Fried chicken tenders',
      unit: 'trays',
      condition: 'Still warm, end of dinner service',
      containsMeat: 1,
      hoursOut: '1.00',
      tierReason: 'Cooked meat, safe for same-day human consumption',
      readyAt: hoursFromNow(-1),
      safeUntil: hoursFromNow(4),
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
      hoursOut: null,
      tierReason: 'Produce in usable condition: OK for people',
      readyAt: hoursFromNow(-2),
      safeUntil: hoursFromNow(48),
    },
    {
      donorId: 2,
      categoryId: categoryId['bakery'],
      quantity: 60,
      unitWeight: '0.15',
      tier: 1,
      itemName: 'Day-old dinner rolls',
      unit: 'rolls',
      condition: 'Baked yesterday',
      containsMeat: 0,
      hoursOut: '20.00',
      tierReason: 'Shelf-stable baked good: OK for people',
      readyAt: hoursFromNow(-20),
      safeUntil: hoursFromNow(24),
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
      hoursOut: null,
      tierReason: 'Unopened dairy within date: OK for people',
      readyAt: hoursFromNow(-0.5),
      safeUntil: hoursFromNow(24),
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
      hoursOut: '3.00',
      tierReason: 'Cooked, plant-based: OK for animal feed',
      readyAt: hoursFromNow(-3),
      safeUntil: hoursFromNow(6),
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
      hoursOut: null,
      tierReason: 'Raw trim: compost only',
      readyAt: hoursFromNow(-1),
      safeUntil: hoursFromNow(72),
    },
    {
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
      readyAt: hoursFromNow(-5),
      safeUntil: null,
    },
  ];

  // $returningId() can't infer a type here because drizzle-kit's introspected schema
  // declares primary keys via the table-level primaryKey() helper rather than chaining
  // .primaryKey() on the column, so we read the raw insertId instead. MySQL guarantees
  // contiguous auto-increment IDs within a single multi-row INSERT, so the milk item
  // (4th row, index 3) is insertId + 3.
  const [itemResult] = await db.insert(item).values(itemRows);
  const milkItemId = (itemResult as unknown as { insertId: number }).insertId + 3;
  console.log(`Seeded Item (${itemRows.length} rows)`);

  // 5. AcceptedTier / RefusedCategory / AcceptanceRule (recipient rules, 3NF)
  await db
    .insert(acceptedTier)
    .values([
      { recipientId: 11, tier: 1 },
      { recipientId: 12, tier: 1 },
      { recipientId: 13, tier: 2 },
      { recipientId: 14, tier: 3 },
    ])
    .onDuplicateKeyUpdate({ set: { tier: sql`tier` } });

  await db
    .insert(refusedCategory)
    .values([
      { recipientId: 12, categoryId: categoryId['dairy'] }, // shelter kitchen: no refrigeration
      { recipientId: 13, categoryId: categoryId['bakery'] }, // farm: no sugary baked goods for livestock
    ])
    .onDuplicateKeyUpdate({ set: { categoryId: sql`category_id` } });

  await db
    .insert(acceptanceRule)
    .values([
      { recipientId: 11, dayOfWeek: 'Mon', pickupStart: '08:00:00', pickupEnd: '14:00:00' },
      { recipientId: 11, dayOfWeek: 'Thu', pickupStart: '08:00:00', pickupEnd: '14:00:00' },
      { recipientId: 12, dayOfWeek: 'Tue', pickupStart: '09:00:00', pickupEnd: '17:00:00' },
      { recipientId: 13, dayOfWeek: 'Fri', pickupStart: '07:00:00', pickupEnd: '11:00:00' },
      { recipientId: 14, dayOfWeek: 'Sun', pickupStart: '00:00:00', pickupEnd: '00:00:00' }, // 24-hour drop-off
    ])
    .onDuplicateKeyUpdate({ set: { pickupEnd: sql`VALUES(pickup_end)` } });
  console.log('Seeded AcceptedTier, RefusedCategory, AcceptanceRule');

  // 6. Claim (recipient 11 reserves the milk cartons)
  const [claimResult] = await db.insert(claim).values([
    {
      itemId: milkItemId,
      recipientId: 11,
      pickupTime: hoursFromNow(2),
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
