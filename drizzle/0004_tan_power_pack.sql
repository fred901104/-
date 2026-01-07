ALTER TABLE `users` ADD `is_blacklisted` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `blacklist_reason` text;--> statement-breakpoint
ALTER TABLE `users` ADD `blacklisted_at` timestamp;--> statement-breakpoint
ALTER TABLE `users` ADD `blacklisted_by` int;