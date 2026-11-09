CREATE TABLE `project_info` (
	`id` text PRIMARY KEY NOT NULL,
	`tab_name` text NOT NULL,
	`title` text NOT NULL,
	`content` text NOT NULL,
	`images` text DEFAULT '[]' NOT NULL,
	`visible` integer DEFAULT 1 NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`version` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `staff_formats` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`attachment_id` text NOT NULL,
	`version` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`attachment_id`) REFERENCES `attachments`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
ALTER TABLE `closed_deals` ADD `accepted_by` text DEFAULT 'seller' NOT NULL;--> statement-breakpoint
ALTER TABLE `listing_bidders` ADD `token_disclosed_at` integer;--> statement-breakpoint
ALTER TABLE `listings` ADD `negotiation_disabled` integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
UPDATE listing_bidders SET token_disclosed_at=(SELECT MIN(accepted_at) FROM listing_acceptances a WHERE a.listing_id=listing_bidders.listing_id AND a.account_id=listing_bidders.account_id);
--> statement-breakpoint
UPDATE closed_deals SET accepted_by=COALESCE((SELECT e.actor FROM negotiation_events e JOIN negotiations n ON n.id=e.negotiation_id WHERE n.listing_id=closed_deals.listing_id AND e.action='agree' ORDER BY e.created_at DESC LIMIT 1),'seller') WHERE source='negotiation';
--> statement-breakpoint
UPDATE listings SET title='Plot No. '||plot||CASE WHEN block<>'' THEN ', '||CASE WHEN LOWER(SUBSTR(block,1,5))='block' THEN block ELSE 'Block '||block END ELSE '' END||', '||scheme WHERE project='custom' AND plot<>'' AND scheme<>'';
--> statement-breakpoint
UPDATE site_settings SET value=json_set(value,'$.heading','Where luck meets opportunity…','$.intro','Compete in the open auction or negotiate on your terms.') WHERE key='page';
--> statement-breakpoint
INSERT INTO project_info (id,tab_name,title,content,images,visible,sort_order,created_at,updated_at) VALUES
('pine-axis','Pine Axis','Pine Axis Commercial','Explore Pine Axis commercial property opportunities in LDA City, Lahore.

[Apply for the ballot on LDA’s website](https://lda.gop.pk/sales-landing)

Review the official project information and each property’s facts and terms before participating.','[{"url":"/assets/pine-axis.webp","align":"right","position":0,"caption":"Pine Axis Commercial"}]',1,0,CAST(strftime('%s','now') AS INTEGER)*1000,CAST(strftime('%s','now') AS INTEGER)*1000),
('pine-executive','Pine Executive','Pine Executive Residential','Explore Pine Executive residential property opportunities in LDA City, Lahore.

[Apply for the ballot on LDA’s website](https://lda.gop.pk/sales-landing)

Review the official project information and each property’s facts and terms before participating.','[{"url":"/assets/pine-executive.webp","align":"right","position":0,"caption":"Pine Executive Residential"}]',1,1,CAST(strftime('%s','now') AS INTEGER)*1000,CAST(strftime('%s','now') AS INTEGER)*1000);
