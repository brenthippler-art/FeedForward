-- Run once against the existing mixed-case schema, using a schema administrator.
-- Existing records remain NULL until a donor supplies their real details.
-- unit_weight, total_weight, and actual_lbs are measured in pounds.
USE hacktn;

ALTER TABLE `Item`
    ADD COLUMN item_name VARCHAR(200) NULL,
    ADD COLUMN unit VARCHAR(50) NULL,
    ADD COLUMN `condition` VARCHAR(500) NULL,
    ADD COLUMN contains_meat BOOLEAN NULL,
    ADD COLUMN hours_out DECIMAL(6,2) NULL,
    ADD COLUMN tier_reason VARCHAR(500) NULL,
    ADD COLUMN ready_at DATETIME NULL,
    ADD COLUMN safe_until DATETIME NULL;

-- Keep quantity for the inventory trigger; record measured weight separately.
ALTER TABLE `Pickup`
    ADD COLUMN actual_lbs DECIMAL(10,3) NULL,
    ADD CONSTRAINT chk_pickup_actual_lbs
        CHECK (actual_lbs IS NULL OR actual_lbs > 0);

DESCRIBE `Item`;
DESCRIBE `Pickup`;
