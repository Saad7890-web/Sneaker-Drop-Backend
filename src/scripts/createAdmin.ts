import "dotenv/config";
import prisma from "../config/prisma";
import { hashPassword } from "../utils/password";

async function main() {
  const username = process.env.ADMIN_USERNAME;
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;

  if (!username || !email || !password) {
    throw new Error(
      "ADMIN_USERNAME, ADMIN_EMAIL, and ADMIN_PASSWORD are required",
    );
  }

  const passwordHash = await hashPassword(password);

  await prisma.user.upsert({
    where: { email },
    update: {
      username,
      passwordHash,
      role: "ADMIN",
    },
    create: {
      username,
      email,
      passwordHash,
      role: "ADMIN",
    },
  });

  console.log(`Admin user ready: ${email}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
