import { hash, verify } from "@node-rs/argon2";

const opts = {
  memoryCost: 19456,
  timeCost: 2,
  outputLen: 32,
  parallelism: 1,
};

export async function hashPassword(plain: string) {
  return hash(plain, opts);
}

export async function verifyPassword(hashStr: string, plain: string) {
  return verify(hashStr, plain, opts);
}
