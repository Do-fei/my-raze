ALTER TABLE `girlfriends` ADD `intimacyLevel` int DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `girlfriends` ADD `intimacyPoints` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `girlfriends` ADD `lastInteractionAt` timestamp;--> statement-breakpoint
ALTER TABLE `girlfriends` ADD `consecutiveDays` int DEFAULT 0 NOT NULL;