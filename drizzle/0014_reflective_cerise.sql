CREATE TABLE `usageMeters` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` varchar(255) NOT NULL,
	`period` varchar(10) NOT NULL,
	`meter` varchar(64) NOT NULL,
	`count` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `usageMeters_id` PRIMARY KEY(`id`),
	CONSTRAINT `uniq_user_period_meter` UNIQUE(`userId`,`period`,`meter`)
);
