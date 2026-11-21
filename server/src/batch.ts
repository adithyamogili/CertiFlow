
import { Router } from "express";
import { PrismaClient, UserRole, BatchStatus } from "@prisma/client";
import { authenticate, authorize } from "./middleware";
import { parse } from "csv-parse/sync";

const router = Router();
const prisma = new PrismaClient();

router.post(
  "/upload",
  authenticate,
  authorize(UserRole.TRAINING_CENTRE),
  async (req, res) => {
    try {
      const { name, csv } = req.body;

      if (
        typeof name !== "string" ||
        !name.trim() ||
        typeof csv !== "string" ||
        !csv.trim()
      ) {
        return res.status(400).json({
          message: "Batch name and CSV content are required"
        });
      }

      const records = parse(csv, {
        columns: true,
        skip_empty_lines: true,
        trim: true
      }) as Record<string, string>[];

      if (records.length === 0) {
        return res.status(400).json({
          message: "CSV contains no candidates"
        });
      }

      const errors: string[] = [];

      records.forEach((candidate, index) => {
        if (
          !candidate.externalId ||
          !candidate.name ||
          !candidate.phone
        ) {
          errors.push(`Row ${index + 2}: externalId, name and phone are required`);
        }
      });

      const ids = records.map((candidate) => candidate.externalId);
      if (new Set(ids).size !== ids.length) {
        errors.push("CSV contains duplicate externalId values");
      }

      if (errors.length > 0) {
        return res.status(400).json({
          message: "CSV validation failed",
          errors
        });
      }

      const batch = await prisma.$transaction(async (tx) => {
        const createdBatch = await tx.batch.create({
          data: {
            name: name.trim(),
            centreId: res.locals.auth.userId,
            candidateCount: records.length,
            status: BatchStatus.DRAFT
          }
        });

        await tx.candidate.createMany({
          data: records.map((candidate) => ({
            batchId: createdBatch.id,
            externalId: candidate.externalId,
            name: candidate.name,
            phone: candidate.phone,
            email: candidate.email || null
          }))
        });

        await tx.auditLog.create({
          data: {
            userId: res.locals.auth.userId,
            batchId: createdBatch.id,
            action: "BATCH_CREATED"
          }
        });

        return createdBatch;
      });

      return res.status(201).json({
        message: "Batch uploaded successfully",
        batch
      });
    } catch (error) {
      console.error("Batch upload failed:", error);
      return res.status(400).json({
        message: "Batch upload failed. Check the CSV format and candidate data."
      });
    }
  }
);

export default router;
