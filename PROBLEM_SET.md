# Problem Set: Property-Based Testing

**Due:** Friday, October 23, 11:59 PM · **Work:** individually ·
**Expected time:** 2–3 hours · **Graded:** for completion

You'll finish the two test suites you started in recitation, then answer a
few reflection questions.

See the [recitation README](README.md) for setup, the commands, and a
fast-check cheat sheet.

## What counts as complete

1. `test/wordle.test.ts` and `test/intervals.test.ts` are submitted and
   **pass on the correct implementation** (`npm run test:wordle`,
   `npm run test:intervals`).
2. Each task's **required properties** (below) are present and labeled
   with their pattern.
3. The questions in `REFLECTION.md` are answered.

Mutation scores are not graded. They're there so you can see how good your
properties are.

## Ground rules

1. **Aim to kill every public mutant reliably.** The mutants runner runs
   everything 5 times with fresh random seeds. A mutant killed in only some
   runs is flaky, which means your generator only sometimes reaches the bug.
2. **More mutants after the deadline.** `src/*/mutants.ts` contains only
   some of the mutants. After the deadline you'll get extra mutants to check
   yourself (see below). They're bugs of the same kind, and properties that
   follow the specification will catch them. Properties tuned to the public
   mutants won't.
3. **No re-implementations.** Don't write your own complete `matchGuess` or
   `mergeIntervals` to compare against. Small helper oracles are fine and
   encouraged, like "is point *p* covered by this list?" or "how many times
   does letter *L* appear?".
4. **Import only from `../src/<subject>`.** The runner rejects anything else.
5. **Label every property** on the line above its `it(`, in exactly this
   format: `// Pattern:`, one of the five pattern names, then the property in
   English.

   ```ts
   // Pattern: invariant. The output is sorted and has no overlapping intervals.
   it('returns sorted, non-overlapping intervals', () => {
   ```

   The five names are `invariant`, `algebraic`, `metamorphic`,
   `differential`, and `conditional`.

Example tests (`expect(f(x)).toBe(y)`) are allowed alongside properties, but
they don't count toward the required properties.

## Task 1: Wordle, `test/wordle.test.ts`

Finish what we started in recitation.

- Try to kill every public mutant reliably. One of them survived Part 1.
- At least **five** properties, including at least one invariant, one
  conditional property, and one metamorphic property.
- At least one property must use a **targeted generator**: a generator that
  constructs inputs satisfying the property's condition, rather than
  generating arbitrary inputs and discarding the ones that don't qualify.
  Using `.filter` or `fc.pre` here doesn't count.

Hint: in recitation we found that a small alphabet exposes duplicate-letter
bugs. Is there a kind of bug that a small alphabet would *hide*?

## Task 2: Merging intervals, `test/intervals.test.ts`

Finish your group's work from recitation, **on your own**. You may start from
your group's code. Note your group members' names in `REFLECTION.md`.

- Try to kill every public mutant reliably.
- At least **one property of each of the five patterns**.
- Your generator must produce valid inputs by construction (no `.filter` or
  `fc.pre` to fix up invalid intervals).
- The conditional property ("already-disjoint input") must use a targeted
  generator.

## Task 3: Reflection, `REFLECTION.md`

Answer the questions in [REFLECTION.md](REFLECTION.md). Short, specific
answers beat long ones. Paste real output where asked.

## Submitting

Commit and push `test/wordle.test.ts`, `test/intervals.test.ts`, and
`REFLECTION.md`. Before you do, run:

```bash
npm run test:wordle
npm run test:intervals
```

Both must pass. Then check your mutation scores:

```bash
npm run mutants:wordle
npm run mutants:intervals
```

## After the deadline: self-check

We'll release a folder called `extra-mutants/`. Put it at the top of your
repo and run:

```bash
npm run self-check
```

It runs your properties against the public and extra mutants together,
without changing your files. There's nothing to submit. It's just for you
to see how your properties hold up against bugs you didn't see.
