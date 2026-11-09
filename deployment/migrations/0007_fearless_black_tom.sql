CREATE TABLE `customer_seen` (
	`account_id` text NOT NULL,
	`section` text NOT NULL,
	`seen_at` integer NOT NULL,
	PRIMARY KEY(`account_id`, `section`),
	FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `pokes` (
	`id` text PRIMARY KEY NOT NULL,
	`scope` text NOT NULL,
	`subject` text NOT NULL,
	`turn` integer NOT NULL,
	`actor_id` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`actor_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `poke_subject` ON `pokes` (`scope`,`subject`,`turn`,`actor_id`);--> statement-breakpoint
CREATE TABLE `staff_seen` (
	`staff_id` text NOT NULL,
	`module` text NOT NULL,
	`seen_at` integer NOT NULL,
	PRIMARY KEY(`staff_id`, `module`),
	FOREIGN KEY (`staff_id`) REFERENCES `staff_accounts`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `wallet_corrections` (
	`id` text PRIMARY KEY NOT NULL,
	`entry_id` text NOT NULL,
	`target_amount` integer NOT NULL,
	`note` text NOT NULL,
	`reference` text NOT NULL,
	`staff_id` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`entry_id`) REFERENCES `wallet_entries`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`staff_id`) REFERENCES `staff_accounts`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `wallet_corrections_reference_unique` ON `wallet_corrections` (`reference`);--> statement-breakpoint
DROP INDEX `negotiation_one_live`;--> statement-breakpoint
ALTER TABLE `accounts` ADD `public_id` text;--> statement-breakpoint
ALTER TABLE `accounts` ADD `last_activity` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX `accounts_public_id_unique` ON `accounts` (`public_id`);--> statement-breakpoint
ALTER TABLE `ah_projects` ADD `market_order` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `closed_deals` ADD `final_total` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `closed_deals` ADD `buyer_fee` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `closed_deals` ADD `seller_fee` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `listings` ADD `edit_nonce` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `listings` ADD `featured` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `listings` ADD `review_state` text DEFAULT 'submitted' NOT NULL;--> statement-breakpoint
ALTER TABLE `listings` ADD `admin_draft` text;--> statement-breakpoint
ALTER TABLE `listings` ADD `draft_note` text;--> statement-breakpoint
ALTER TABLE `listings` ADD `draft_version` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `listings` ADD `updated_at` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `listings` ADD `token_decided` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `notifications` ADD `dismissed_at` integer;
--> statement-breakpoint
UPDATE accounts SET public_id=(SELECT printf('%06X',n) FROM (SELECT id,row_number() OVER (ORDER BY created_at,id) n FROM accounts) numbered WHERE numbered.id=accounts.id),last_activity=created_at WHERE public_id IS NULL;
--> statement-breakpoint
UPDATE ah_projects SET market_order=home_order;
--> statement-breakpoint
UPDATE listings SET token_decided=CASE WHEN project<>'custom' OR participation_deposit>0 THEN 1 ELSE 0 END,updated_at=created_at,review_state=CASE WHEN status='active' THEN 'approved' ELSE 'submitted' END;
--> statement-breakpoint
UPDATE closed_deals SET final_total=CAST(ROUND(amount*CASE unit_mode WHEN 'per Kanal' THEN COALESCE(json_extract(snapshot,'$.sqft'),4500)/4500.0 WHEN 'per Marla' THEN COALESCE(json_extract(snapshot,'$.sqft'),225)/225.0 WHEN 'per Sq Ft' THEN COALESCE(json_extract(snapshot,'$.sqft'),1) ELSE 1 END) AS INTEGER);
--> statement-breakpoint
UPDATE closed_deals SET buyer_fee=CAST(ROUND(final_total*0.005) AS INTEGER),seller_fee=CAST(ROUND(final_total*0.005) AS INTEGER);
--> statement-breakpoint
DELETE FROM saved_searches;
--> statement-breakpoint
INSERT INTO site_settings (key,value) VALUES ('general','{"facts": ["Review the property information and supporting documents before participating."], "terms": ["Confirm each bid before it is submitted.", "A bid in the final five minutes extends bidding until five minutes remain.", "Maintain the required refundable bid token in your account.", "Buyer and seller each pay a service fee of 0.5% of the final total property price."], "negotiationTerms": ["Negotiations are private between the buyer and seller.", "Offers must be at least 40% and less than 100% of the starting price.", "A buyer cannot reduce their previous offer; a seller cannot increase their previous offer.", "Respond within the configured time window. An expired negotiation may reopen only with an improved offer."]}') ON CONFLICT(key) DO NOTHING;
--> statement-breakpoint
INSERT INTO site_settings (key,value) VALUES ('buyerFeeBps','50') ON CONFLICT(key) DO UPDATE SET value='50';
