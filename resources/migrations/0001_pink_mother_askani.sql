CREATE TABLE `accounts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`customer_id` integer NOT NULL,
	`name` text NOT NULL,
	`code` text NOT NULL,
	`active_from` text NOT NULL,
	`active_until` text,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "accounts_validity_period_check" CHECK("accounts"."active_until" IS NULL OR "accounts"."active_until" >= "accounts"."active_from")
);
--> statement-breakpoint
CREATE UNIQUE INDEX `accounts_code_unique` ON `accounts` (`code`);--> statement-breakpoint
CREATE INDEX `accounts_customer_id_index` ON `accounts` (`customer_id`);--> statement-breakpoint
CREATE TABLE `activity_types` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`category` text NOT NULL,
	`color` text NOT NULL,
	`sort_order` integer NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	CONSTRAINT "activity_types_category_check" CHECK("activity_types"."category" IN ('work', 'filler'))
);
--> statement-breakpoint
CREATE INDEX `activity_types_category_sort_order_index` ON `activity_types` (`category`,`sort_order`);--> statement-breakpoint
CREATE TABLE `customer_checklist_definitions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`customer_id` integer NOT NULL,
	`name` text NOT NULL,
	`sort_order` integer NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE UNIQUE INDEX `customer_checklist_definitions_customer_name_unique` ON `customer_checklist_definitions` (`customer_id`,`name`);--> statement-breakpoint
CREATE INDEX `customer_checklist_definitions_customer_sort_order_index` ON `customer_checklist_definitions` (`customer_id`,`sort_order`);--> statement-breakpoint
CREATE TABLE `customers` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`color` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `customers_name_unique` ON `customers` (`name`);--> statement-breakpoint
CREATE TABLE `work_days` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`date` text NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	CONSTRAINT "work_days_status_check" CHECK("work_days"."status" IN ('draft', 'confirmed'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `work_days_date_unique` ON `work_days` (`date`);--> statement-breakpoint
CREATE TABLE `work_entries` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`work_day_id` integer NOT NULL,
	`account_id` integer,
	`date` text NOT NULL,
	`start_time` text NOT NULL,
	`end_time` text NOT NULL,
	`ticket_number` text,
	`activity_type_id` integer,
	`description` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`work_day_id`) REFERENCES `work_days`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`activity_type_id`) REFERENCES `activity_types`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "work_entries_time_order_check" CHECK("work_entries"."start_time" < "work_entries"."end_time")
);
--> statement-breakpoint
CREATE INDEX `work_entries_work_day_id_index` ON `work_entries` (`work_day_id`);--> statement-breakpoint
CREATE INDEX `work_entries_account_id_index` ON `work_entries` (`account_id`);--> statement-breakpoint
CREATE INDEX `work_entries_activity_type_id_index` ON `work_entries` (`activity_type_id`);--> statement-breakpoint
CREATE INDEX `work_entries_date_index` ON `work_entries` (`date`);--> statement-breakpoint
CREATE TABLE `work_entry_checklist_values` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`work_entry_id` integer NOT NULL,
	`checklist_definition_id` integer NOT NULL,
	`is_checked` integer DEFAULT false NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`work_entry_id`) REFERENCES `work_entries`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`checklist_definition_id`) REFERENCES `customer_checklist_definitions`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE UNIQUE INDEX `work_entry_checklist_values_entry_definition_unique` ON `work_entry_checklist_values` (`work_entry_id`,`checklist_definition_id`);--> statement-breakpoint
CREATE INDEX `work_entry_checklist_values_definition_id_index` ON `work_entry_checklist_values` (`checklist_definition_id`);