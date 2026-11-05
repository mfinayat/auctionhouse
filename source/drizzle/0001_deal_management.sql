CREATE TABLE `deal_audit` (
	`id` text PRIMARY KEY NOT NULL,
	`deal_id` text NOT NULL,
	`actor_id` text NOT NULL,
	`action` text NOT NULL,
	`details` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`deal_id`) REFERENCES `deals`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`actor_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE no action
);

--> statement-breakpoint
CREATE INDEX `deal_audit_deal` ON `deal_audit` (`deal_id`,`created_at`);
--> statement-breakpoint
CREATE TABLE `deal_disbursements` (
	`id` text PRIMARY KEY NOT NULL,
	`deal_id` text NOT NULL,
	`party` text NOT NULL,
	`amount` integer NOT NULL,
	`method` text NOT NULL,
	`reference` text NOT NULL,
	`recorded_by` text NOT NULL,
	`paid_at` integer NOT NULL,
	FOREIGN KEY (`deal_id`) REFERENCES `deal_settlements`(`deal_id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`recorded_by`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "disbursement_party_values" CHECK("deal_disbursements"."party" IN ('buyer','seller')),
	CONSTRAINT "disbursement_amount_range" CHECK("deal_disbursements"."amount" > 0 AND "deal_disbursements"."amount" <= 100000000000000),
	CONSTRAINT "disbursement_method_values" CHECK("deal_disbursements"."method" IN ('cash','bank_transfer'))
);

--> statement-breakpoint
CREATE UNIQUE INDEX `deal_disbursements_reference_unique` ON `deal_disbursements` (`reference`);
--> statement-breakpoint
CREATE INDEX `deal_disbursements_deal` ON `deal_disbursements` (`deal_id`);
--> statement-breakpoint
CREATE TABLE `deal_payments` (
	`id` text PRIMARY KEY NOT NULL,
	`deal_id` text NOT NULL,
	`party` text NOT NULL,
	`purpose` text NOT NULL,
	`amount` integer NOT NULL,
	`method` text NOT NULL,
	`reference` text NOT NULL,
	`status` text DEFAULT 'received' NOT NULL,
	`recorded_by` text NOT NULL,
	`received_at` integer NOT NULL,
	`voided_by` text,
	`void_reason` text,
	`voided_at` integer,
	FOREIGN KEY (`deal_id`) REFERENCES `deals`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`recorded_by`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`voided_by`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "payment_party_values" CHECK("deal_payments"."party" IN ('buyer','seller')),
	CONSTRAINT "payment_purpose_values" CHECK("deal_payments"."purpose" IN ('participation','service')),
	CONSTRAINT "payment_amount_range" CHECK("deal_payments"."amount" > 0 AND "deal_payments"."amount" <= 100000000000000),
	CONSTRAINT "payment_method_values" CHECK("deal_payments"."method" = 'cash'),
	CONSTRAINT "payment_status_values" CHECK("deal_payments"."status" IN ('received','voided'))
);

--> statement-breakpoint
CREATE UNIQUE INDEX `deal_payments_reference_unique` ON `deal_payments` (`reference`);
--> statement-breakpoint
CREATE INDEX `deal_payments_deal` ON `deal_payments` (`deal_id`);
--> statement-breakpoint
CREATE TABLE `deal_settlements` (
	`deal_id` text PRIMARY KEY NOT NULL,
	`kind` text NOT NULL,
	`buyer_refund` integer NOT NULL,
	`seller_refund` integer NOT NULL,
	`buyer_compensation` integer NOT NULL,
	`seller_compensation` integer NOT NULL,
	`platform_retained` integer NOT NULL,
	`total_received` integer NOT NULL,
	`reason` text NOT NULL,
	`decided_by` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`deal_id`) REFERENCES `deals`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`decided_by`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "settlement_kind_values" CHECK("deal_settlements"."kind" IN ('completed','default_buyer','default_seller','mutual_cancel')),
	CONSTRAINT "buyer_refund_positive" CHECK("deal_settlements"."buyer_refund" >= 0),
	CONSTRAINT "seller_refund_positive" CHECK("deal_settlements"."seller_refund" >= 0),
	CONSTRAINT "buyer_compensation_positive" CHECK("deal_settlements"."buyer_compensation" >= 0),
	CONSTRAINT "seller_compensation_positive" CHECK("deal_settlements"."seller_compensation" >= 0),
	CONSTRAINT "platform_retained_positive" CHECK("deal_settlements"."platform_retained" >= 0),
	CONSTRAINT "settlement_conservation" CHECK("deal_settlements"."buyer_refund"+"deal_settlements"."seller_refund"+"deal_settlements"."buyer_compensation"+"deal_settlements"."seller_compensation"+"deal_settlements"."platform_retained"="deal_settlements"."total_received")
);

