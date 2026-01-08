CREATE TABLE `stage_budgets` (
	`id` int AUTO_INCREMENT NOT NULL,
	`stage_name` varchar(64) NOT NULL,
	`total_budget` int NOT NULL,
	`used_budget` int NOT NULL DEFAULT 0,
	`start_date` timestamp NOT NULL,
	`end_date` timestamp NOT NULL,
	`status` varchar(16) NOT NULL DEFAULT 'active',
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `stage_budgets_id` PRIMARY KEY(`id`),
	CONSTRAINT `stage_budgets_stage_name_unique` UNIQUE(`stage_name`)
);
--> statement-breakpoint
CREATE TABLE `weekly_release_rules` (
	`id` int AUTO_INCREMENT NOT NULL,
	`stage_id` int NOT NULL,
	`week_number` int NOT NULL,
	`start_date` timestamp NOT NULL,
	`end_date` timestamp NOT NULL,
	`weekly_points_target` int NOT NULL,
	`p_genesis_percent` varchar(16) NOT NULL,
	`p_eco_percent` varchar(16) NOT NULL,
	`p_trade_percent` varchar(16) NOT NULL,
	`status` varchar(16) NOT NULL DEFAULT 'active',
	`actual_released` int NOT NULL DEFAULT 0,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `weekly_release_rules_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `points_configs` MODIFY COLUMN `phase` varchar(64) NOT NULL;--> statement-breakpoint
ALTER TABLE `points_configs` MODIFY COLUMN `total_budget` int NOT NULL DEFAULT 0;