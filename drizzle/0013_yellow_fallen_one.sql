ALTER TABLE `live_streams` ADD `stage_id` int;--> statement-breakpoint
ALTER TABLE `live_streams` ADD `created_by` int;--> statement-breakpoint
ALTER TABLE `live_streams` ADD `reviewed_by` int;--> statement-breakpoint
ALTER TABLE `live_streams` ADD `modified_by` int;--> statement-breakpoint
ALTER TABLE `live_streams` ADD `updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP;--> statement-breakpoint
ALTER TABLE `tickets` ADD `stage_id` int;--> statement-breakpoint
ALTER TABLE `tickets` ADD `created_by` int;--> statement-breakpoint
ALTER TABLE `tickets` ADD `modified_by` int;--> statement-breakpoint
ALTER TABLE `tickets` ADD `updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP;--> statement-breakpoint
ALTER TABLE `trade_records` ADD `stage_id` int;--> statement-breakpoint
ALTER TABLE `trade_records` ADD `created_by` int;--> statement-breakpoint
ALTER TABLE `trade_records` ADD `reviewed_by` int;--> statement-breakpoint
ALTER TABLE `trade_records` ADD `modified_by` int;--> statement-breakpoint
ALTER TABLE `trade_records` ADD `updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP;