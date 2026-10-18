// Buggy variants of mergeIntervals. Your properties should pass on the real
// implementation and fail on every one of these. Write your properties from
// the *specification*, not from this file: after the deadline you'll get
// more mutants to try your properties against.
import type { Interval } from './mergeIntervals';

type MergeIntervals = (intervals: readonly Interval[]) => Interval[];

// The correct merge loop, parameterized by how the input is ordered and by
// when two intervals count as "overlapping".
const mergeWith =
  (order: (xs: Interval[]) => Interval[], overlaps: (lastEnd: number, start: number) => boolean) =>
  (intervals: readonly Interval[]): Interval[] => {
    const merged: Interval[] = [];
    for (const [start, end] of order([...intervals])) {
      const last = merged[merged.length - 1];
      if (last && overlaps(last[1], start)) last[1] = Math.max(last[1], end);
      else merged.push([start, end]);
    }
    return merged;
  };

const byStart = (xs: Interval[]) => xs.sort((a, b) => a[0] - b[0]);
const overlapsOrTouches = (lastEnd: number, start: number) => start <= lastEnd;

export const mutants: Record<string, MergeIntervals> = {
  // Assumes the caller already sorted the input.
  assumesSorted: mergeWith(xs => xs, overlapsOrTouches),

  // Array.prototype.sort() with no comparator compares elements as strings,
  // so [10, 12] sorts before [9, 9] and [-1, 0] before [-5, 0].
  lexicographicSort: mergeWith(xs => xs.sort(), overlapsOrTouches),

  // Intervals that only touch ([1, 3] and [3, 5]) are left separate.
  touchingNotMerged: mergeWith(byStart, (lastEnd, start) => start < lastEnd),

  // Treats [1, 2] and [3, 4] as touching ("there's no integer between them").
  mergesIntegerNeighbors: mergeWith(byStart, (lastEnd, start) => start <= lastEnd + 1),

  // On overlap, takes the new interval's end even if it is smaller,
  // so [1, 10] + [2, 3] becomes [1, 3].
  keepsLastEnd: intervals => {
    const merged: Interval[] = [];
    for (const [start, end] of byStart([...intervals])) {
      const last = merged[merged.length - 1];
      if (last && start <= last[1]) last[1] = end;
      else merged.push([start, end]);
    }
    return merged;
  },

  // Forgets to emit the interval it was building when the loop ends.
  dropsLast: intervals => {
    const sorted = byStart([...intervals]);
    const merged: Interval[] = [];
    let current: Interval | undefined;
    for (const [start, end] of sorted) {
      if (current && start <= current[1]) current[1] = Math.max(current[1], end);
      else {
        if (current) merged.push(current);
        current = [start, end];
      }
    }
    return merged;
  },

  // Returns the right answer, but reuses the caller's interval objects and
  // then extends them in place.
  aliasesInput: intervals => {
    const merged: Interval[] = [];
    for (const interval of byStart([...intervals])) {
      const last = merged[merged.length - 1];
      if (last && interval[0] <= last[1]) last[1] = Math.max(last[1], interval[1]);
      else merged.push(interval);
    }
    return merged;
  },
};
