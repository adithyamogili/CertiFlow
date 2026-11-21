import { Router } from "express";
import { randomUUID } from "crypto";
import {
  PrismaClient,
  UserRole,
  BatchStatus,
  CertificateStatus
} from "@prisma/client";
import { authenticate, authorize } from "./middleware";
import { notificationQueue } from "./queue";

const router = Router();
const prisma = new PrismaClient();

// Generate certificates after final state approval
router.post(
  "/batches/:batchId/generate",
  authenticate,
  authorize(UserRole.STATE_OFFICE),
  async (req, res) => {
    try {
      const batchId = String(req.params.batchId);

      const result = await prisma.$transaction(async (tx) => {
        const batch = await tx.batch.findUnique({
          where: { id: batchId },
          include: { candidates: true }
        });

        if (!batch || batch.status !== BatchStatus.STATE_APPROVED) {
          throw new Error("Batch has not received state approval");
        }

        let generated = 0;

        const notifications: Array<{
          notificationId: string;
          certificateNumber: string;
        }> = [];

        for (const candidate of batch.candidates) {
          const existing = await tx.certificate.findUnique({
            where: { candidateId: candidate.id }
          });

          if (existing) continue;

          const certificate = await tx.certificate.create({
            data: {
              candidateId: candidate.id,
              certificateNumber: `CERT-${randomUUID()}`,
              verificationCode: randomUUID(),
              status: CertificateStatus.ACTIVE
            }
          });

          const notification = await tx.notification.create({
            data: {
              certificateId: certificate.id
            }
          });

          notifications.push({
            notificationId: notification.id,
            certificateNumber: certificate.certificateNumber
          });

          generated++;
        }

        await tx.auditLog.create({
          data: {
            userId: res.locals.auth.userId,
            batchId,
            action: "CERTIFICATES_GENERATED",
            details: `Generated ${generated} certificates`
          }
        });

        return {
          totalCandidates: batch.candidates.length,
          generated,
          notifications
        };
      });

      // Enqueue notification jobs after the database transaction commits.
      let notificationsQueued = 0;

      for (const notification of result.notifications) {
        try {
          await notificationQueue.add(
            "send-certificate-notification",
            notification,
            {
              attempts: 3,
              backoff: {
                type: "exponential",
                delay: 1000
              },
              removeOnComplete: 100,
              removeOnFail: 500
            }
          );

          notificationsQueued++;
        } catch (queueError) {
          console.error(
            `Failed to queue notification ${notification.notificationId}:`,
            queueError
          );
        }
      }

      return res.json({
        message: "Certificate generation completed",
        totalCandidates: result.totalCandidates,
        generated: result.generated,
        notificationsQueued
      });
    } catch (error) {
      console.error("Certificate generation failed:", error);

      return res.status(400).json({
        message: error instanceof Error
          ? error.message
          : "Certificate generation failed"
      });
    }
  }
);

// Public certificate verification — no login required
router.get("/verify/:verificationCode", async (req, res) => {
  try {
    const verificationCode = String(req.params.verificationCode);

    const certificate = await prisma.certificate.findUnique({
      where: { verificationCode },
      include: {
        candidate: {
          select: {
            name: true,
            externalId: true,
            batch: {
              select: {
                name: true
              }
            }
          }
        }
      }
    });

    if (!certificate || certificate.status !== CertificateStatus.ACTIVE) {
      return res.status(404).json({
        valid: false,
        message: "Certificate is invalid or has been cancelled"
      });
    }

    return res.json({
      valid: true,
      certificateNumber: certificate.certificateNumber,
      candidateName: certificate.candidate.name,
      candidateId: certificate.candidate.externalId,
      batchName: certificate.candidate.batch.name,
      issuedAt: certificate.issuedAt
    });
  } catch (error) {
    console.error("Certificate verification failed:", error);

    return res.status(500).json({
      valid: false,
      message: "Unable to verify certificate"
    });
  }
});

// Cancel a certificate
router.post(
  "/:certificateId/cancel",
  authenticate,
  authorize(UserRole.STATE_OFFICE),
  async (req, res) => {
    try {
      const certificateId = String(req.params.certificateId);
      const officerId = res.locals.auth.userId;

      const result = await prisma.$transaction(async (tx) => {
        const certificate = await tx.certificate.findUnique({
          where: { id: certificateId },
          include: {
            candidate: {
              select: {
                batchId: true
              }
            }
          }
        });

        if (!certificate) {
          throw new Error("Certificate not found");
        }

        if (certificate.status === CertificateStatus.CANCELLED) {
          throw new Error("Certificate is already cancelled");
        }

        const updated = await tx.certificate.update({
          where: { id: certificateId },
          data: {
            status: CertificateStatus.CANCELLED,
            cancelledAt: new Date()
          }
        });

        await tx.auditLog.create({
          data: {
            userId: officerId,
            batchId: certificate.candidate.batchId,
            action: "CERTIFICATE_CANCELLED",
            details: `Cancelled certificate ${certificate.certificateNumber}`
          }
        });

        return updated;
      });

      return res.json({
        message: "Certificate cancelled successfully",
        certificate: result
      });
    } catch (error) {
      return res.status(400).json({
        message: error instanceof Error
          ? error.message
          : "Certificate cancellation failed"
      });
    }
  }
);

export default router;