CREATE TABLE `subscriptions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` varchar(255) NOT NULL,
	`provider` varchar(32) NOT NULL DEFAULT 'lemonsqueezy',
	`lsSubscriptionId` varchar(64) NOT NULL,
	`lsCustomerId` varchar(64),
	`plan` enum('plus','pro') NOT NULL,
	`status` enum('on_trial','active','paused','past_due','unpaid','cancelled','expired') NOT NULL,
	`renewsAt` timestamp,
	`endsAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `subscriptions_id` PRIMARY KEY(`id`),
	CONSTRAINT `subscriptions_userId_unique` UNIQUE(`userId`),
	CONSTRAINT `subscriptions_lsSubscriptionId_unique` UNIQUE(`lsSubscriptionId`)
);
