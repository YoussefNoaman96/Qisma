import { z } from 'zod';

export function readConfig(env = process.env) {
  const schema = z.object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().min(1).max(65535).default(3001),
    APP_ORIGIN: z.url(),
    MONGODB_URI: z
      .string()
      .min(1)
      .regex(/^mongodb(\+srv)?:\/\//u),
    JWT_SECRET: z
      .string()
      .min(32)
      .refine((value) => !value.startsWith('replace-with-')),
    TRUST_PROXY: z.coerce.number().int().min(0).max(1).default(0),
  });
  const result = schema.safeParse(env);
  if (!result.success) {
    throw new Error(
      `Invalid server configuration: ${[...new Set(result.error.issues.map((issue) => issue.path[0]))].join(', ')}. Check server/.env.`,
    );
  }
  const values = result.data;
  const origin = new URL(values.APP_ORIGIN);
  if (values.NODE_ENV === 'production' && origin.protocol !== 'https:') {
    throw new Error('Production APP_ORIGIN must use HTTPS.');
  }
  return {
    nodeEnv: values.NODE_ENV,
    port: values.PORT,
    appOrigin: origin.origin,
    mongoUri: values.MONGODB_URI,
    jwtSecret: values.JWT_SECRET,
    trustProxy: values.TRUST_PROXY,
    secureCookies: values.NODE_ENV === 'production',
  };
}
