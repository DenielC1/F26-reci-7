/** A closed interval [start, end] on the number line, e.g. a busy block in a calendar. */
export type Interval = [start: number, end: number];

/**
 * Merges a list of intervals into the smallest equivalent list of disjoint
 * intervals.
 *
 * Preconditions: every interval has integer endpoints with start <= end.
 * Otherwise throws a RangeError.
 *
 * Postconditions:
 *   - The result covers exactly the same points of the number line as the
 *     input. Points means all real numbers, not just integers.
 *   - The result is sorted by start, and consecutive intervals neither
 *     overlap nor touch: result[i][1] < result[i + 1][0].
 *     [1, 3] and [3, 5] touch at 3, so they merge into [1, 5].
 *     [1, 2] and [3, 4] leave a gap (2 < x < 3), so they stay separate.
 *   - The input array and the intervals in it are not modified.
 *
 * The input may be in any order and may contain duplicates. [] gives [].
 */
export function mergeIntervals(intervals: readonly Interval[]): Interval[] {
  for (const [start, end] of intervals) {
    if (!Number.isInteger(start) || !Number.isInteger(end) || start > end) {
      throw new RangeError(`invalid interval [${start}, ${end}]`);
    }
  }
  const sorted = [...intervals].sort((a, b) => a[0] - b[0]);
  const merged: Interval[] = [];
  for (const [start, end] of sorted) {
    const last = merged[merged.length - 1];
    if (last && start <= last[1]) last[1] = Math.max(last[1], end);
    else merged.push([start, end]);
  }
  return merged;
}
