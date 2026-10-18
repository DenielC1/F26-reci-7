// Loaded by vitest (see vitest.config.ts). When the mutation runner is
// running the tests, put the assertion message into fast-check's report so
// the runner can show it. Normal `npm run test:*` runs are unaffected.
import fc from 'fast-check';

if (process.env.PBT_RUNNER) fc.configureGlobal({ includeErrorInReport: true });
