import { Router } from "express";
import authRoutes from "./auth.routes";
import dropRoutes from "./drop.routes";
import healthRoutes from "./health.routes";
import reservationRoutes from "./reservation.routes";

const router = Router();

router.use("/health", healthRoutes);
router.use("/auth", authRoutes);
router.use("/drops", dropRoutes);
router.use("/", reservationRoutes);

export default router;
