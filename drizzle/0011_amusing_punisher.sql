CREATE TABLE `userKeys` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(64) NOT NULL,
	`encryptedValue` text NOT NULL,
	`lastFour` varchar(8),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `userKeys_id` PRIMARY KEY(`id`),
	CONSTRAINT `uniq_user_key_name` UNIQUE(`userId`,`name`)
);
--> statement-breakpoint
ALTER TABLE `apiConfigs` DROP COLUMN `falApiKey`;--> statement-breakpoint
ALTER TABLE `apiConfigs` DROP COLUMN `llmApiKey`;--> statement-breakpoint
ALTER TABLE `apiConfigs` DROP COLUMN `elevenlabsApiKey`;--> statement-breakpoint
ALTER TABLE `apiConfigs` DROP COLUMN `fishAudioApiKey`;--> statement-breakpoint
ALTER TABLE `apiConfigs` DROP COLUMN `whisperApiKey`;