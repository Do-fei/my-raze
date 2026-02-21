CREATE TABLE `girlfriendMoods` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`girlfriendId` int NOT NULL,
	`mood` enum('excited','happy','content','neutral','lonely','sad') NOT NULL DEFAULT 'happy',
	`moodScore` int NOT NULL DEFAULT 70,
	`lastChatAt` timestamp,
	`totalMessages` int NOT NULL DEFAULT 0,
	`todayMessages` int NOT NULL DEFAULT 0,
	`lastMoodUpdate` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `girlfriendMoods_id` PRIMARY KEY(`id`)
);
