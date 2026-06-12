import type { Request, Response } from "express";
import { loginUser, registerUser } from "../services/auth.service";

export const register = async (req: Request, res: Response) => {
  const result = await registerUser(req.body);

  return res.status(201).json({
    success: true,
    data: result,
  });
};

export const login = async (req: Request, res: Response) => {
  const result = await loginUser(req.body);

  return res.status(200).json({
    success: true,
    data: result,
  });
};
