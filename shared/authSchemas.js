import { z } from 'zod';

const email = z
  .string()
  .trim()
  .max(254, 'validation.email')
  .email('validation.email')
  .transform((value) => value.toLowerCase());
const password = z
  .string()
  .max(256, 'validation.passwordLength')
  .refine(
    (value) => [...value].length >= 15 && [...value].length <= 128,
    'validation.passwordLength',
  );

export const registerSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, 'validation.name')
      .max(100, 'validation.name')
      .refine(
        (value) =>
          [...value].every(
            (character) => character.codePointAt(0) >= 32 && character.codePointAt(0) !== 127,
          ),
        'validation.name',
      ),
    email,
    password,
    confirmPassword: z.string(),
  })
  .strict()
  .refine((value) => value.password === value.confirmPassword, {
    message: 'validation.passwordMatch',
    path: ['confirmPassword'],
  });

export const loginSchema = z
  .object({
    email,
    password: z
      .string()
      .min(1, 'validation.passwordRequired')
      .max(256, 'validation.passwordLength'),
  })
  .strict();

export function fieldErrors(error) {
  return Object.fromEntries(
    error.issues.map((issue) => [
      issue.path[0] ?? '_form',
      issue.message.startsWith('validation.') ? issue.message : 'validation.invalid',
    ]),
  );
}
