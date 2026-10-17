import { mysqlTable, mysqlSchema, AnyMySqlColumn, foreignKey, primaryKey, unique, check, int, varchar, time, tinyint, index, datetime, decimal, char } from "drizzle-orm/mysql-core"
import { sql } from "drizzle-orm"

export const acceptanceRule = mysqlTable("AcceptanceRule", {
	ruleId: int("rule_id").autoincrement().notNull(),
	recipientId: int("recipient_id").notNull().references(() => recipient.orgId),
	dayOfWeek: varchar("day_of_week", { length: 3 }).notNull(),
	pickupStart: time("pickup_start").notNull(),
	pickupEnd: time("pickup_end").notNull(),
},
(table) => [
	primaryKey({ columns: [table.ruleId], name: "AcceptanceRule_rule_id"}),
	unique("recipient_id").on(table.recipientId, table.dayOfWeek, table.pickupStart),
	check("AcceptanceRule_chk_1", sql`(\`day_of_week\` in (_utf8mb4\'Mon\',_utf8mb4\'Tue\',_utf8mb4\'Wed\',_utf8mb4\'Thu\',_utf8mb4\'Fri\',_utf8mb4\'Sat\',_utf8mb4\'Sun\'))`),
]);

export const acceptedTier = mysqlTable("AcceptedTier", {
	recipientId: int("recipient_id").notNull().references(() => recipient.orgId),
	tier: tinyint().notNull(),
},
(table) => [
	primaryKey({ columns: [table.recipientId, table.tier], name: "AcceptedTier_recipient_id_tier"}),
	check("AcceptedTier_chk_1", sql`(\`tier\` in (1,2,3))`),
]);

export const category = mysqlTable("Category", {
	categoryId: int("category_id").autoincrement().notNull(),
	categoryName: varchar("category_name", { length: 50 }).notNull(),
},
(table) => [
	primaryKey({ columns: [table.categoryId], name: "Category_category_id"}),
	unique("category_name").on(table.categoryName),
]);

export const claim = mysqlTable("Claim", {
	claimId: int("claim_id").autoincrement().notNull(),
	itemId: int("item_id").notNull().references(() => item.itemId),
	recipientId: int("recipient_id").notNull().references(() => recipient.orgId),
	claimTime: datetime("claim_time", { mode: 'string'}).default(sql`(CURRENT_TIMESTAMP)`).notNull(),
	pickupTime: datetime("pickup_time", { mode: 'string'}).notNull(),
},
(table) => [
	index("item_id").on(table.itemId),
	index("recipient_id").on(table.recipientId),
	primaryKey({ columns: [table.claimId], name: "Claim_claim_id"}),
]);

export const donor = mysqlTable("Donor", {
	orgId: int("org_id").notNull().references(() => organization.orgId),
},
(table) => [
	primaryKey({ columns: [table.orgId], name: "Donor_org_id"}),
]);

export const item = mysqlTable("Item", {
	itemId: int("item_id").autoincrement().notNull(),
	donorId: int("donor_id").notNull().references(() => donor.orgId),
	categoryId: int("category_id").notNull().references(() => category.categoryId),
	quantity: int().notNull(),
	unitWeight: decimal("unit_weight", { precision: 8, scale: 2 }).notNull(),
	totalWeight: decimal("total_weight", { precision: 8, scale: 2 }).generatedAlwaysAs(sql`(\`quantity\` * \`unit_weight\`)`, { mode: "stored" }),
	tier: tinyint().notNull(),
	itemName: varchar("item_name", { length: 200 }),
	unit: varchar({ length: 50 }),
	condition: varchar({ length: 500 }),
	containsMeat: tinyint("contains_meat"),
	hoursOut: decimal("hours_out", { precision: 6, scale: 2 }),
	tierReason: varchar("tier_reason", { length: 500 }),
	readyAt: datetime("ready_at", { mode: 'string'}),
	safeUntil: datetime("safe_until", { mode: 'string'}),
},
(table) => [
	index("category_id").on(table.categoryId),
	index("donor_id").on(table.donorId),
	primaryKey({ columns: [table.itemId], name: "Item_item_id"}),
	check("Item_chk_1", sql`(\`tier\` in (1,2,3))`),
]);

export const organization = mysqlTable("Organization", {
	orgId: int("org_id").autoincrement().notNull(),
	orgName: varchar("org_name", { length: 200 }).notNull(),
	streetAddress: varchar("street_address", { length: 255 }).notNull(),
	city: varchar({ length: 200 }).notNull(),
	state: char({ length: 2 }).notNull(),
	zipCode: char("zip_code", { length: 5 }).notNull(),
	dateRegistered: datetime("date_registered", { mode: 'string'}).default(sql`(CURRENT_TIMESTAMP)`).notNull(),
	contactName: varchar("contact_name", { length: 200 }).notNull(),
	contactEmail: varchar("contact_email", { length: 255 }).notNull(),
	contactPhone: varchar("contact_phone", { length: 20 }).notNull(),
},
(table) => [
	primaryKey({ columns: [table.orgId], name: "Organization_org_id"}),
]);

export const pickup = mysqlTable("Pickup", {
	pickupId: int("pickup_id").autoincrement().notNull(),
	claimId: int("claim_id").notNull().references(() => claim.claimId),
	quantity: int().notNull(),
	datePickedUp: datetime("date_picked_up", { mode: 'string'}).default(sql`(CURRENT_TIMESTAMP)`).notNull(),
	actualLbs: decimal("actual_lbs", { precision: 10, scale: 3 }),
},
(table) => [
	index("claim_id").on(table.claimId),
	primaryKey({ columns: [table.pickupId], name: "Pickup_pickup_id"}),
	check("chk_pickup_actual_lbs", sql`((\`actual_lbs\` is null) or (\`actual_lbs\` > 0))`),
]);

export const recipient = mysqlTable("Recipient", {
	orgId: int("org_id").notNull().references(() => organization.orgId),
	type: varchar({ length: 10 }).notNull(),
},
(table) => [
	primaryKey({ columns: [table.orgId], name: "Recipient_org_id"}),
	check("Recipient_chk_1", sql`(\`type\` in (_utf8mb4\'pantry\',_utf8mb4\'farm\',_utf8mb4\'compost\'))`),
]);

export const refusedCategory = mysqlTable("RefusedCategory", {
	recipientId: int("recipient_id").notNull().references(() => recipient.orgId),
	categoryId: int("category_id").notNull().references(() => category.categoryId),
},
(table) => [
	index("category_id").on(table.categoryId),
	primaryKey({ columns: [table.recipientId, table.categoryId], name: "RefusedCategory_recipient_id_category_id"}),
]);
