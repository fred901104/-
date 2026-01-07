CREATE TABLE `core_identities` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`identity_type` enum('og','core_streamer','pro_trader') NOT NULL,
	`auto_distribute` int DEFAULT 1,
	`weekly_bonus` int DEFAULT 0,
	`created_by` int NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `core_identities_id` PRIMARY KEY(`id`),
	CONSTRAINT `core_identities_user_id_unique` UNIQUE(`user_id`)
);
--> statement-breakpoint
CREATE TABLE `featured_contents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`content_type` enum('post','video','stream') NOT NULL,
	`content_id` varchar(128) NOT NULL,
	`uv_count` int DEFAULT 0,
	`interaction_count` int DEFAULT 0,
	`is_featured` int DEFAULT 0,
	`featured_by` int,
	`featured_at` timestamp,
	`bonus_multiplier` int DEFAULT 1,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `featured_contents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `live_streams` (
	`id` int AUTO_INCREMENT NOT NULL,
	`streamer_id` int NOT NULL,
	`start_time` timestamp NOT NULL,
	`end_time` timestamp,
	`duration` int DEFAULT 0,
	`avg_ccu` int DEFAULT 0,
	`peak_ccu` int DEFAULT 0,
	`interaction_count` int DEFAULT 0,
	`valid_duration` int DEFAULT 0,
	`is_anomalous` int DEFAULT 0,
	`anomaly_reason` text,
	`estimated_points` int DEFAULT 0,
	`ccu_samples` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `live_streams_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `operation_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`operator_id` int NOT NULL,
	`action` varchar(128) NOT NULL,
	`target_type` varchar(64),
	`target_id` int,
	`details` text,
	`ip_address` varchar(64),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `operation_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `points_records` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`type` enum('genesis','eco','trade') NOT NULL,
	`sub_type` varchar(64),
	`amount` int NOT NULL,
	`description` text,
	`related_id` int,
	`status` enum('pending','approved','rejected','frozen') NOT NULL DEFAULT 'pending',
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`approved_at` timestamp,
	`approved_by` int,
	CONSTRAINT `points_records_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `settlements` (
	`id` int AUTO_INCREMENT NOT NULL,
	`week_number` int NOT NULL,
	`year` int NOT NULL,
	`start_date` timestamp NOT NULL,
	`end_date` timestamp NOT NULL,
	`total_points` int DEFAULT 0,
	`genesis_points` int DEFAULT 0,
	`eco_points` int DEFAULT 0,
	`trade_points` int DEFAULT 0,
	`status` enum('preview','confirmed','distributed') NOT NULL DEFAULT 'preview',
	`created_by` int NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`confirmed_at` timestamp,
	CONSTRAINT `settlements_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `tickets` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`type` enum('bug','suggestion','info') NOT NULL,
	`title` varchar(255) NOT NULL,
	`content` text NOT NULL,
	`priority` enum('p0','p1','p2','p3'),
	`status` enum('pending','approved','rejected') NOT NULL DEFAULT 'pending',
	`base_score` int DEFAULT 0,
	`final_score` int DEFAULT 0,
	`review_note` text,
	`reviewed_by` int,
	`reviewed_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `tickets_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `trade_records` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`trade_pair` varchar(64) NOT NULL,
	`trade_type` enum('spot','futures') NOT NULL,
	`fee_amount` int NOT NULL,
	`holding_duration` int DEFAULT 0,
	`order_count` int DEFAULT 1,
	`volume` int DEFAULT 0,
	`is_suspicious` int DEFAULT 0,
	`suspicious_reason` text,
	`estimated_points` int DEFAULT 0,
	`status` enum('normal','frozen','reviewed') NOT NULL DEFAULT 'normal',
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `trade_records_id` PRIMARY KEY(`id`)
);
