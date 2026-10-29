import { hash, verify, Algorithm } from '@node-rs/argon2';

const options = { algorithm: Algorithm.Argon2id, memoryCost: 19456, timeCost: 2, parallelism: 1 };
let dummyHash;
export const hashPassword = (password) => hash(password, options);

export async function verifyPassword(passwordHash, password) {
  // Unknown users still pay the same password-verification cost as existing users.
  dummyHash ??= hashPassword('A non-secret dummy password for timing parity');
  return verify(passwordHash || (await dummyHash), password);
}
