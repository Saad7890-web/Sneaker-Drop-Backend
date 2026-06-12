import { Prisma } from "@prisma/client";
import prisma from "../config/prisma";
import { AppError } from "../utils/AppError";
import { signAccessToken } from "../utils/jwt";
import { hashPassword } from "../utils/password";
import type { LoginInput, RegisterInput } from "../validators/auth.validators";

type AuthUser = {
  id: string;
  username: string;
  email: string;
};

type AuthResult = {
  user: AuthUser;
  accessToken: string;
};

const toAuthUser = (user: AuthUser): AuthUser => ({
  id: user.id,
  username: user.username,
  email: user.email,
});

export const registerUser = async (
  input: RegisterInput,
): Promise<AuthResult> => {
  const passwordHash = await hashPassword(input.password);

  try {
    const user = await prisma.user.create({
      data: {
        username: input.username,
        email: input.email,
      },
      select: {
        id: true,
        username: true,
        email: true,
      },
    });

    const accessToken = signAccessToken({
      sub: user.id,
      username: user.username,
      email: user.email,
    });

    return {
      user: toAuthUser(user),
      accessToken,
    };
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new AppError(
        "Unable to create account",
        409,
        "ACCOUNT_CREATION_FAILED",
      );
    }

    throw error;
  }
};

export const loginUser = async (input: LoginInput): Promise<AuthResult> => {
  const user = await prisma.user.findUnique({
    where: {
      email: input.email,
    },
  });

  if (!user) {
    throw new AppError("Invalid credentials", 401, "INVALID_CREDENTIALS");
  }

  throw new AppError(
    "Authentication is not fully wired yet",
    501,
    "AUTH_NOT_READY",
  );
};
