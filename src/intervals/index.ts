import { select } from '../select';
import { mergeIntervals as correct } from './mergeIntervals';
import { mutants } from './mutants';

export type { Interval } from './mergeIntervals';
export const mergeIntervals = select('intervals', correct, mutants);
