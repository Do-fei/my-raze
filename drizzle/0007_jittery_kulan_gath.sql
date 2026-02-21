CREATE TABLE `notifications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`girlfriendId` int NOT NULL,
	`title` varchar(200) NOT NULL,
	`content` text NOT NULL,
	`type` enum('miss_you','good_morning','good_night','random','mood') NOT NULL DEFAULT 'random',
	`isRead` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `notifications_id` PRIMARY KEY(`id`)
);
