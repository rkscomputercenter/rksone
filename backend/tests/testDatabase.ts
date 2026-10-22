// Integration tests run the real Express app against a throwaway local database.
// Override with TEST_DATABASE_URL; the database name must end in "_test" (checked in globalSetup).
export const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ?? 'postgresql://rks_local:rks_local_dev@localhost:5432/rks_test?schema=public';
