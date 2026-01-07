ALTER TABLE `points_configs` ADD `weekly_points_target` int NOT NULL;--> statement-breakpoint
ALTER TABLE `points_configs` DROP COLUMN `phase_description`;--> statement-breakpoint
ALTER TABLE `points_configs` DROP COLUMN `total_tokens`;--> statement-breakpoint
ALTER TABLE `points_configs` DROP COLUMN `points_pool_percent`;--> statement-breakpoint
ALTER TABLE `points_configs` DROP COLUMN `phase_release_percent`;--> statement-breakpoint
ALTER TABLE `points_configs` DROP COLUMN `week_count`;--> statement-breakpoint
ALTER TABLE `points_configs` DROP COLUMN `dynamic_pool_percent`;--> statement-breakpoint
ALTER TABLE `points_configs` DROP COLUMN `genesis_pool_percent`;--> statement-breakpoint
ALTER TABLE `points_configs` DROP COLUMN `rules_config`;