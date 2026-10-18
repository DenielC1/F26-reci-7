export type Color = 'G' | 'Y' | 'B';

const WORD = /^[A-Z]{5}$/;

/**
 * Scores a Wordle guess against the secret word.
 *
 * Preconditions: `secret` and `guess` are both exactly five uppercase letters
 * A-Z. Otherwise throws a RangeError.
 *
 * Returns five colors, one per position of `guess`:
 *   - 'G' (green):  guess[i] === secret[i].
 *   - 'Y' (yellow): guess[i] occurs elsewhere in the secret, and that
 *                   occurrence has not already been used by a green or by an
 *                   earlier yellow (yellows are assigned left to right).
 *   - 'B' (black):  otherwise.
 *
 * Example: matchGuess('APPLE', 'ALLEY') = G Y B Y B
 *   The second L is black because APPLE has only one L, already used by the
 *   first L's yellow.
 */
export function matchGuess(secret: string, guess: string): Color[] {
  if (!WORD.test(secret) || !WORD.test(guess)) {
    throw new RangeError('secret and guess must be five uppercase letters');
  }
  const result: Color[] = ['B', 'B', 'B', 'B', 'B'];
  const unused = new Map<string, number>();

  for (let i = 0; i < 5; i++) {
    if (guess[i] === secret[i]) result[i] = 'G';
    else unused.set(secret[i], (unused.get(secret[i]) ?? 0) + 1);
  }
  for (let i = 0; i < 5; i++) {
    if (result[i] === 'G') continue;
    const n = unused.get(guess[i]) ?? 0;
    if (n > 0) {
      result[i] = 'Y';
      unused.set(guess[i], n - 1);
    }
  }
  return result;
}
