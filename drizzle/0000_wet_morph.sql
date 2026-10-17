-- Current sql file was generated after introspecting the database
-- If you want to run this migration please uncomment this code before executing migrations
/*
CREATE TABLE `AcceptanceRule` (
	`rule_id` int AUTO_INCREMENT NOT NULL,
	`recipient_id` int NOT NULL,
	`day_of_week` varchar(3) NOT NULL,
	`pickup_start` time NOT NULL,
	`pickup_end` time NOT NULL,
	CONSTRAINT `AcceptanceRule_rule_id` PRIMARY KEY(`rule_id`),
	CONSTRAINT `recipient_id` UNIQUE(`recipient_id`,`day_of_week`,`pickup_start`),
	CONSTRAINT `AcceptanceRule_chk_1` CHECK((`day_of_week` in (_utf8mb4\'Mon\',_utf8mb4\'Tue\',_utf8mb4\'Wed\',_utf8mb4\'Thu\',_utf8mb4\'Fri\',_utf8mb4\'Sat\',_utf8mb4\'Sun\')))
);
--> statement-breakpoint
CREATE TABLE `AcceptedTier` (
	`recipient_id` int NOT NULL,
	`tier` tinyint NOT NULL,
	CONSTRAINT `AcceptedTier_recipient_id_tier` PRIMARY KEY(`recipient_id`,`tier`),
	CONSTRAINT `AcceptedTier_chk_1` CHECK((`tier` in (1,2,3)))
);
--> statement-breakpoint
CREATE TABLE `Category` (
	`category_id` int AUTO_INCREMENT NOT NULL,
	`category_name` varchar(50) NOT NULL,
	CONSTRAINT `Category_category_id` PRIMARY KEY(`category_id`),
	CONSTRAINT `category_name` UNIQUE(`category_name`)
);
--> statement-breakpoint
CREATE TABLE `Claim` (
	`claim_id` int AUTO_INCREMENT NOT NULL,
	`item_id` int NOT NULL,
	`recipient_id` int NOT NULL,
	`claim_time` datetime NOT NULL DEFAULT (CURRENT_TIMESTAMP),
	`pickup_time` datetime NOT NULL,
	CONSTRAINT `Claim_claim_id` PRIMARY KEY(`claim_id`)
);
--> statement-breakpoint
CREATE TABLE `Donor` (
	`org_id` int NOT NULL,
	CONSTRAINT `Donor_org_id` PRIMARY KEY(`org_id`)
);
--> statement-breakpoint
CREATE TABLE `Item` (
	`item_id` int AUTO_INCREMENT NOT NULL,
	`donor_id` int NOT NULL,
	`category_id` int NOT NULL,
	`quantity` int NOT NULL,
	`unit_weight` decimal(8,2) NOT NULL,
	`total_weight` decimal(8,2) GENERATED ALWAYS AS ((`quantity` * `unit_weight`)) STORED,
	`tier` tinyint NOT NULL,
	`item_name` varchar(200),
	`unit` varchar(50),
	`condition` varchar(500),
	`contains_meat` tinyint(1),
	`hours_out` decimal(6,2),
	`tier_reason` varchar(500),
	`ready_at` datetime,
	`safe_until` datetime,
	CONSTRAINT `Item_item_id` PRIMARY KEY(`item_id`),
	CONSTRAINT `Item_chk_1` CHECK((`tier` in (1,2,3)))
);
--> statement-breakpoint
CREATE TABLE `Organization` (
	`org_id` int AUTO_INCREMENT NOT NULL,
	`org_name` varchar(200) NOT NULL,
	`street_address` varchar(255) NOT NULL,
	`city` varchar(200) NOT NULL,
	`state` char(2) NOT NULL,
	`zip_code` char(5) NOT NULL,
	`date_registered` datetime NOT NULL DEFAULT (CURRENT_TIMESTAMP),
	`contact_name` varchar(200) NOT NULL,
	`contact_email` varchar(255) NOT NULL,
	`contact_phone` varchar(20) NOT NULL,
	CONSTRAINT `Organization_org_id` PRIMARY KEY(`org_id`)
);
--> statement-breakpoint
CREATE TABLE `Pickup` (
	`pickup_id` int AUTO_INCREMENT NOT NULL,
	`claim_id` int NOT NULL,
	`quantity` int NOT NULL,
	`date_picked_up` datetime NOT NULL DEFAULT (CURRENT_TIMESTAMP),
	CONSTRAINT `Pickup_pickup_id` PRIMARY KEY(`pickup_id`)
);
--> statement-breakpoint
CREATE TABLE `Recipient` (
	`org_id` int NOT NULL,
	`type` varchar(10) NOT NULL,
	CONSTRAINT `Recipient_org_id` PRIMARY KEY(`org_id`),
	CONSTRAINT `Recipient_chk_1` CHECK((`type` in (_utf8mb4\'pantry\',_utf8mb4\'farm\',_utf8mb4\'compost\')))
);
--> statement-breakpoint
CREATE TABLE `RefusedCategory` (
	`recipient_id` int NOT NULL,
	`category_id` int NOT NULL,
	CONSTRAINT `RefusedCategory_recipient_id_category_id` PRIMARY KEY(`recipient_id`,`category_id`)
);
--> statement-breakpoint
ALTER TABLE `AcceptanceRule` ADD CONSTRAINT `AcceptanceRule_ibfk_1` FOREIGN KEY (`recipient_id`) REFERENCES `Recipient`(`org_id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `AcceptedTier` ADD CONSTRAINT `AcceptedTier_ibfk_1` FOREIGN KEY (`recipient_id`) REFERENCES `Recipient`(`org_id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `Claim` ADD CONSTRAINT `Claim_ibfk_1` FOREIGN KEY (`item_id`) REFERENCES `Item`(`item_id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `Claim` ADD CONSTRAINT `Claim_ibfk_2` FOREIGN KEY (`recipient_id`) REFERENCES `Recipient`(`org_id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `Donor` ADD CONSTRAINT `Donor_ibfk_1` FOREIGN KEY (`org_id`) REFERENCES `Organization`(`org_id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `Item` ADD CONSTRAINT `Item_ibfk_1` FOREIGN KEY (`donor_id`) REFERENCES `Donor`(`org_id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `Item` ADD CONSTRAINT `Item_ibfk_2` FOREIGN KEY (`category_id`) REFERENCES `Category`(`category_id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `Pickup` ADD CONSTRAINT `Pickup_ibfk_1` FOREIGN KEY (`claim_id`) REFERENCES `Claim`(`claim_id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `Recipient` ADD CONSTRAINT `Recipient_ibfk_1` FOREIGN KEY (`org_id`) REFERENCES `Organization`(`org_id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `RefusedCategory` ADD CONSTRAINT `RefusedCategory_ibfk_1` FOREIGN KEY (`recipient_id`) REFERENCES `Recipient`(`org_id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `RefusedCategory` ADD CONSTRAINT `RefusedCategory_ibfk_2` FOREIGN KEY (`category_id`) REFERENCES `Category`(`category_id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `item_id` ON `Claim` (`item_id`);--> statement-breakpoint
CREATE INDEX `recipient_id` ON `Claim` (`recipient_id`);--> statement-breakpoint
CREATE INDEX `category_id` ON `Item` (`category_id`);--> statement-breakpoint
CREATE INDEX `donor_id` ON `Item` (`donor_id`);--> statement-breakpoint
CREATE INDEX `claim_id` ON `Pickup` (`claim_id`);--> statement-breakpoint
CREATE INDEX `category_id` ON `RefusedCategory` (`category_id`);
*/