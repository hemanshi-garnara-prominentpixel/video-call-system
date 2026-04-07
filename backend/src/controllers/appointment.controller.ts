import { Request, Response } from "express";
import { appointmentService } from "../services/appointment.service";

export class AppointmentController {
  async getAppointment(req: Request, res: Response) {
    try {
      const appointmentId = req.params.appointmentId as string;

      if (!appointmentId) {
        return res.status(400).json({ error: "appointmentId is required" });
      }

      const appointment = await appointmentService.getAppointmentById(appointmentId);

      if (!appointment) {
        return res.status(404).json({ error: "Appointment not found" });
      }

      return res.status(200).json(appointment);
    } catch (error: any) {
      console.error("Error in getAppointment controller:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  }

  async completeAppointment(req: Request, res: Response) {
    try {
      const appointmentId = req.params.appointmentId as string;
      
      const success = await appointmentService.updateAppointmentStatus(appointmentId, "COMPLETED");
      
      if (!success) {
        return res.status(500).json({ success: false, error: "Failed to update status" });
      }

      return res.status(200).json({ success: true, message: "Appointment marked as completed" });
    } catch (error) {
      console.error("Error in completeAppointment controller:", error);
      return res.status(500).json({ success: false, error: "Internal server error" });
    }
  }
}

export const appointmentController = new AppointmentController();
