CREATE TABLE `memories` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` varchar(255) NOT NULL,
	`girlfriendId` int NOT NULL,
	`category` enum('fact','preference','event','relationship') NOT NULL DEFAULT 'fact',
	`content` varchar(300) NOT NULL,
	`weight` int NOT NULL DEFAULT 50,
	`pinned` boolean NOT NULL DEFAULT false,
	`sourceMessageId` int,
	`lastRecalledAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `memories_id` PRIMARY KEY(`id`),
	CONSTRAINT `uniq_memory_dedupe` UNIQUE(`girlfriendId`,`content`)
);
