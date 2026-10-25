import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('production'),
  PORT: z.string().transform(Number).default('5000'),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  JWT_SECRET: z.string().min(16, 'JWT_SECRET must be at least 16 characters'),
  JWT_EXPIRES_IN: z.string().default('8h'),
  TZ: z.string().default('Asia/Kolkata'),
  LOG_RETENTION_DAYS: z.string().transform(Number).default('60'),
  ALLOWED_ORIGINS: z.string().optional().default(''),
  // Number of reverse proxies in front of the app (Render = 1; Render behind Cloudflare = 2)
  TRUST_PROXY_HOPS: z.string().transform(Number).default('1'),
  // Render's free tier sleeps after 15 idle minutes. 'business-hours' pings itself Mon-Sat 06:00-23:59 IST;
  // 'always' pings every 10 minutes around the clock (about 744 of the free tier's 750 hours/month).
  // Not needed on a paid always-on instance.
  KEEP_AWAKE: z.enum(['business-hours', 'always']).default('business-hours'),
  // Where verified users download the Android APK: an absolute URL (e.g. a GitHub Release asset),
  // or a path on the web app's domain. APKs are not in git, so neither Vercel nor Render can serve one.
  APK_URL: z.string().optional().default('/download'),
});

export type Env = z.infer<typeof envSchema>;

function loadEnv(): Env {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    console.error('❌ Invalid environment configuration:');
    console.error(result.error.format());
    process.exit(1);
  }
  return result.data;
}

export const env = loadEnv();
