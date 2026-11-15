import type { DataIndex } from './data/index.ts'
import { buildRound, makeRng, roundOrder, type GuessRound, type GuessState } from './guess.ts'

/** Game progress lives at module level so it survives leaving the page (e.g. via a profile link). */
export type GuessSession = { game: GuessState; round: GuessRound | null; chosen: number | null; revealed: boolean; reveal: number }

let rng: (() => number) | null = null
export const guess = $state<{ s: GuessSession | null }>({ s: null })

/** Forget the current game (tests; "play again" uses newGame). */
export function resetGuess(): void {
  guess.s = null
  rng = null
}

function roundAt(idx: DataIndex, game: GuessState): GuessRound | null {
  return game.i < game.order.length ? buildRound(game.order[game.i], idx, rng!) : null
}

export function newGame(idx: DataIndex): GuessSession {
  rng ??= makeRng(Date.now() % 2147483647)
  const game: GuessState = { order: roundOrder(idx, rng), i: 0, answers: [] }
  guess.s = { game, round: roundAt(idx, game), chosen: null, revealed: false, reveal: 0 }
  return guess.s
}

/** The current game, starting one (with an optional seed) if none is in progress. */
export function ensureGame(idx: DataIndex, seed?: number): GuessSession {
  if (guess.s) return guess.s
  rng = makeRng(seed ?? Date.now() % 2147483647)
  return newGame(idx)
}

export function nextRound(idx: DataIndex): void {
  const s = guess.s
  if (!s) return
  s.game.i += 1
  s.round = roundAt(idx, s.game)
  s.chosen = null
  s.revealed = false
  s.reveal = 0
}
