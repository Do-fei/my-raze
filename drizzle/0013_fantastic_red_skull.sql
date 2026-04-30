ALTER TABLE `accounts` MODIFY COLUMN `userId` varchar(255) NOT NULL;--> statement-breakpoint
ALTER TABLE `apiConfigs` MODIFY COLUMN `userId` varchar(255) NOT NULL;--> statement-breakpoint
ALTER TABLE `conversations` MODIFY COLUMN `userId` varchar(255) NOT NULL;--> statement-breakpoint
ALTER TABLE `girlfriendMoods` MODIFY COLUMN `userId` varchar(255) NOT NULL;--> statement-breakpoint
ALTER TABLE `girlfriends` MODIFY COLUMN `userId` varchar(255) NOT NULL;--> statement-breakpoint
ALTER TABLE `notifications` MODIFY COLUMN `userId` varchar(255) NOT NULL;--> statement-breakpoint
ALTER TABLE `selfies` MODIFY COLUMN `userId` varchar(255) NOT NULL;--> statement-breakpoint
ALTER TABLE `sessions` MODIFY COLUMN `userId` varchar(255) NOT NULL;--> statement-breakpoint
ALTER TABLE `userKeys` MODIFY COLUMN `userId` varchar(255) NOT NULL;--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `id` varchar(255) NOT NULL;