ALTER TABLE `apiConfigs` ADD `whisperProvider` enum('manus','openai') DEFAULT 'manus' NOT NULL;--> statement-breakpoint
ALTER TABLE `apiConfigs` ADD `whisperApiKey` varchar(200);