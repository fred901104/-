ALTER TABLE `settlements` ADD `pre_distribution_points` int DEFAULT 0;--> statement-breakpoint
ALTER TABLE `settlements` ADD `actual_distribution_points` int DEFAULT 0;--> statement-breakpoint
ALTER TABLE `settlements` ADD `distributed_at` timestamp;