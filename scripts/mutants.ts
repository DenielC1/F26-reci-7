// Mutation runner: checks whether your properties can tell the real
// implementation apart from known-buggy ones.
//
//   npm run mutants:wordle
//   npm run mutants:intervals
//
// 1. Runs test/<subject>.test.ts against the correct implementation. Every
//    test must pass; a failure here is a false alarm (a wrong property or a
//    generator that violates the preconditions).
// 2. Runs the same tests against each mutant (MUTANT=<subject>:<name>). A
//    mutant is "killed" if at least one test fails.
//
// Both steps run 5 times with fresh random seeds (change it with
// `npm run mutants:wordle -- --repeat 10`). A test that fails on the correct
// implementation in any run is a false alarm, and a mutant killed in only some
// runs is reported as "flaky": your generator only sometimes reaches the bug.
import { spawn } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { cpus, tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const SUBJECTS = ['wordle', 'intervals'];

const args = process.argv.slice(2);
const subject = args.find(a => !a.startsWith('--'));
const repeatIdx = args.indexOf('--repeat');
const repeat = repeatIdx >= 0 ? Number(args[repeatIdx + 1]) : 5;

if (!subject || !SUBJECTS.includes(subject) || !(repeat >= 1)) {
  console.error(`usage: ${SUBJECTS.map(s => `npm run mutants:${s}`).join('  or  ')}`);
  process.exit(2);
}

const root = resolve(import.meta.dirname, '..');
const testFile = join('test', `${subject}.test.ts`);
const color = process.stdout.isTTY;
const paint = (code: number) => (s: string) => (color ? `\x1b[${code}m${s}\x1b[0m` : s);
const red = paint(31), green = paint(32), yellow = paint(33), dim = paint(2), bold = paint(1);

interface Failure {
  title: string;
  details: string[]; // e.g. the counterexample and the assertion message
}

interface Run {
  ok: boolean; // vitest produced a report
  passed: string[];
  failed: Failure[];
  error?: string;
}

// Pulls the useful lines out of a failure message. fast-check failures yield
// "Counterexample: ..." plus the assertion message (fast-check reports it as
// "Got ...", see runner-setup.ts); anything else yields its first line.
function summarize(message: string): string[] {
  const lines = message.split('\n');
  const counterexample = lines.find(l => l.startsWith('Counterexample:'));
  const got = lines.find(l => l.startsWith('Got '));
  if (counterexample) return got ? [counterexample, got.slice(4)] : [counterexample];
  return [lines[0]];
}

const scratch = mkdtempSync(join(tmpdir(), 'pbt-mutants-'));
let runId = 0;

function runTests(mutant?: string): Promise<Run> {
  const out = join(scratch, `run-${runId++}.json`);
  const env: NodeJS.ProcessEnv = { ...process.env, FORCE_COLOR: '0', PBT_RUNNER: '1' };
  if (mutant) env.MUTANT = `${subject}:${mutant}`;
  else delete env.MUTANT;
  const vitest = join(root, 'node_modules', '.bin', 'vitest');
  return new Promise(done => {
    const child = spawn(vitest, ['run', testFile, '--reporter=json', `--outputFile=${out}`], {
      cwd: root, env, stdio: ['ignore', 'ignore', 'pipe'], shell: process.platform === 'win32',
    });
    let stderr = '';
    child.stderr.on('data', d => (stderr += d));
    const timer = setTimeout(() => child.kill('SIGKILL'), 120_000);
    child.on('close', () => {
      clearTimeout(timer);
      if (!existsSync(out)) {
        done({ ok: false, passed: [], failed: [], error: stderr.trim() || 'timed out or crashed' });
        return;
      }
      const report = JSON.parse(readFileSync(out, 'utf8'));
      const passed: string[] = [], failed: Failure[] = [];
      const suiteErrors: string[] = [];
      for (const file of report.testResults ?? []) {
        if (file.status === 'failed' && (file.assertionResults ?? []).length === 0) {
          suiteErrors.push(file.message || 'test file failed to load');
        }
        for (const t of file.assertionResults ?? []) {
          if (t.status === 'passed') passed.push(t.title);
          else if (t.status === 'failed') {
            failed.push({ title: t.title, details: summarize(t.failureMessages?.[0] ?? '') });
          }
        }
      }
      if (suiteErrors.length > 0) done({ ok: false, passed, failed, error: suiteErrors.join('\n') });
      else done({ ok: true, passed, failed });
    });
  });
}

async function pool<T, R>(items: T[], limit: number, fn: (t: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i]);
    }
  });
  await Promise.all(workers);
  return results;
}

