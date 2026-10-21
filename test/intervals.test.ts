import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { mergeIntervals, type Interval } from '../src/intervals';

// Recitation Part 2 (groups) and problem set Task 2.
// Read the spec in src/intervals/mergeIntervals.ts, then check your progress
// with `npm run mutants:intervals`.
//
// Label every property with its pattern, on the line above its `it(`:
//   // Pattern: invariant. The output is sorted.
// (invariant, algebraic, metamorphic, differential, or conditional)

const endpoint = fc.integer({ min: -20, max: 20 });
const interval: fc.Arbitrary<Interval> = fc.tuple(endpoint, endpoint)
  .map(([a, b]): Interval => [Math.min(a, b), Math.max(a, b)]);
const intervalList = fc.array(interval, { maxLength: 20 });

// Positive gaps guarantee already-disjoint intervals without filtering.
const disjointList = fc.array(fc.tuple(fc.nat(5), fc.integer({ min: 1, max: 5 })))
  .map(steps => {
    let start = -20;
    return steps.map(([width, gap]): Interval => {
      const next: Interval = [start, start + width];
      start += width + gap;
      return next;
    });
  });

describe('mergeIntervals', () => {
  // Pattern: invariant. Output is sorted and disjoint, covers input intervals, and leaves input unchanged.
  it('returns sorted disjoint intervals without changing input', () => {
    fc.assert(fc.property(intervalList, xs => {
      const before = xs.map(([a, b]): Interval => [a, b]);
      const out = mergeIntervals(xs);
      expect(xs).toEqual(before);
      out.forEach(([start, end], i) => {
        expect(start).toBeLessThanOrEqual(end);
        if (i > 0) expect(out[i - 1][1]).toBeLessThan(start);
      });
      for (const [start, end] of before) {
        expect(out.some(([a, b]) => a <= start && end <= b)).toBe(true);
      }
    }));
  });

  // Pattern: differential. A simple point-coverage oracle agrees before and after merging.
  it('preserves coverage, including gaps between integer endpoints', () => {
    const covers = (xs: Interval[], p: number) => xs.some(([a, b]) => a <= p && p <= b);
    fc.assert(fc.property(intervalList, xs => {
      const before = xs.map(([a, b]): Interval => [a, b]);
      const out = mergeIntervals(xs);
      for (let p = -20; p <= 20; p += 0.5) {
        expect(covers(out, p)).toBe(covers(before, p));
      }
    }));
  });

  // Pattern: metamorphic. Reversing the input order preserves the result.
  it('is independent of input order', () => {
    fc.assert(fc.property(intervalList, xs => {
      const reversed = xs.map(([a, b]): Interval => [a, b]).reverse();
      expect(mergeIntervals(xs)).toEqual(mergeIntervals(reversed));
    }));
  });

  // Pattern: algebraic. Merging twice has the same effect as merging once (idempotence).
  it('is idempotent', () => {
    fc.assert(fc.property(intervalList, xs => {
      const once = mergeIntervals(xs);
      const copy = once.map(([a, b]): Interval => [a, b]);
      expect(mergeIntervals(copy)).toEqual(once);
    }));
  });

  // Pattern: conditional. Already sorted disjoint input is returned unchanged.
  it('preserves already-disjoint intervals', () => {
    fc.assert(fc.property(disjointList, xs => {
      const before = xs.map(([a, b]): Interval => [a, b]);
      expect(mergeIntervals(xs)).toEqual(before);
    }));
  });
});
