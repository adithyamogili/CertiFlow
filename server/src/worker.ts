import { Worker } from "bullmq";
import { PrismaClient, NotificationStatus } from "@prisma/client";

const prisma = new PrismaClient();

const connection = {
  host: "127.0.0.1",
  port: 6379,
  maxRetriesPerRequest: null,
};

const worker = new Worker(
  "certificate-notifications",
  async (job) => {
    const { notificationId, certificateNumber } = job.data;

    try {
      const notification = await prisma.notification.findUnique({
        where: { id: notificationId },
      });

      if (!notification) {
        throw new Error("Notification record not found");
      }

      // Mock provider: simulates successful notification delivery.
      console.log(
        `[MOCK NOTIFICATION] Certificate ${certificateNumber} processed`
      );

      await prisma.notification.update({
        where: { id: notificationId },
        data: {
          status: NotificationStatus.SENT,
          attempts: { increment: 1 },
          sentAt: new Date(),
          lastError: null,
        },
      });

      return { success: true, provider: "MOCK" };
    } catch (error) {
      await prisma.notification.update({
        where: { id: notificationId },
        data: {
          attempts: { increment: 1 },
          lastError:
            error instanceof Error ? error.message : "Unknown error",
        },
      });

      throw error;
    }
  },
  {
    connection,
    concurrency: 5,
  }
);

worker.on("completed", (job) => {
  console.log(`Notification job ${job.id} completed`);
});

worker.on("failed", async (job, error) => {
  console.error(`Notification job ${job?.id} failed:`, error.message);

  if (job && job.attemptsMade >= 3) {
    const notificationId = job.data.notificationId;

    await prisma.notification.updateMany({
      where: { id: notificationId },
      data: { status: NotificationStatus.FAILED },
    });
  }
});

console.log("CertiFlow notification worker is running");

async function shutdown() {
  await worker.close();
  await prisma.$disconnect();
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);