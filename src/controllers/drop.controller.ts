import type { Request, Response } from "express";
import { createDrop } from "../services/drop.service";

export const createDropController = async (req: Request, res: Response) => {
  const drop = await createDrop(req.body);

  return res.status(201).json({
    success: true,
    data: drop,
  });
};