const printDetails = (f: Failure) => {
  for (const line of f.details) console.log(dim(`      ${line}`));
};

async function main(): Promise<number> {
  // Tests must reach the code through src/<subject>/index.ts so mutants can be
  // swapped in. Importing the implementation file directly would silently test
  // the correct code every time.
  const source = readFileSync(join(root, testFile), 'utf8');
  const sneaky = [...source.matchAll(/from\s+['"]([^'"]*src\/[^'"]+)['"]/g)]
    .map(m => m[1])
    .filter(p => !new RegExp(`src/${subject}(/index(\\.ts)?)?$`).test(p));
  if (sneaky.length > 0) {
    console.log(red(`${testFile} imports ${sneaky.join(', ')}.`));
    console.log(`Import from '../src/${subject}' instead so the mutants can be swapped in.`);
    return 1;
  }

  const concurrency = Math.max(1, Math.min(6, Math.floor(cpus().length / 2)));

  // Step 1: the correct implementation must pass everything, every time.
  console.log(bold(`\nChecking ${testFile} against the correct implementation (${repeat} runs)...`));
  const baselines = await pool(Array.from({ length: repeat }, () => undefined), concurrency, () => runTests());
  const broken = baselines.find(r => !r.ok);
  if (broken) {
    console.log(red('Could not run the tests:\n') + broken.error);
    return 1;
  }
  const falseAlarms = [...new Set(baselines.flatMap(r => r.failed.map(f => f.title)))];
  if (falseAlarms.length > 0) {
    console.log(red(`\n${falseAlarms.length} test(s) FAIL on the correct implementation (false alarms):`));
    for (const title of falseAlarms) {
      const failures = baselines.flatMap(r => r.failed.filter(f => f.title === title));
      console.log(red(`  ✘ ${title}`) + dim(`  (failed in ${failures.length}/${repeat} runs)`));
      printDetails(failures[0]);
    }
    console.log('\nFix these first: either the property is not what the specification says,');
    console.log('or the generator produces inputs that break the preconditions.');
    return 1;
  }
  if (baselines[0].passed.length === 0) {
    console.log(yellow('No passing tests yet. Write a property first!'));
    return 1;
  }
  console.log(green(`  ✔ all ${baselines[0].passed.length} test(s) pass`));

  // Step 2: every mutant, `repeat` times.
  const { mutants } = await import(`../src/${subject}/mutants.ts`);
  const names = Object.keys(mutants);
  console.log(bold(`\nRunning against ${names.length} mutants (${repeat} runs each)...\n`));

  const jobs = names.flatMap(name => Array.from({ length: repeat }, () => name));
  const runs = await pool(jobs, concurrency, name => runTests(name));

  let killed = 0;
  const width = Math.max(...names.map(n => n.length));
  for (const name of names) {
    const mine = runs.filter((_, i) => jobs[i] === name);
    const kills = mine.filter(r => !r.ok || r.failed.length > 0).length;
    const failures = mine.flatMap(r => r.failed);
    const killers = [...new Set(failures.map(f => f.title))];
    const label = name.padEnd(width);
    if (kills === repeat) {
      killed++;
      const by = killers.length > 0 ? killers.join('; ') : 'the test file crashed';
      console.log(green(`  ✔ ${label}  killed`) + dim(`  by: ${by}`));
    } else if (kills > 0) {
      console.log(yellow(`  ~ ${label}  flaky: killed in ${kills}/${repeat} runs`) + dim(`  by: ${killers.join('; ')}`));
    } else {
      console.log(red(`  ✘ ${label}  SURVIVED`));
    }
    if (failures.length > 0) printDetails(failures[0]);
  }
  const pct = Math.round((100 * killed) / names.length);
  console.log(bold(`\nMutation score: ${killed}/${names.length} killed (${pct}%)`));
  return 0;
}

try {
  process.exitCode = await main();
} finally {
  rmSync(scratch, { recursive: true, force: true });
}
