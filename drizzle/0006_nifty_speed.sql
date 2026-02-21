ALTER TABLE `apiConfigs` ADD `globalPrompt` text;--> statement-breakpoint
ALTER TABLE `apiConfigs` ADD `replyLanguage` varchar(50) DEFAULT '中文';--> statement-breakpoint
ALTER TABLE `apiConfigs` ADD `replyLengthLimit` varchar(50) DEFAULT '50-100字';--> statement-breakpoint
ALTER TABLE `girlfriends` ADD `customPrompt` text;