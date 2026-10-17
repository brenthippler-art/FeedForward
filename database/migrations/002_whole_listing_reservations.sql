-- Upgrade existing mixed-case tables. Run through scripts/migrate-whole-listings.mjs
-- so preflight checks run before any DDL. MySQL DDL is not transactionally atomic.
ALTER TABLE `Claim` ADD CONSTRAINT uq_claim_item UNIQUE (item_id);
--> statement-breakpoint
ALTER TABLE `Pickup` ADD CONSTRAINT uq_pickup_claim UNIQUE (claim_id);
--> statement-breakpoint
-- Keep the existing inventory trigger as the sole stock decrement.
-- This guard must run BEFORE it, while Item.quantity is still the remaining stock.
CREATE TRIGGER before_pickup_whole_listing
BEFORE INSERT ON `Pickup`
FOR EACH ROW PRECEDES before_pickup_insert
BEGIN
    DECLARE v_item_id INT DEFAULT NULL;
    DECLARE v_available INT DEFAULT NULL;

    SELECT item_id INTO v_item_id FROM `Claim` WHERE claim_id = NEW.claim_id;
    IF v_item_id IS NULL THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Pickup must reference an existing claim';
    END IF;

    SELECT quantity INTO v_available FROM `Item`
    WHERE item_id = v_item_id FOR UPDATE;

    IF NEW.quantity IS NULL OR NEW.quantity <= 0
       OR v_available IS NULL OR v_available <= 0
       OR NEW.quantity <> v_available THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Pickup must collect the entire positive remaining item quantity';
    END IF;
END;
