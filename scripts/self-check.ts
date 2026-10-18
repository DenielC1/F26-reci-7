// Self-check against the extra mutants released after the deadline.
//
//   npm run self-check
//
// Put the released `extra-mutants/` folder (wordle.ts, intervals.ts) at the
// top of your repo first. This copies your repo to a temporary folder, swaps
// in the extra mutants, and runs the mutation runner there, so your own src/
// is never changed. Nothing to submit; it's just for you.
import { spawnSync } from 'node:child_process';
import { copyFileSync, cpSync, existsSync, mkdtempSync, rmSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const SUBJECTS = ['wordle', 'intervals'];
const root = resolve(import.meta.dirname, '..');
const extra = join(root, 'extra-mutants');

if (!existsSync(extra)) {
  console.log("The extra mutants haven't been released yet.");
  console.log('After the deadline, put the extra-mutants/ folder at the top of your repo and run this again.');
  process.exit(0);
}

for (const subject of SUBJECTS) {
  const mutantsFile = join(extra, `${subject}.ts`);
  if (!existsSync(mutantsFile)) continue;

  const work = mkdtempSync(join(tmpdir(), `pbt-self-check-${subject}-`));
  try {
    cpSync(root, work, {
      recursive: true,
      filter: src => !/[\\/](node_modules|extra-mutants|\.git)([\\/]|$)/.test(src.slice(root.length)),
    });
    symlinkSync(join(root, 'node_modules'), join(work, 'node_modules'), 'junction');
    copyFileSync(mutantsFile, join(work, 'src', subject, 'mutants.ts'));

    console.log(`\n=============== ${subject}: public + extra mutants ===============`);
    spawnSync(join(work, 'node_modules', '.bin', 'tsx'), ['scripts/mutants.ts', subject], {
      cwd: work, stdio: 'inherit', shell: process.platform === 'win32',
    });
  } finally {
    rmSync(work, { recursive: true, force: true });
  }
}
