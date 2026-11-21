import { Router } from "express";
import authRouter from "./auth";
import batchRouter from "./batch";
import approvalRouter from "./approval";
import certificateRouter from "./certificate";

const router = Router();

router.use("/auth", authRouter);
router.use("/batches", batchRouter);
router.use("/approvals", approvalRouter);
router.use("/certificates", certificateRouter);

export default router;