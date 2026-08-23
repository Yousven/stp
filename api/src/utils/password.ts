import bcrypt from "bcryptjs";

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
export function validatePasswordPolicy(password: string): string | null {
  if (password.length < 12) return "Parool peab olema vähemalt 12 tähemärki pikk.";
  if (!/\d/.test(password)) return "Parool peab sisaldama vähemalt ühte numbrit.";
  if (!/[\W_]/.test(password)) return "Parool peab sisaldama vähemalt ühte sümbolit.";
  return null;
}