--> statement-breakpoint
CREATE TABLE `deals` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`buyer_id` text NOT NULL,
	`seller_id` text NOT NULL,
	`sale_price` integer NOT NULL,
	`buyer_rate_bps` integer NOT NULL,
	`seller_rate_bps` integer NOT NULL,
	`buyer_deposit` integer NOT NULL,
	`seller_deposit` integer NOT NULL,
	`terms` text NOT NULL,
	`buyer_accepted_at` integer,
	`seller_accepted_at` integer,
	`status` text DEFAULT 'awaiting_deposits' NOT NULL,
	`created_by` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`buyer_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`seller_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`created_by`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "deal_price_range" CHECK("deals"."sale_price" > 0 AND "deals"."sale_price" <= 100000000000000),
	CONSTRAINT "buyer_rate_range" CHECK("deals"."buyer_rate_bps" BETWEEN 50 AND 200),
	CONSTRAINT "seller_rate_range" CHECK("deals"."seller_rate_bps" BETWEEN 50 AND 200),
	CONSTRAINT "buyer_deposit_range" CHECK("deals"."buyer_deposit" > 0 AND "deals"."buyer_deposit" <= 100000000000000),
	CONSTRAINT "seller_deposit_range" CHECK("deals"."seller_deposit" > 0 AND "deals"."seller_deposit" <= 100000000000000),
	CONSTRAINT "deal_parties_different" CHECK("deals"."buyer_id" <> "deals"."seller_id"),
	CONSTRAINT "deal_status_values" CHECK("deals"."status" IN ('awaiting_deposits','active','completed','disputed','cancelled','defaulted'))
);

--> statement-breakpoint
CREATE INDEX `deals_buyer` ON `deals` (`buyer_id`,`created_at`);
--> statement-breakpoint
CREATE INDEX `deals_seller` ON `deals` (`seller_id`,`created_at`);
--> statement-breakpoint
CREATE TRIGGER settlement_guard BEFORE INSERT ON deal_settlements
BEGIN
 SELECT CASE WHEN NEW.total_received<>COALESCE((SELECT SUM(amount) FROM deal_payments WHERE deal_id=NEW.deal_id AND status='received'),0)
 THEN RAISE(ABORT, 'Payments changed during settlement. Refresh and try again.') END;
 SELECT CASE WHEN NOT EXISTS (SELECT 1 FROM deals WHERE id=NEW.deal_id AND
   ((NEW.kind='completed' AND status='completed') OR (NEW.kind='mutual_cancel' AND status='cancelled') OR (NEW.kind IN ('default_buyer','default_seller') AND status='defaulted')))
 THEN RAISE(ABORT, 'Settlement does not match the deal status.') END;
END;
--> statement-breakpoint
CREATE TRIGGER disbursement_guard BEFORE INSERT ON deal_disbursements
BEGIN
 SELECT CASE WHEN NEW.amount+COALESCE((SELECT SUM(amount) FROM deal_disbursements WHERE deal_id=NEW.deal_id AND party=NEW.party),0)
   > (SELECT CASE NEW.party WHEN 'buyer' THEN buyer_refund+buyer_compensation ELSE seller_refund+seller_compensation END FROM deal_settlements WHERE deal_id=NEW.deal_id)
 THEN RAISE(ABORT, 'Payout exceeds the remaining refund and compensation entitlement.') END;
