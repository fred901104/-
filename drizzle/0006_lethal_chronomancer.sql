ALTER TABLE `users` ADD `nickname` varchar(128);--> statement-breakpoint
ALTER TABLE `users` ADD `is_x_bound` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `is_streamer_verified` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `spot_trading_volume` decimal(20,2) DEFAULT '0.00' NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `futures_trading_volume` decimal(20,2) DEFAULT '0.00' NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `total_streaming_minutes` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `total_watching_minutes` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `total_posts` int DEFAULT 0 NOT NULL;