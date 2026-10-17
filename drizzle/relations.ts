import { relations } from "drizzle-orm/relations";
import { recipient, acceptanceRule, acceptedTier, item, claim, organization, donor, category, pickup, refusedCategory } from "./schema";

export const acceptanceRuleRelations = relations(acceptanceRule, ({one}) => ({
	recipient: one(recipient, {
		fields: [acceptanceRule.recipientId],
		references: [recipient.orgId]
	}),
}));

export const recipientRelations = relations(recipient, ({one, many}) => ({
	acceptanceRules: many(acceptanceRule),
	acceptedTiers: many(acceptedTier),
	claims: many(claim),
	organization: one(organization, {
		fields: [recipient.orgId],
		references: [organization.orgId]
	}),
	refusedCategories: many(refusedCategory),
}));

export const acceptedTierRelations = relations(acceptedTier, ({one}) => ({
	recipient: one(recipient, {
		fields: [acceptedTier.recipientId],
		references: [recipient.orgId]
	}),
}));

export const claimRelations = relations(claim, ({one, many}) => ({
	item: one(item, {
		fields: [claim.itemId],
		references: [item.itemId]
	}),
	recipient: one(recipient, {
		fields: [claim.recipientId],
		references: [recipient.orgId]
	}),
	pickups: many(pickup),
}));

export const itemRelations = relations(item, ({one, many}) => ({
	claims: many(claim),
	donor: one(donor, {
		fields: [item.donorId],
		references: [donor.orgId]
	}),
	category: one(category, {
		fields: [item.categoryId],
		references: [category.categoryId]
	}),
}));

export const donorRelations = relations(donor, ({one, many}) => ({
	organization: one(organization, {
		fields: [donor.orgId],
		references: [organization.orgId]
	}),
	items: many(item),
}));

export const organizationRelations = relations(organization, ({many}) => ({
	donors: many(donor),
	recipients: many(recipient),
}));

export const categoryRelations = relations(category, ({many}) => ({
	items: many(item),
	refusedCategories: many(refusedCategory),
}));

export const pickupRelations = relations(pickup, ({one}) => ({
	claim: one(claim, {
		fields: [pickup.claimId],
		references: [claim.claimId]
	}),
}));

export const refusedCategoryRelations = relations(refusedCategory, ({one}) => ({
	recipient: one(recipient, {
		fields: [refusedCategory.recipientId],
		references: [recipient.orgId]
	}),
	category: one(category, {
		fields: [refusedCategory.categoryId],
		references: [category.categoryId]
	}),
}));