END;
--> statement-breakpoint
CREATE TRIGGER settlement_no_update BEFORE UPDATE ON deal_settlements
BEGIN SELECT RAISE(ABORT, 'Settlements cannot be edited.'); END;
--> statement-breakpoint
CREATE TRIGGER settlement_no_delete BEFORE DELETE ON deal_settlements
BEGIN SELECT RAISE(ABORT, 'Settlements cannot be deleted.'); END;
--> statement-breakpoint
CREATE TRIGGER disbursement_no_update BEFORE UPDATE ON deal_disbursements
BEGIN SELECT RAISE(ABORT, 'Payout records cannot be edited.'); END;
--> statement-breakpoint
CREATE TRIGGER disbursement_no_delete BEFORE DELETE ON deal_disbursements
BEGIN SELECT RAISE(ABORT, 'Payout records cannot be deleted.'); END;
--> statement-breakpoint
CREATE TRIGGER deal_terms_immutable BEFORE UPDATE OF title,buyer_id,seller_id,sale_price,buyer_rate_bps,seller_rate_bps,buyer_deposit,seller_deposit,terms ON deals
BEGIN SELECT RAISE(ABORT, 'Deal terms cannot be changed after issue.'); END;
--> statement-breakpoint
CREATE TRIGGER deal_acceptance_guard BEFORE UPDATE OF buyer_accepted_at,seller_accepted_at ON deals
BEGIN
 SELECT CASE WHEN OLD.status NOT IN ('awaiting_deposits','active')
 THEN RAISE(ABORT, 'Terms cannot be accepted on a closed deal or while it is under review.') END;
 SELECT CASE WHEN (OLD.buyer_accepted_at IS NOT NULL AND NEW.buyer_accepted_at IS NOT OLD.buyer_accepted_at)
 OR (OLD.seller_accepted_at IS NOT NULL AND NEW.seller_accepted_at IS NOT OLD.seller_accepted_at)
 THEN RAISE(ABORT, 'Terms cannot be accepted again with a different timestamp.') END;
END;
--> statement-breakpoint
CREATE TRIGGER payment_guard BEFORE INSERT ON deal_payments
BEGIN
 SELECT CASE WHEN NOT EXISTS (
   SELECT 1 FROM deals d WHERE d.id=NEW.deal_id AND d.status IN ('awaiting_deposits','active')
   AND d.buyer_accepted_at IS NOT NULL AND d.seller_accepted_at IS NOT NULL
 ) THEN RAISE(ABORT, 'Both parties must accept terms before recording payments; deal must be open.') END;
 SELECT CASE WHEN NEW.purpose='service' AND (SELECT status FROM deals WHERE id=NEW.deal_id)<>'active'
 THEN RAISE(ABORT, 'Service payment requires an active deal with both deposits received.') END;
 SELECT CASE WHEN NEW.purpose='participation' AND NEW.amount + COALESCE((
   SELECT SUM(p.amount) FROM deal_payments p WHERE p.deal_id=NEW.deal_id AND p.party=NEW.party AND p.purpose='participation' AND p.status='received'
 ),0) > (SELECT CASE NEW.party WHEN 'buyer' THEN buyer_deposit ELSE seller_deposit END FROM deals WHERE id=NEW.deal_id)
 THEN RAISE(ABORT, 'Participation payment exceeds the agreed deposit.') END;
 SELECT CASE WHEN NEW.purpose='service' AND NEW.amount + COALESCE((
   SELECT SUM(p.amount) FROM deal_payments p WHERE p.deal_id=NEW.deal_id AND p.party=NEW.party AND p.purpose='service' AND p.status='received'
 ),0) > (SELECT MAX(0,(sale_price * CASE NEW.party WHEN 'buyer' THEN buyer_rate_bps ELSE seller_rate_bps END + 5000)/10000
   - CASE NEW.party WHEN 'buyer' THEN buyer_deposit ELSE seller_deposit END) FROM deals WHERE id=NEW.deal_id)
 THEN RAISE(ABORT, 'Service payment exceeds the balance after the agreed participation credit.') END;
