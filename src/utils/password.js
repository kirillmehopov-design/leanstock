import bcrypt from 'bcryptjs';

export async function hashPassword(password) {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(hash, password) {
  return bcrypt.compare(password, hash);
}
