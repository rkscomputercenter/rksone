import { defineConfig } from 'vitest/config';
import { TEST_DATABASE_URL } from './tests/testDatabase';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    globalSetup: ['tests/globalSetup.ts'],
    fileParallelism: false, // all files share one database
    testTimeout: 30_000,
    hookTimeout: 120_000,
    env: {
      NODE_ENV: 'test',
      TZ: 'Asia/Kolkata',
      DATABASE_URL: TEST_DATABASE_URL,
      JWT_SECRET: 'test-secret-not-used-anywhere-else',
      ALLOWED_ORIGINS: 'https://rksone.qenbel.site, https://app.rksone.qenbel.site/',
    },
  },
});
