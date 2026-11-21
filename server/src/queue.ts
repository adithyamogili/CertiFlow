import { Queue } from "bullmq";

const connection = {
  host: "127.0.0.1",
  port: 6379,
  maxRetriesPerRequest: null,
};

export const notificationQueue = new Queue(
  "certificate-notifications",
  { connection }
);