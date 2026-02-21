ALTER TABLE `apiConfigs` ADD `ttsProvider` enum('browser','elevenlabs','fishaudio') DEFAULT 'browser' NOT NULL;--> statement-breakpoint
ALTER TABLE `apiConfigs` ADD `elevenlabsApiKey` varchar(200);--> statement-breakpoint
ALTER TABLE `apiConfigs` ADD `elevenlabsVoiceId` varchar(200);--> statement-breakpoint
ALTER TABLE `apiConfigs` ADD `elevenlabsVoiceName` varchar(200);--> statement-breakpoint
ALTER TABLE `apiConfigs` ADD `fishAudioApiKey` varchar(200);--> statement-breakpoint
ALTER TABLE `apiConfigs` ADD `fishAudioModelId` varchar(200);--> statement-breakpoint
ALTER TABLE `apiConfigs` ADD `fishAudioModelName` varchar(200);