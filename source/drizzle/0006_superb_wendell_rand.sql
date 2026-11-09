CREATE TABLE `saved_searches` (
	`id` text PRIMARY KEY NOT NULL,
	`account_id` text NOT NULL,
	`name` text NOT NULL,
	`filters` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `saved_search_account` ON `saved_searches` (`account_id`);--> statement-breakpoint
CREATE TABLE `staff_devices` (
	`staff_id` text NOT NULL,
	`device_hash` text NOT NULL,
	`created_at` integer NOT NULL,
	PRIMARY KEY(`staff_id`, `device_hash`),
	FOREIGN KEY (`staff_id`) REFERENCES `staff_accounts`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
ALTER TABLE `listings` ADD `documents_verified_at` integer;--> statement-breakpoint
ALTER TABLE `staff_accounts` ADD `email` text;
--> statement-breakpoint
-- Require fresh consent to the newly disclosed rolling five-minute close rule. Prior acceptance records remain intact.
UPDATE listings SET terms_version=terms_version+1,version=version+1 WHERE status IN ('active','pending');
