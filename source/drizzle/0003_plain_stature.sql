CREATE TABLE `ah_projects` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`scheme` text NOT NULL,
	`scheme_options` text DEFAULT '[]' NOT NULL,
	`categories` text NOT NULL,
	`images` text DEFAULT '[]' NOT NULL,
	`facts` text NOT NULL,
	`auction_terms` text NOT NULL,
	`negotiation_terms` text NOT NULL,
	`fields` text NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`home_visible` integer DEFAULT 0 NOT NULL,
	`home_order` integer DEFAULT 0 NOT NULL,
	`deposit` integer DEFAULT 0 NOT NULL,
	`sale_method` text NOT NULL,
	`instalments` text DEFAULT '2 years' NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `attachments` (
	`id` text PRIMARY KEY NOT NULL,
	`account_id` text,
	`staff_id` text,
	`name` text NOT NULL,
	`mime` text NOT NULL,
	`kind` text NOT NULL,
	`size` integer NOT NULL,
	`object_key` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`staff_id`) REFERENCES `staff_accounts`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `closed_deals` (
	`id` text PRIMARY KEY NOT NULL,
	`listing_id` text NOT NULL,
	`buyer_id` text NOT NULL,
	`seller_id` text NOT NULL,
	`amount` integer NOT NULL,
	`unit_mode` text NOT NULL,
	`source` text NOT NULL,
	`snapshot` text NOT NULL,
	`checklist` text DEFAULT '{}' NOT NULL,
	`version` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`listing_id`) REFERENCES `listings`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`buyer_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`seller_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "closed_deal_amount" CHECK("closed_deals"."amount">0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `closed_deals_listing_id_unique` ON `closed_deals` (`listing_id`);--> statement-breakpoint
CREATE TABLE `notifications` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`account_id` text NOT NULL,
	`event_key` text NOT NULL,
	`kind` text NOT NULL,
	`listing_id` text,
	`title` text NOT NULL,
	`body` text NOT NULL,
	`url` text NOT NULL,
	`created_at` integer NOT NULL,
	`read_at` integer,
	`email_status` text DEFAULT 'pending' NOT NULL,
	`email_attempts` integer DEFAULT 0 NOT NULL,
	`next_attempt` integer DEFAULT 0 NOT NULL,
	`email_lock` text,
	`locked_until` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`listing_id`) REFERENCES `listings`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `notification_event` ON `notifications` (`account_id`,`event_key`);--> statement-breakpoint
CREATE INDEX `notice_account` ON `notifications` (`account_id`,`id`);--> statement-breakpoint
CREATE TABLE `participation_holds` (
	`listing_id` text NOT NULL,
	`account_id` text NOT NULL,
	`amount` integer NOT NULL,
	`status` text DEFAULT 'held' NOT NULL,
	`created_at` integer NOT NULL,
	PRIMARY KEY(`listing_id`, `account_id`),
	FOREIGN KEY (`listing_id`) REFERENCES `listings`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "hold_positive" CHECK("participation_holds"."amount">0)
);
--> statement-breakpoint
CREATE TABLE `site_settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `staff_accounts` (
	`id` text PRIMARY KEY NOT NULL,
	`username` text NOT NULL,
	`password_hash` text NOT NULL,
	`role` text NOT NULL,
	`must_change` integer DEFAULT 1 NOT NULL,
	`disabled` integer DEFAULT 0 NOT NULL,
	`actor_id` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`actor_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `staff_accounts_username_unique` ON `staff_accounts` (`username`);--> statement-breakpoint
