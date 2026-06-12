import prisma from "../config/prisma";
import { Prisma } from "../generated/prisma/client";
import { AppError } from "../utils/AppError";
import { signAccessToken } from "../utils/jwt";
import { comparePassword, hashPassword } from "../utils/password";
import type { LoginInput, RegisterInput } from "../validators/auth.validators";

type AuthUser = {
  id: string;
  username: string;
  email: string;
  role: "USER" | "ADMIN";
};

type AuthResult = {
  user: AuthUser;
  accessToken: string;
};

export const registerUser = async (
  input: RegisterInput,
): Promise<AuthResult> => {
  const passwordHash = await hashPassword(input.password);

  try {
    const user = await prisma.user.create({
      data: {
        username: input.username,
        email: input.email,
        passwordHash,
        role: "USER",
      },
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
      },
    });

    const accessToken = signAccessToken({
      sub: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
    });

    return {
      user,
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

  const passwordMatches = await comparePassword(
    input.password,
    user.passwordHash,
  );

  if (!passwordMatches) {
    throw new AppError("Invalid credentials", 401, "INVALID_CREDENTIALS");
  }

  const accessToken = signAccessToken({
    sub: user.id,
    username: user.username,
    email: user.email,
    role: user.role,
  });

  return {
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
    },
    accessToken,
  };
};
