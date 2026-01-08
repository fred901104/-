CREATE TABLE `export_histories` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`user_name` varchar(128),
	`export_type` varchar(64) NOT NULL,
	`export_table` varchar(64) NOT NULL,
	`record_count` int NOT NULL,
	`column_count` int NOT NULL,
	`filter_conditions` text,
	`selected_columns` text,
	`filename` varchar(255) NOT NULL,
	`file_size` int,
	`exported_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `export_histories_id` PRIMARY KEY(`id`)
);
