import bcrypt from "bcryptjs";
import type { Messages } from "../i18n/messages.js";

// Olemasolevad hashid on loodud PHP `password_hash()`-iga, mis kasutab
// vaikimisi bcrypt prefiksit "$2y$". bcryptjs ootab "$2a$" või "$2b$" —
// vormingud on algoritmiliselt identsed, ainult prefiks erineb, seega
// asendame selle enne võrdlemist.
function normalizeHash(hash: string): string {
  return hash.startsWith("$2y$") ? "$2b$" + hash.slice(4) : hash;
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, normalizeHash(hash));
}

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 10);
}

// Sama parooli-poliitika, mis admin_add_user.php / reset_password.php:
// vähemalt 12 tähemärki, vähemalt üks number ja üks sümbol.
/**
 * Tagastab veateate kasutaja keeles või `null`, kui parool sobib.
 *
 * Sõnastik antakse parameetrina, mitte ei võeta globaalselt: parooli
 * kontrollitakse ka registreerumisel, kus kasutajat veel polegi, seega ainus
 * keeleallikas on päring.
 */
export function validatePasswordPolicy(password: string, m: Messages): string | null {
  if (password.length < 12) return m.password.tooShort;
  if (!/\d/.test(password)) return m.password.needsDigit;
  if (!/[\W_]/.test(password)) return m.password.needsSymbol;
  return null;
}
