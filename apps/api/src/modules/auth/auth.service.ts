import { createHash, randomBytes, scryptSync, timingSafeEqual } from "crypto";
import { prisma } from "../../lib/prisma.js";
import type { RegisterInput, LoginInput } from "./auth.schema.js";

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  const hashBuffer = Buffer.from(hash, "hex");
  const derived = scryptSync(password, salt, 64);
  return timingSafeEqual(hashBuffer, derived);
}

export async function registerUser(input: RegisterInput) {
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) {
    throw new Error("E-mail já cadastrado");
  }

  const passwordHash = hashPassword(input.password);

  const user = await prisma.user.create({
    data: {
      name: input.name,
      email: input.email,
      passwordHash,
    },
    select: { id: true, name: true, email: true, role: true },
  });

  return user;
}

export async function loginUser(input: LoginInput) {
  const user = await prisma.user.findUnique({ where: { email: input.email } });

  if (!user || !user.isActive) {
    throw new Error("Credenciais inválidas");
  }

  const valid = verifyPassword(input.password, user.passwordHash);
  if (!valid) {
    throw new Error("Credenciais inválidas");
  }

  return { id: user.id, name: user.name, email: user.email, role: user.role };
}

export async function getUserById(id: string) {
  return prisma.user.findUnique({
    where: { id },
    select: { id: true, name: true, email: true, role: true, createdAt: true },
  });
}
