ALTER TABLE `points_configs` ADD `start_date` timestamp;--> statement-breakpoint
ALTER TABLE `points_configs` ADD `end_date` timestamp;--> statement-breakpoint
ALTER TABLE `points_configs` ADD `status` varchar(16) DEFAULT 'draft' NOT NULL;--> statement-breakpoint
ALTER TABLE `points_configs` ADD `pools_config` text;