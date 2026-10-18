import { select } from '../select';
import { matchGuess as correct } from './matchGuess';
import { mutants } from './mutants';

export type { Color } from './matchGuess';
export const matchGuess = select('wordle', correct, mutants);
