import { Router } from "express";
import { appointmentController } from "../controllers/appointment.controller";

const router = Router();

router.get("/:appointmentId", appointmentController.getAppointment);
router.post("/:appointmentId/complete", appointmentController.completeAppointment);

export default router;
