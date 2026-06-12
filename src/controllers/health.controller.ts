import type { Request, Response } from "express";
import { env } from "../config/env";

export const getHealth = (_req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    data: {
      status: "ok",
      service: "sneaker-drop-backend",
      environment: env.NODE_ENV,
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor(process.uptime()),
    },
  });
};
