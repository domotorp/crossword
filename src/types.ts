export type CellType = 'answer' | 'clue' | 'blocked'
export type Direction = 'right' | 'down'

export interface ClueEntry {
  id: string
  text: string
  startRow: number | null
  startCol: number | null
  direction: Direction
  isFinalLinked: boolean
}

export interface Cell {
  row: number
  col: number
  type: CellType
  solution: string
  clues: ClueEntry[]
}

export interface Puzzle {
  id: string
  title: string
  rows: number
  cols: number
  cells: Cell[]
  finalAnswer: string
  createdAt: string
  updatedAt: string
}

export interface SolverProgress {
  puzzleId: string
  entries: Record<string, string>
  finalAnswerAttempt: string
}

export type Mode = 'home' | 'create' | 'solve'
