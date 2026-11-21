
import { Router } from "express";
import {
  PrismaClient,
  UserRole,
  BatchStatus,
  ApprovalLevel,
  ApprovalDecision
} from "@prisma/client";
import { authenticate, authorize } from "./middleware";

const router = Router();
const prisma = new PrismaClient();

// Training centre submits a draft batch
router.post(
  "/:batchId/submit",
  authenticate,
  authorize(UserRole.TRAINING_CENTRE),
  async (req, res) => {
    try {
      const batchId = String(req.params.batchId);

      const batch = await prisma.batch.findFirst({
        where: {
          id: batchId,
          centreId: res.locals.auth.userId,
          status: BatchStatus.DRAFT
        }
      });

      if (!batch) {
        return res.status(404).json({
          message: "Draft batch not found"
        });
      }

      const updated = await prisma.batch.update({
        where: { id: batch.id },
        data: { status: BatchStatus.SUBMITTED }
      });

      await prisma.auditLog.create({
        data: {
          userId: res.locals.auth.userId,
          batchId: batch.id,
          action: "BATCH_SUBMITTED"
        }
      });

      return res.json({
        message: "Batch submitted for district approval",
        batch: updated
      });
    } catch (error) {
      console.error("Batch submission failed:", error);
      return res.status(500).json({
        message: "Unable to submit batch"
      });
    }
  }
);

// District officer approves a submitted batch
router.post(
  "/:batchId/district-approve",
  authenticate,
  authorize(UserRole.DISTRICT_OFFICER),
  async (req, res) => {
    try {
      const batchId = String(req.params.batchId);
      const officerId = res.locals.auth.userId;
      const { remarks } = req.body;

      const result = await prisma.$transaction(
        async (tx) => {
          const batch = await tx.batch.findUnique({
            where: { id: batchId }
          });

          if (!batch || batch.status !== BatchStatus.SUBMITTED) {
            throw new Error(
              "Batch is not awaiting district approval"
            );
          }

          const existing = await tx.approval.findUnique({
            where: {
              batchId_officerId_level: {
                batchId: batch.id,
                officerId,
                level: ApprovalLevel.DISTRICT
              }
            }
          });

          if (existing) {
            throw new Error(
              "You have already reviewed this batch"
            );
          }

          await tx.approval.create({
            data: {
              batchId: batch.id,
              officerId,
              level: ApprovalLevel.DISTRICT,
              decision: ApprovalDecision.APPROVED,
              remarks:
                typeof remarks === "string" ? remarks : null
            }
          });

          const approvalCount = await tx.approval.count({
            where: {
              batchId: batch.id,
              level: ApprovalLevel.DISTRICT,
              decision: ApprovalDecision.APPROVED
            }
          });

          const updatedBatch =
            approvalCount >= 2
              ? await tx.batch.update({
                  where: { id: batch.id },
                  data: {
                    status: BatchStatus.DISTRICT_APPROVED
                  }
                })
              : batch;

          await tx.auditLog.create({
            data: {
              userId: officerId,
              batchId: batch.id,
              action: "DISTRICT_APPROVAL"
            }
          });

          return {
            batch: updatedBatch,
            approvalCount
          };
        },
        {
          isolationLevel: "Serializable"
        }
      );

      return res.json({
        message:
          result.approvalCount >= 2
            ? "Two district approvals received. Batch approved."
            : "First district approval recorded. Waiting for another officer.",
        approvalCount: result.approvalCount,
        requiredApprovals: 2,
        batch: result.batch
      });
    } catch (error) {
      console.error("District approval failed:", error);

      return res.status(400).json({
        message:
          error instanceof Error
            ? error.message
            : "District approval failed. Please retry."
      });
    }
  }
);

router.post(
  "/:batchId/quality-approve",
  authenticate,
  authorize(UserRole.QUALITY_TEAM),
  async (req, res) => {
    try {
      const batchId = String(req.params.batchId);
      const officerId = res.locals.auth.userId;

      const result = await prisma.$transaction(async (tx) => {
        const batch = await tx.batch.findUnique({
          where: { id: batchId }
        });

        if (
          !batch ||
          batch.status !== BatchStatus.DISTRICT_APPROVED ||
          batch.candidateCount < 50
        ) {
          throw new Error(
            "Batch is not eligible for quality review"
          );
        }

        await tx.approval.create({
          data: {
            batchId,
            officerId,
            level: ApprovalLevel.QUALITY,
            decision: ApprovalDecision.APPROVED,
            remarks: "Quality review completed"
          }
        });

        await tx.batch.update({
          where: { id: batchId },
          data: { status: BatchStatus.QUALITY_REVIEW }
        });

        await tx.auditLog.create({
          data: {
            userId: officerId,
            batchId,
            action: "QUALITY_APPROVED"
          }
        });

        return { message: "Quality review approved" };
      });

      return res.json(result);
    } catch (error) {
      return res.status(400).json({
        message: error instanceof Error
          ? error.message
          : "Quality approval failed"
      });
    }
  }
);

// State office gives final approval
router.post(
  "/:batchId/state-approve",
  authenticate,
  authorize(UserRole.STATE_OFFICE),
  async (req, res) => {
    try {
      const batchId = String(req.params.batchId);
      const officerId = res.locals.auth.userId;

      const result = await prisma.$transaction(async (tx) => {
        const batch = await tx.batch.findUnique({
          where: { id: batchId }
        });

        if (!batch) {
          throw new Error("Batch not found");
        }

        const largeBatch = batch.candidateCount >= 50;

        if (
          largeBatch &&
          batch.status !== BatchStatus.QUALITY_REVIEW
        ) {
          throw new Error(
            "Large batch requires quality-team approval first"
          );
        }

        if (
          !largeBatch &&
          batch.status !== BatchStatus.DISTRICT_APPROVED
        ) {
          throw new Error(
            "Batch is not ready for state approval"
          );
        }

        if (largeBatch) {
          const qualityApproval = await tx.approval.findFirst({
            where: {
              batchId,
              level: ApprovalLevel.QUALITY,
              decision: ApprovalDecision.APPROVED
            }
          });

          if (!qualityApproval) {
            throw new Error("Quality approval is required");
          }
        }

        await tx.approval.create({
          data: {
            batchId,
            officerId,
            level: ApprovalLevel.STATE,
            decision: ApprovalDecision.APPROVED,
            remarks: "Final state approval"
          }
        });

        const updatedBatch = await tx.batch.update({
          where: { id: batchId },
          data: { status: BatchStatus.STATE_APPROVED }
        });

        await tx.auditLog.create({
          data: {
            userId: officerId,
            batchId,
            action: "STATE_APPROVED"
          }
        });

        return updatedBatch;
      });

      return res.json({
        message: "Final state approval successful",
        batch: result
      });
    } catch (error) {
      return res.status(400).json({
        message: error instanceof Error
          ? error.message
          : "State approval failed"
      });
    }
  }
);


export default router;
