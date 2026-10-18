// Picks which implementation the tests see. Normally that's the correct one;
// `npm run mutants` sets MUTANT=<subject>:<name> to swap in a buggy variant.
// You never need to touch this file.
export function select<T>(subject: string, correct: T, mutants: Record<string, T>): T {
  const requested = process.env.MUTANT;
  if (!requested) return correct;
  const [s, name] = requested.split(':');
  if (s !== subject) return correct;
  const mutant = mutants[name];
  if (mutant === undefined) throw new Error(`Unknown mutant "${requested}"`);
  return mutant;
}
