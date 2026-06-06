import type { Cell, ClueEntry, Puzzle, SolverProgress } from './types'

export const makeCellKey = (row: number, col: number) => `${row}:${col}`

export function createEmptyPuzzle(rows: number, cols: number): Puzzle {
  const now = new Date().toISOString()
  const cells: Cell[] = []

  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      cells.push({
        row,
        col,
        type: 'answer',
        solution: '',
        clues: []
      })
    }
  }

  return {
    id: crypto.randomUUID(),
    title: 'Untitled puzzle',
    rows,
    cols,
    cells,
    finalAnswer: '',
    createdAt: now,
    updatedAt: now
  }
}

export function clonePuzzle(puzzle: Puzzle): Puzzle {
  return JSON.parse(JSON.stringify(puzzle)) as Puzzle
}

export function getCell(puzzle: Puzzle, row: number, col: number): Cell | undefined {
  return puzzle.cells.find((cell) => cell.row === row && cell.col === col)
}

export function updateCell(puzzle: Puzzle, row: number, col: number, updater: (cell: Cell) => Cell): Puzzle {
  return {
    ...puzzle,
    updatedAt: new Date().toISOString(),
    cells: puzzle.cells.map((cell) => (cell.row === row && cell.col === col ? updater(cell) : cell))
  }
}

export function extractAnswerForClue(puzzle: Puzzle, clue: ClueEntry): string {
  if (clue.startRow == null || clue.startCol == null) return ''

  let row = clue.startRow
  let col = clue.startCol
  const letters: string[] = []

  while (row >= 0 && row < puzzle.rows && col >= 0 && col < puzzle.cols) {
    const cell = getCell(puzzle, row, col)
    if (!cell || cell.type !== 'answer') break
    if (!cell.solution) break
    letters.push(cell.solution)
    if (clue.direction === 'right') col += 1
    else row += 1
  }

  return letters.join('')
}

export function getFinalLinkedKeys(puzzle: Puzzle): Set<string> {
  const keys = new Set<string>()

  for (const cell of puzzle.cells) {
    if (cell.type !== 'clue') continue
    for (const clue of cell.clues) {
      if (!clue.isFinalLinked || clue.startRow == null || clue.startCol == null) continue
      let row = clue.startRow
      let col = clue.startCol
      while (row >= 0 && row < puzzle.rows && col >= 0 && col < puzzle.cols) {
        const target = getCell(puzzle, row, col)
        if (!target || target.type !== 'answer') break
        if (!target.solution) break
        keys.add(makeCellKey(row, col))
        if (clue.direction === 'right') col += 1
        else row += 1
      }
    }
  }

  return keys
}

const PUZZLES_KEY = 'crossword.puzzles'
const CURRENT_DRAFT_KEY = 'crossword.currentDraft'

export function loadSavedPuzzles(): Puzzle[] {
  const raw = localStorage.getItem(PUZZLES_KEY)
  if (!raw) return []
  try {
    return JSON.parse(raw) as Puzzle[]
  } catch {
    return []
  }
}

export function savePuzzleToBrowser(puzzle: Puzzle): void {
  const puzzles = loadSavedPuzzles()
  const next = [...puzzles.filter((item) => item.id !== puzzle.id), { ...puzzle, updatedAt: new Date().toISOString() }]
  localStorage.setItem(PUZZLES_KEY, JSON.stringify(next))
  localStorage.setItem(CURRENT_DRAFT_KEY, puzzle.id)
}

export function loadCurrentDraftId(): string | null {
  return localStorage.getItem(CURRENT_DRAFT_KEY)
}

export function saveProgress(progress: SolverProgress): void {
  localStorage.setItem(`crossword.progress.${progress.puzzleId}`, JSON.stringify(progress))
}

export function loadProgress(puzzleId: string): SolverProgress | null {
  const raw = localStorage.getItem(`crossword.progress.${puzzleId}`)
  if (!raw) return null
  try {
    return JSON.parse(raw) as SolverProgress
  } catch {
    return null
  }
}

export function exportPuzzle(puzzle: Puzzle): string {
  return JSON.stringify(puzzle, null, 2)
}

export function importPuzzle(serialized: string): Puzzle {
  const parsed = JSON.parse(serialized) as Puzzle
  if (!parsed.id || !Array.isArray(parsed.cells)) {
    throw new Error('Invalid puzzle file')
  }
  return parsed
}
