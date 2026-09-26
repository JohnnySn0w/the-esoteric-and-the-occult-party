CREATE TABLE `circles` (
	`id` text PRIMARY KEY NOT NULL,
	`host_hash` text NOT NULL,
	`seal_keys` text NOT NULL,
	`mask` integer DEFAULT 0 NOT NULL,
	`revision` integer DEFAULT 0 NOT NULL,
	`last_seal` text,
	`created_at` text NOT NULL
);
