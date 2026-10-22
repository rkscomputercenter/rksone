import { execSync } from 'child_process';
import { TEST_DATABASE_URL } from './testDatabase';

/** Recreates the test database schema from schema.prisma once per run. */
export default function setup(): void {
  const dbName = new URL(TEST_DATABASE_URL).pathname.replace(/^\//, '');
  if (!dbName.endsWith('_test')) {
    throw new Error(`Refusing to reset "${dbName}": the test database name must end in "_test".`);
  }
  execSync('npx prisma db push --force-reset --skip-generate', {
    stdio: 'pipe',
    env: { ...process.env, DATABASE_URL: TEST_DATABASE_URL },
  });
}
