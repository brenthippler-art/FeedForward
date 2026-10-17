-- FeedForward database schema.
-- See DB_DESIGN.md for the ERD and the reasoning behind each design decision.
-- Table order follows FK dependencies so this can be run top-to-bottom.

-- ============================================================
-- Organization (superclass) and its subclasses
-- ============================================================

CREATE TABLE Organization (
    org_id            INT           NOT NULL AUTO_INCREMENT,
    org_name          VARCHAR(200)  NOT NULL,
    street_address    VARCHAR(255)  NOT NULL,
    city              VARCHAR(200)  NOT NULL,
    state             CHAR(2)       NOT NULL,
    zip_code          CHAR(5)       NOT NULL,
    date_registered   DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    contact_name      VARCHAR(200)  NOT NULL,
    contact_email     VARCHAR(255)  NOT NULL,
    contact_phone     VARCHAR(20)   NOT NULL,
    PRIMARY KEY (org_id)
);

CREATE TABLE Donor (
    org_id INT NOT NULL,
    PRIMARY KEY (org_id),
    FOREIGN KEY (org_id) REFERENCES Organization(org_id)
);

CREATE TABLE Recipient (
    org_id INT         NOT NULL,
    type   VARCHAR(10) NOT NULL,
    PRIMARY KEY (org_id),
    FOREIGN KEY (org_id) REFERENCES Organization(org_id),
    CHECK (type IN ('pantry', 'farm', 'compost'))
);

-- ============================================================
-- Category (lookup table)
-- ============================================================

CREATE TABLE Category (
    category_id   INT          NOT NULL AUTO_INCREMENT,
    category_name VARCHAR(50)  NOT NULL,
    PRIMARY KEY (category_id),
    UNIQUE (category_name)
);

-- ============================================================
-- Item (a donor's listed surplus food)
-- ============================================================

CREATE TABLE Item (
    item_id      INT           NOT NULL AUTO_INCREMENT,
    donor_id     INT           NOT NULL,
    category_id  INT           NOT NULL,
    quantity     INT           NOT NULL,
    unit_weight  DECIMAL(8,2)  NOT NULL,
    total_weight DECIMAL(8,2)  GENERATED ALWAYS AS (quantity * unit_weight) STORED,
    tier         TINYINT       NOT NULL,
    -- AI-extraction fields (added by backend/GenAI integration; all optional,
    -- since the AI may not always determine them): mirrors DraftListing/Listing
    -- in types/index.ts.
    item_name     VARCHAR(200),
    unit          VARCHAR(50),
    condition     VARCHAR(500),
    contains_meat TINYINT,
    hours_out     DECIMAL(6,2),
    tier_reason   VARCHAR(500),
    ready_at      DATETIME,
    safe_until    DATETIME,
    PRIMARY KEY (item_id),
    FOREIGN KEY (donor_id) REFERENCES Donor(org_id),
    FOREIGN KEY (category_id) REFERENCES Category(category_id),
    CHECK (tier IN (1,2,3))
);

-- ============================================================
-- Recipient acceptance rules (normalized, 3NF)
-- ============================================================

CREATE TABLE AcceptedTier (
    recipient_id INT     NOT NULL,
    tier         TINYINT NOT NULL,
    PRIMARY KEY (recipient_id, tier),
    FOREIGN KEY (recipient_id) REFERENCES Recipient(org_id),
    CHECK (tier IN (1,2,3))
);

CREATE TABLE RefusedCategory (
    recipient_id INT NOT NULL,
    category_id  INT NOT NULL,
    PRIMARY KEY (recipient_id, category_id),
    FOREIGN KEY (recipient_id) REFERENCES Recipient(org_id),
    FOREIGN KEY (category_id) REFERENCES Category(category_id)
);

CREATE TABLE AcceptanceRule (
    rule_id      INT         NOT NULL AUTO_INCREMENT,
    recipient_id INT         NOT NULL,
    day_of_week  VARCHAR(3)  NOT NULL,
    pickup_start TIME        NOT NULL,
    pickup_end   TIME        NOT NULL,
    PRIMARY KEY (rule_id),
    FOREIGN KEY (recipient_id) REFERENCES Recipient(org_id),
    CHECK (day_of_week IN ('Mon','Tue','Wed','Thu','Fri','Sat','Sun')),
    UNIQUE (recipient_id, day_of_week, pickup_start)
);

-- ============================================================
-- Claim (recipient reserves an item) and Pickup (completed event)
-- ============================================================

CREATE TABLE Claim (
    claim_id      INT      NOT NULL AUTO_INCREMENT,
    item_id       INT      NOT NULL,
    recipient_id  INT      NOT NULL,
    claim_time    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    pickup_time   DATETIME NOT NULL,
    PRIMARY KEY (claim_id),
    FOREIGN KEY (item_id) REFERENCES Item(item_id),
    FOREIGN KEY (recipient_id) REFERENCES Recipient(org_id)
);

CREATE TABLE Pickup (
    pickup_id      INT           NOT NULL AUTO_INCREMENT,
    claim_id       INT           NOT NULL,
    quantity       INT           NOT NULL,
    date_picked_up DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    -- Measured weight at pickup, separate from the estimated quantity used
    -- by the inventory trigger. Added by database/migrations/001_listing_details.sql.
    actual_lbs     DECIMAL(10,3),
    PRIMARY KEY (pickup_id),
    FOREIGN KEY (claim_id) REFERENCES Claim(claim_id),
    CHECK (actual_lbs IS NULL OR actual_lbs > 0)
);

-- ============================================================
-- Trigger: validate and apply a pickup against the item's stock
-- ============================================================

DELIMITER $$
CREATE TRIGGER before_pickup_insert
BEFORE INSERT ON Pickup
FOR EACH ROW
BEGIN
    DECLARE v_item_id INT;
    DECLARE available INT;

    SELECT item_id INTO v_item_id FROM Claim WHERE claim_id = NEW.claim_id;
    SELECT quantity INTO available FROM Item WHERE item_id = v_item_id;

    IF NEW.quantity > available THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Pickup quantity exceeds available item quantity';
    END IF;

    UPDATE Item SET quantity = quantity - NEW.quantity WHERE item_id = v_item_id;
END$$
DELIMITER ;
