CREATE TABLE `benchmark_results` (
	`id` int AUTO_INCREMENT NOT NULL,
	`versionName` varchar(255) NOT NULL,
	`apiUrl` varchar(512) NOT NULL,
	`sampleLimit` int NOT NULL,
	`status` enum('pending','running','completed','error') NOT NULL DEFAULT 'pending',
	`progress` int NOT NULL DEFAULT 0,
	`currentTask` text,
	`arcEasy` float,
	`hellaswag` float,
	`truthfulqa` float,
	`average` float,
	`errorMessage` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`completedAt` timestamp,
	CONSTRAINT `benchmark_results_id` PRIMARY KEY(`id`)
);
