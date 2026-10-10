import bcrypt from "bcryptjs";

export async function verifyPassword(password: string): Promise<boolean> {
  const hash = process.env.APP_PASSWORD_HASH;
  if (!hash) {
    throw new Error("APP_PASSWORD_HASH manquant.");
  }
  return bcrypt.compare(password, hash);
}