CREATE TABLE `staff_audit` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`staff_id` text NOT NULL,
	`action` text NOT NULL,
	`subject` text NOT NULL,
	`details` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`staff_id`) REFERENCES `staff_accounts`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `staff_sessions` (
	`token_hash` text PRIMARY KEY NOT NULL,
	`staff_id` text NOT NULL,
	`expires_at` integer NOT NULL,
	FOREIGN KEY (`staff_id`) REFERENCES `staff_accounts`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `wallet_entries` (
	`id` text PRIMARY KEY NOT NULL,
	`account_id` text NOT NULL,
	`amount` integer NOT NULL,
	`reference` text NOT NULL,
	`note` text NOT NULL,
	`staff_id` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`staff_id`) REFERENCES `staff_accounts`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "wallet_credit_positive" CHECK("wallet_entries"."amount">0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `wallet_entries_reference_unique` ON `wallet_entries` (`reference`);--> statement-breakpoint
CREATE TABLE `wallets` (
	`account_id` text PRIMARY KEY NOT NULL,
	`balance` integer DEFAULT 0 NOT NULL,
	`reserved` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "wallet_conservation" CHECK("wallets"."balance">=0 AND "wallets"."reserved">=0 AND "wallets"."reserved"<="wallets"."balance")
);
--> statement-breakpoint
ALTER TABLE `listings` ADD `display_id` text;--> statement-breakpoint
ALTER TABLE `listings` ADD `land_use` text DEFAULT 'Commercial' NOT NULL;--> statement-breakpoint
ALTER TABLE `listings` ADD `sqft` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `listings` ADD `gallery` text DEFAULT '[]' NOT NULL;--> statement-breakpoint
ALTER TABLE `listings` ADD `documents` text DEFAULT '[]' NOT NULL;--> statement-breakpoint
ALTER TABLE `listings` ADD `features` text DEFAULT '[]' NOT NULL;--> statement-breakpoint
ALTER TABLE `listings` ADD `description` text DEFAULT '[]' NOT NULL;--> statement-breakpoint
ALTER TABLE `listings` ADD `sector` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `listings` ADD `scheme` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `listings` ADD `construction` text DEFAULT 'Unconstructed' NOT NULL;--> statement-breakpoint
ALTER TABLE `listings` ADD `negotiation_enabled` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `listings` ADD `participation_deposit` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `listings` ADD `review_note` text DEFAULT '' NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX `listings_display_id_unique` ON `listings` (`display_id`);
--> statement-breakpoint

--> statement-breakpoint

--> statement-breakpoint

--> statement-breakpoint
-- AuctionHouse operations seed
INSERT INTO accounts (id,email,full_name,profile_complete,created_at,updated_at) VALUES ('staff-bootstrap','staff-bootstrap@system.invalid','Operations administrator',1,unixepoch()*1000,unixepoch()*1000);
--> statement-breakpoint
INSERT INTO staff_accounts (id,username,password_hash,role,must_change,actor_id,created_at) VALUES ('staff-bootstrap','budapest','$2b$12$Ai8SeVt58FjVXqA2Qe9yD.H7.fHPfcTHaj7a3Rk/KPYRkWvY8BO2K','owner',1,'staff-bootstrap',unixepoch()*1000);
--> statement-breakpoint
INSERT INTO ah_projects (id,name,scheme,scheme_options,categories,images,facts,auction_terms,negotiation_terms,fields,home_visible,home_order,sale_method,instalments,created_at,updated_at) SELECT 'axis','Pine Axis','LDA City','["LDA City"]','[{"category":"2 Kanal · 150 ft Broadway","marla":40,"blocks":{"Block-E/II (150 Feet Broadway)":["C2","C3","C4","C5","C6","C7","C8","C9","C10","C11"]},"landUse":"Commercial"},{"category":"2 Kanal · Broadway back","marla":40,"blocks":{"Block-E/II (150 Feet Broadway Back)":["C14","C15","C16","C17","C18","C19","C20","C21","C22","C23"]},"landUse":"Commercial"},{"category":"8 Marla · Pine Avenue","marla":8,"blocks":{"Block-A (Pine Avenue)":["C-26","C-27","C-28","C-29","C-30","C-31","C-32","C-33","C-34","C-35","C-36","C-37","C-38","C-39","C-40","C-41","C-42"],"Block-D (Pine Avenue)":["C-33","C-34","C-35","C-36","C-37","C-38","C-39","C-40","C-41","C-42","C-43","C-44","C-45","C-46","C-47","C-48","C-49","C-50","C-51","C-52","C-53","C-54","C-55","C-56","C-57","C-58","C-59","C-60","C-61","C-62","C-63","C-64","C-65","C-66","C-67","C-68","C-69","C-70","C-71","C-72","C-73","C-74","C-75"]},"landUse":"Commercial"},{"category":"8 Marla · Pine Avenue back","marla":8,"blocks":{"Block-A (Pine Avenue Back)":["C-123","C-124","C-125","C-126","C-127","C-128","C-129","C-130","C-131","C-132","C-133","C-134","C-135","C-136","C-137","C-138","C-139"],"Block-D (Pine Avenue Back)":["C-155","C-156","C-157","C-158","C-159","C-160","C-161","C-162","C-163","C-164","C-165","C-166","C-167","C-168","C-169","C-170","C-171","C-172","C-173","C-174","C-175","C-176","C-177","C-178","C-179","C-180","C-181","C-182","C-183","C-184","C-185","C-186","C-187","C-188","C-189","C-190","C-191","C-192","C-193","C-194","C-195","C-196","C-197"]},"landUse":"Commercial"}]','["/assets/pine-axis.webp"]','["The listing identifies its selected project, category, area and allotment status.","Ownership and allotment documents must be supplied for AuctionHouse review."]','["All bid amounts use PKR and the displayed price unit.","The three bid choices add one, two or three published bid intervals.","Read the property facts and confirm your amount before placing a bid.","An accepted offer closes bidding and both parties are notified to visit the office for documentation."]','["The seller must enable negotiation or accept the bidder request.","Offers and counteroffers use the published negotiation interval.","A response must arrive before the displayed deadline.","Accepted negotiations appear in My Deals and require office documentation."]','[{"key":"scheme","label":"Scheme","type":"select","enabled":true,"required":true},{"key":"category","label":"Category","type":"select","enabled":true,"required":true},{"key":"allotment","label":"Allotment Status","type":"select","enabled":true,"required":true},{"key":"block","label":"Block","type":"select","enabled":true,"required":true,"condition":{"field":"allotment","value":"Plot Allotted"}},{"key":"plot","label":"Plot number","type":"select","enabled":true,"required":true,"condition":{"field":"allotment","value":"Plot Allotted"}},{"key":"facts","label":"Facts for Auction","type":"numbered","enabled":true,"required":true},{"key":"terms","label":"Terms and Conditions for Auction","type":"numbered","enabled":true,"required":true},{"key":"negotiationTerms","label":"Terms and Conditions for Negotiation","type":"numbered","enabled":true,"required":true},{"key":"features","label":"Salient features","type":"features","enabled":true,"required":false},{"key":"description","label":"Description","type":"numbered","enabled":true,"required":false},{"key":"unitMode","label":"Per unit mode","type":"select","enabled":true,"required":true},{"key":"price","label":"Bid Starting Price (PKR)","type":"number","enabled":true,"required":true},{"key":"bidInterval","label":"Bid interval (PKR)","type":"number","enabled":true,"required":true},{"key":"startsAt","label":"Bidding start","type":"datetime-local","enabled":true,"required":true},{"key":"endsAt","label":"Bidding end","type":"datetime-local","enabled":true,"required":true},{"key":"negotiationInterval","label":"Negotiation interval (PKR)","type":"number","enabled":true,"required":true},{"key":"negotiationMinutes","label":"Negotiation response time (minutes)","type":"number","enabled":true,"required":true},{"key":"holdingHours","label":"Holding period (hours)","type":"number","enabled":true,"required":true},{"key":"documents","label":"Upload Documents","type":"documents","enabled":true,"required":false}]',1,1,'Ballot by LDA','2 years',unixepoch()*1000,unixepoch()*1000 FROM listings WHERE id='AH-DEMO-1001';
--> statement-breakpoint
INSERT INTO ah_projects (id,name,scheme,scheme_options,categories,images,facts,auction_terms,negotiation_terms,fields,home_visible,home_order,sale_method,instalments,created_at,updated_at) SELECT 'executive','Pine Executive','LDA City','["LDA City"]','[{"category":"1 Kanal · Residential","marla":20,"blocks":{"Block-E/I":["1","2","3","4","5","6","7","8","9","10","11","12","13","14","15","16","17","18","19","20","21","22","23","24","25","26","27","28","29","30","31","32","33","34","35","36","37","38","39","40","41","42","43","44","45","46","47","48","49","50","51","52","53","54","55","56","57","58","59","60","61","62","63","64","65","66","67","68","69","70","71","72","73","74","75","76","77","78","79","80","81","82","83","84","85","86","87","88","89","90","91","92","93","94","95"],"Block-E/II":["1","2","3","4","5","6","7","8","9","10","11","12","13","14","15","16","17","18","19","20","21","22","23","24","25","26","27","28","29","30","31","32","33","34","35","36","37","38","39","40","41","42","43","44","45","46","47","48","49","50","51","52","53","54","55","56","57","58","59","60","61","62","63","64","65","66","67","68","69","70","71","72","73","74","75","76","77","78","79","80","81","82","83","84","85","86","87","88","89","90","91","92","93","94","95","96","97","98","99","100","101","102","103","104","105","106","107","108","109","110","111","112","113","114","115","116","117","118","119","120","121","122","123","124","125"]},"landUse":"Residential"}]','["/assets/pine-executive.webp"]','["The listing identifies its selected project, category, area and allotment status.","Ownership and allotment documents must be supplied for AuctionHouse review."]','["All bid amounts use PKR and the displayed price unit.","The three bid choices add one, two or three published bid intervals.","Read the property facts and confirm your amount before placing a bid.","An accepted offer closes bidding and both parties are notified to visit the office for documentation."]','["The seller must enable negotiation or accept the bidder request.","Offers and counteroffers use the published negotiation interval.","A response must arrive before the displayed deadline.","Accepted negotiations appear in My Deals and require office documentation."]','[{"key":"scheme","label":"Scheme","type":"select","enabled":true,"required":true},{"key":"category","label":"Category","type":"select","enabled":true,"required":true},{"key":"allotment","label":"Allotment Status","type":"select","enabled":true,"required":true},{"key":"block","label":"Block","type":"select","enabled":true,"required":true,"condition":{"field":"allotment","value":"Plot Allotted"}},{"key":"plot","label":"Plot number","type":"select","enabled":true,"required":true,"condition":{"field":"allotment","value":"Plot Allotted"}},{"key":"facts","label":"Facts for Auction","type":"numbered","enabled":true,"required":true},{"key":"terms","label":"Terms and Conditions for Auction","type":"numbered","enabled":true,"required":true},{"key":"negotiationTerms","label":"Terms and Conditions for Negotiation","type":"numbered","enabled":true,"required":true},{"key":"features","label":"Salient features","type":"features","enabled":true,"required":false},{"key":"description","label":"Description","type":"numbered","enabled":true,"required":false},{"key":"unitMode","label":"Per unit mode","type":"select","enabled":true,"required":true},{"key":"price","label":"Bid Starting Price (PKR)","type":"number","enabled":true,"required":true},{"key":"bidInterval","label":"Bid interval (PKR)","type":"number","enabled":true,"required":true},{"key":"startsAt","label":"Bidding start","type":"datetime-local","enabled":true,"required":true},{"key":"endsAt","label":"Bidding end","type":"datetime-local","enabled":true,"required":true},{"key":"negotiationInterval","label":"Negotiation interval (PKR)","type":"number","enabled":true,"required":true},{"key":"negotiationMinutes","label":"Negotiation response time (minutes)","type":"number","enabled":true,"required":true},{"key":"holdingHours","label":"Holding period (hours)","type":"number","enabled":true,"required":true},{"key":"documents","label":"Upload Documents","type":"documents","enabled":true,"required":false}]',1,2,'Ballot by LDA','2 years',unixepoch()*1000,unixepoch()*1000 FROM listings WHERE id='AH-DEMO-1002';
--> statement-breakpoint
INSERT INTO ah_projects (id,name,scheme,scheme_options,categories,images,facts,auction_terms,negotiation_terms,fields,home_visible,home_order,sale_method,instalments,created_at,updated_at) VALUES ('technology','Lahore Technology Park','Lahore Technology Park','["Lahore Technology Park"]','[{"category":"1 Kanal","marla":20,"landUse":"Commercial","blocks":{}},{"category":"15 Marla","marla":15,"landUse":"Commercial","blocks":{}},{"category":"8 Marla","marla":8,"landUse":"Commercial","blocks":{}}]','["/assets/lahore-technology-park.webp"]','["The listing identifies its selected project, category, area and allotment status.","Ownership and allotment documents must be supplied for AuctionHouse review."]','["All bid amounts use PKR and the displayed price unit.","The three bid choices add one, two or three published bid intervals.","Read the property facts and confirm your amount before placing a bid.","An accepted offer closes bidding and both parties are notified to visit the office for documentation."]','["The seller must enable negotiation or accept the bidder request.","Offers and counteroffers use the published negotiation interval.","A response must arrive before the displayed deadline.","Accepted negotiations appear in My Deals and require office documentation."]','[{"key":"scheme","label":"Scheme","type":"select","enabled":true,"required":true},{"key":"category","label":"Category","type":"select","enabled":true,"required":true},{"key":"allotment","label":"Allotment Status","type":"select","enabled":true,"required":true},{"key":"block","label":"Block","type":"select","enabled":true,"required":true,"condition":{"field":"allotment","value":"Plot Allotted"}},{"key":"plot","label":"Plot number","type":"select","enabled":true,"required":true,"condition":{"field":"allotment","value":"Plot Allotted"}},{"key":"facts","label":"Facts for Auction","type":"numbered","enabled":true,"required":true},{"key":"terms","label":"Terms and Conditions for Auction","type":"numbered","enabled":true,"required":true},{"key":"negotiationTerms","label":"Terms and Conditions for Negotiation","type":"numbered","enabled":true,"required":true},{"key":"features","label":"Salient features","type":"features","enabled":true,"required":false},{"key":"description","label":"Description","type":"numbered","enabled":true,"required":false},{"key":"unitMode","label":"Per unit mode","type":"select","enabled":true,"required":true},{"key":"price","label":"Bid Starting Price (PKR)","type":"number","enabled":true,"required":true},{"key":"bidInterval","label":"Bid interval (PKR)","type":"number","enabled":true,"required":true},{"key":"startsAt","label":"Bidding start","type":"datetime-local","enabled":true,"required":true},{"key":"endsAt","label":"Bidding end","type":"datetime-local","enabled":true,"required":true},{"key":"negotiationInterval","label":"Negotiation interval (PKR)","type":"number","enabled":true,"required":true},{"key":"negotiationMinutes","label":"Negotiation response time (minutes)","type":"number","enabled":true,"required":true},{"key":"holdingHours","label":"Holding period (hours)","type":"number","enabled":true,"required":true},{"key":"documents","label":"Upload Documents","type":"documents","enabled":true,"required":false}]',1,3,'Auction by LDA','2 years',unixepoch()*1000,unixepoch()*1000);
--> statement-breakpoint
UPDATE listings SET display_id=char(65+abs(random()%26))||char(65+abs(random()%26))||'-'||char(65+abs(random()%26))||char(65+abs(random()%26))||'-'||(abs(random()%9)+1)||(abs(random()%9)+1)||(abs(random()%9)+1)||(abs(random()%9)+1),land_use=CASE WHEN project='executive' THEN 'Residential' ELSE 'Commercial' END,sqft=marla*225,gallery=json_array(image);
--> statement-breakpoint
UPDATE listing_bidders SET bidder_code=(SELECT substr(display_id,-4) FROM listings WHERE id=listing_id)||'-'||substr(bidder_code,-4);
--> statement-breakpoint
INSERT INTO site_settings (key,value) VALUES ('contact','{"email":"hello@auctionhouse.pk","phone":"+92-300-2828466","address":"Eventium Complex, 2 Civic Centre, LDA Avenue-I, Lahore, Pakistan.","hours":"during office working hours","mapLink":"https://maps.app.goo.gl/Fu2zuZZHQF4g936o9","mapEmbed":"https://maps.google.com/maps?q=31.413517,74.204959&z=16&output=embed"}');
--> statement-breakpoint
INSERT INTO site_settings (key,value) VALUES ('about','"Envisioned in 2021 and officially launched in 2026, AuctionHouse.pk is a dedicated real estate portal designed to secure and simplify the transaction process for property buyers and sellers. We address three critical needs in the market:\n\nVerified Listings: Every property is backed by a genuinely vetted title of ownership.\nOnline Negotiation: A seamless digital environment that empowers users to negotiate prices transparently.\nTrusted Validation: Impartial, third-party oversight by the AuctionHouse.pk team to ensure fair and secure proceedings."');
--> statement-breakpoint
INSERT INTO site_settings (key,value) VALUES ('how','[{"title":"Explore and save","body":"Browse active listings, compare property details and read the facts. Tap a heart to save a listing to My Interests."},{"title":"Create your account","body":"Register with email or Google. Complete your CNIC, email and mobile details before bidding or selling."},{"title":"Read and bid","body":"Read the Facts and Terms, scroll to the bottom and agree. Choose your amount and confirm your bid. New bids update automatically."},{"title":"Negotiate with the seller","body":"Where negotiation is enabled, read the separate terms and enter a private negotiation. Make an offer using the published interval and follow the response timer."},{"title":"Sell your property","body":"Choose an AH project or add your own property. Upload pictures and documents, set the bid interval and provide your facts and terms. The team reviews every new listing."},{"title":"Finalize your deal","body":"When a buyer or seller accepts an offer, the closed deal appears in My Deals. Both parties receive instructions to visit the office for documentation."}]');
--> statement-breakpoint
INSERT INTO site_settings (key,value) VALUES ('customDeposit','0');
--> statement-breakpoint
