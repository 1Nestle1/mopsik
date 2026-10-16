CREATE TABLE `stream_keys` (
	`user_id` integer PRIMARY KEY NOT NULL,
	`key_hash` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `stream_keys_key_hash_idx` ON `stream_keys` (`key_hash`);