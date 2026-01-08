CREATE TABLE `weekly_configs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`config_id` int NOT NULL,
	`week_number` int NOT NULL,
	`start_date` timestamp NOT NULL,
	`end_date` timestamp NOT NULL,
	`weekly_points` int NOT NULL,
	`status` varchar(16) NOT NULL DEFAULT 'active',
	`actual_points` int NOT NULL DEFAULT 0,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `weekly_configs_id` PRIMARY KEY(`id`)
);
