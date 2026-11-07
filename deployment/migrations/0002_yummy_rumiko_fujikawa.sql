CREATE TABLE `bids` (
	`id` text PRIMARY KEY NOT NULL,
	`listing_id` text NOT NULL,
	`account_id` text NOT NULL,
	`amount` integer NOT NULL,
	`version` integer NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`listing_id`) REFERENCES `listings`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "bid_positive" CHECK("bids"."amount">0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `bid_version_unique` ON `bids` (`listing_id`,`version`);--> statement-breakpoint
CREATE INDEX `bid_account` ON `bids` (`account_id`);--> statement-breakpoint
CREATE TABLE `listing_acceptances` (
	`listing_id` text NOT NULL,
	`account_id` text NOT NULL,
	`kind` text NOT NULL,
	`terms_version` integer NOT NULL,
	`accepted_at` integer NOT NULL,
	PRIMARY KEY(`listing_id`, `account_id`, `kind`, `terms_version`),
	FOREIGN KEY (`listing_id`) REFERENCES `listings`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `listing_bidders` (
	`listing_id` text NOT NULL,
	`account_id` text NOT NULL,
	`bidder_code` text NOT NULL,
	PRIMARY KEY(`listing_id`, `account_id`),
	FOREIGN KEY (`listing_id`) REFERENCES `listings`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `bidder_code_unique` ON `listing_bidders` (`listing_id`,`bidder_code`);--> statement-breakpoint
CREATE TABLE `listing_favorites` (
	`listing_id` text NOT NULL,
	`account_id` text NOT NULL,
	`created_at` integer NOT NULL,
	PRIMARY KEY(`listing_id`, `account_id`),
	FOREIGN KEY (`listing_id`) REFERENCES `listings`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `listings` (
	`id` text PRIMARY KEY NOT NULL,
	`seller_id` text,
	`project` text NOT NULL,
	`title` text NOT NULL,
	`address` text NOT NULL,
	`marla` integer NOT NULL,
	`category` text NOT NULL,
	`allotment` text NOT NULL,
	`block` text DEFAULT '' NOT NULL,
	`plot` text DEFAULT '' NOT NULL,
	`image` text NOT NULL,
	`unit_mode` text NOT NULL,
	`starting_price` integer NOT NULL,
	`current_price` integer NOT NULL,
	`interval1` integer NOT NULL,
	`interval2` integer NOT NULL,
	`interval3` integer NOT NULL,
	`negotiation_interval` integer NOT NULL,
	`negotiation_time` integer NOT NULL,
	`holding_period` integer NOT NULL,
	`starts_at` integer NOT NULL,
	`ends_at` integer NOT NULL,
	`facts` text NOT NULL,
	`terms` text NOT NULL,
	`negotiation_terms` text NOT NULL,
	`terms_version` integer DEFAULT 1 NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`is_demo` integer DEFAULT 0 NOT NULL,
	`version` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`seller_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "listing_price_positive" CHECK("listings"."starting_price">0 AND "listings"."current_price">0),
	CONSTRAINT "listing_intervals" CHECK("listings"."interval1">0 AND "listings"."interval2">"listings"."interval1" AND "listings"."interval3">"listings"."interval2" AND "listings"."negotiation_interval">0),
	CONSTRAINT "listing_dates" CHECK("listings"."ends_at">"listings"."starts_at"),
	CONSTRAINT "listing_status" CHECK("listings"."status" IN ('pending','active','rejected','agreed','withdrawn'))
);
--> statement-breakpoint
CREATE INDEX `listings_seller` ON `listings` (`seller_id`);--> statement-breakpoint
CREATE TABLE `negotiation_events` (
	`id` text PRIMARY KEY NOT NULL,
	`negotiation_id` text NOT NULL,
	`actor` text NOT NULL,
	`action` text NOT NULL,
	`amount` integer NOT NULL,
	`version` integer NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`negotiation_id`) REFERENCES `negotiations`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `negotiation_event_version` ON `negotiation_events` (`negotiation_id`,`version`);--> statement-breakpoint
CREATE TABLE `negotiations` (
	`id` text PRIMARY KEY NOT NULL,
	`listing_id` text NOT NULL,
	`bidder_id` text NOT NULL,
	`status` text NOT NULL,
	`amount` integer NOT NULL,
	`deadline` integer NOT NULL,
	`version` integer DEFAULT 0 NOT NULL,
	`last_event` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`listing_id`) REFERENCES `listings`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`bidder_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `negotiations_listing` ON `negotiations` (`listing_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `negotiation_one_live` ON `negotiations` (`listing_id`) WHERE "negotiations"."status" IN ('approved','seller_turn','buyer_turn');--> statement-breakpoint
CREATE UNIQUE INDEX `negotiation_one_request` ON `negotiations` (`listing_id`,`bidder_id`) WHERE "negotiations"."status" IN ('requested','approved','seller_turn','buyer_turn');
--> statement-breakpoint
INSERT INTO listings (id,project,title,address,marla,category,allotment,image,unit_mode,starting_price,current_price,interval1,interval2,interval3,negotiation_interval,negotiation_time,holding_period,starts_at,ends_at,facts,terms,negotiation_terms,status,is_demo,created_at) VALUES ('AH-DEMO-1001','axis','Pine Axis – 8 Marla File','Pine Avenue, LDA City, Lahore',8,'8 Marla · Pine Avenue','File is Allotted, Waiting for Plot Allotment','/assets/pine-axis.webp','lump sum',20000000,20000000,2000000,4000000,6000000,2000000,3600000,0,(unixepoch()*1000)-86400000,(unixepoch()*1000)+604800000,'["This is a demonstration listing. No property is offered for transfer and no money is collected.", "Pine Avenue, LDA City, Lahore. The area and image illustrate the project only.", "The displayed bid price uses lump sum mode. All amounts are in PKR.", "Bidding closes at the displayed deadline. The three buttons add the published intervals to the current amount."]','["Demo bids are for practice and do not create a property purchase or payment.", "Your bidding ID is unique to this listing. Your name, CNIC and contact details are not displayed in the public bid history.", "Confirm your chosen amount before submitting. Accepted demo bids remain in the history.", "A stale price, closed listing or unaccepted terms prevents a bid. Refresh to see current information.", "For seller listings, review ownership documentation and the complete listing facts before participating.", "Seller listings remain subject to AuctionHouse review before they appear in the marketplace."]','["Private negotiation begins only after the seller accepts your request.", "Each descending offer decreases the previous amount by the published negotiation interval.", "The seller may accept the offer or counter by one negotiation interval before the response deadline.", "An expired response window ends this negotiation. Both parties must return to the listing for current availability.", "An accepted negotiation closes bidding on this listing. Payment and property transfer require a separate reviewed deal."]','active',1,unixepoch()*1000);

--> statement-breakpoint
INSERT INTO listings (id,project,title,address,marla,category,allotment,image,unit_mode,starting_price,current_price,interval1,interval2,interval3,negotiation_interval,negotiation_time,holding_period,starts_at,ends_at,facts,terms,negotiation_terms,status,is_demo,created_at) VALUES ('AH-DEMO-1002','executive','Pine Executive – 1 Kanal File','Pine Avenue, LDA City, Lahore',20,'1 Kanal · Residential','File is Allotted, Waiting for Plot Allotment','/assets/pine-executive.webp','lump sum',20000000,20000000,2000000,4000000,6000000,2000000,3600000,0,(unixepoch()*1000)-86400000,(unixepoch()*1000)+604800000,'["This is a demonstration listing. No property is offered for transfer and no money is collected.", "Pine Avenue, LDA City, Lahore. The area and image illustrate the project only.", "The displayed bid price uses lump sum mode. All amounts are in PKR.", "Bidding closes at the displayed deadline. The three buttons add the published intervals to the current amount."]','["Demo bids are for practice and do not create a property purchase or payment.", "Your bidding ID is unique to this listing. Your name, CNIC and contact details are not displayed in the public bid history.", "Confirm your chosen amount before submitting. Accepted demo bids remain in the history.", "A stale price, closed listing or unaccepted terms prevents a bid. Refresh to see current information.", "For seller listings, review ownership documentation and the complete listing facts before participating.", "Seller listings remain subject to AuctionHouse review before they appear in the marketplace."]','["Private negotiation begins only after the seller accepts your request.", "Each descending offer decreases the previous amount by the published negotiation interval.", "The seller may accept the offer or counter by one negotiation interval before the response deadline.", "An expired response window ends this negotiation. Both parties must return to the listing for current availability.", "An accepted negotiation closes bidding on this listing. Payment and property transfer require a separate reviewed deal."]','active',1,unixepoch()*1000);
