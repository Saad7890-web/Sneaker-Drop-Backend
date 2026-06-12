import type { Request, Response } from "express";
import {
  getDropDetails,
  listActiveDrops,
} from "../services/drop.query.service";

export const listActiveDropsController = async (
  req: Request,
  res: Response,
) => {
  const page = Number(req.query.page ?? 1);
  const limit = Number(req.query.limit ?? 20);

  const result = await listActiveDrops(page, limit);

  return res.status(200).json({
    success: true,
    data: result,
  });
};

export const getDropController = async (req: Request, res: Response) => {
  const { dropId } = req.params;
  if (!dropId || Array.isArray(dropId)) {
    return res.status(400).json({
      success: false,
      message: "Invalid dropId",
    });
  }
  const result = await getDropDetails(dropId);

  return res.status(200).json({
    success: true,
    data: result,
  });
};