END;
--> statement-breakpoint
CREATE TRIGGER deal_status_guard BEFORE UPDATE OF status ON deals
BEGIN
 SELECT CASE WHEN NOT (
   (OLD.status='awaiting_deposits' AND NEW.status IN ('active','disputed')) OR
   (OLD.status='active' AND NEW.status IN ('completed','disputed')) OR
   (OLD.status='disputed' AND NEW.status IN ('cancelled','defaulted'))
 ) THEN RAISE(ABORT, 'Invalid deal status transition.') END;
 SELECT CASE WHEN NEW.status IN ('active','completed') AND (
   NEW.buyer_accepted_at IS NULL OR NEW.seller_accepted_at IS NULL OR
   COALESCE((SELECT SUM(amount) FROM deal_payments WHERE deal_id=NEW.id AND party='buyer' AND purpose='participation' AND status='received'),0) <> NEW.buyer_deposit OR
   COALESCE((SELECT SUM(amount) FROM deal_payments WHERE deal_id=NEW.id AND party='seller' AND purpose='participation' AND status='received'),0) <> NEW.seller_deposit
 ) THEN RAISE(ABORT, 'Both deposits must be paid and both parties must accept the terms.') END;
 SELECT CASE WHEN NEW.status='completed' AND (
   COALESCE((SELECT SUM(amount) FROM deal_payments WHERE deal_id=NEW.id AND party='buyer' AND purpose='service' AND status='received'),0) < MAX(0,(NEW.sale_price*NEW.buyer_rate_bps+5000)/10000-NEW.buyer_deposit) OR
   COALESCE((SELECT SUM(amount) FROM deal_payments WHERE deal_id=NEW.id AND party='seller' AND purpose='service' AND status='received'),0) < MAX(0,(NEW.sale_price*NEW.seller_rate_bps+5000)/10000-NEW.seller_deposit)
 ) THEN RAISE(ABORT, 'Service charges must be paid before completion.') END;
END;
--> statement-breakpoint
CREATE TRIGGER payment_identity_immutable BEFORE UPDATE OF id,deal_id,party,purpose,amount,method,reference,recorded_by,received_at ON deal_payments
BEGIN SELECT RAISE(ABORT, 'Payment records cannot be edited. Void an incorrect receipt instead.'); END;
--> statement-breakpoint
CREATE TRIGGER payment_void_guard BEFORE UPDATE OF status ON deal_payments
BEGIN
 SELECT CASE WHEN OLD.status<>'received' OR NEW.status<>'voided' OR NEW.voided_by IS NULL OR length(NEW.void_reason)<5 OR NEW.voided_at IS NULL
 THEN RAISE(ABORT, 'A receipt can only be voided once, with a reason.') END;
 SELECT CASE WHEN (SELECT status FROM deals WHERE id=OLD.deal_id)<>'awaiting_deposits'
 THEN RAISE(ABORT, 'Receipts can only be voided before the deal is activated.') END;
END;
--> statement-breakpoint
CREATE TRIGGER payment_no_delete BEFORE DELETE ON deal_payments
BEGIN SELECT RAISE(ABORT, 'Payment records cannot be deleted.'); END;
--> statement-breakpoint
CREATE TRIGGER audit_no_update BEFORE UPDATE ON deal_audit
BEGIN SELECT RAISE(ABORT, 'Audit entries cannot be edited.'); END;
--> statement-breakpoint
CREATE TRIGGER audit_no_delete BEFORE DELETE ON deal_audit
BEGIN SELECT RAISE(ABORT, 'Audit entries cannot be deleted.'); END;
