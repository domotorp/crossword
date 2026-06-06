import { describe, expect, it } from 'vitest'
import { createEmptyPuzzle, extractAnswerForClue, getFinalLinkedKeys, importPuzzle } from '../lib'

describe('crossword puzzle helpers', () => {
  it('extracts answers going right', () => {
    const puzzle = createEmptyPuzzle(3, 4)
    puzzle.cells.find((c) => c.row === 0 && c.col === 1)!.solution = 'Á'
    puzzle.cells.find((c) => c.row === 0 && c.col === 2)!.solution = 'R'
    puzzle.cells.find((c) => c.row === 0 && c.col === 3)!.solution = 'V'

    const answer = extractAnswerForClue(puzzle, {
      id: '1',
      text: 'river',
      startRow: 0,
      startCol: 1,
      direction: 'right',
      isFinalLinked: false
    })

    expect(answer).toBe('ÁRV')
  })

  it('collects final-linked cells', () => {
    const puzzle = createEmptyPuzzle(4, 4)
    puzzle.cells.find((c) => c.row === 1 && c.col === 1)!.type = 'clue'
    puzzle.cells.find((c) => c.row === 1 && c.col === 1)!.clues = [
      {
        id: '1',
        text: 'test',
        startRow: 1,
        startCol: 2,
        direction: 'down',
        isFinalLinked: true
      }
    ]
    puzzle.cells.find((c) => c.row === 1 && c.col === 2)!.solution = 'Ő'
    puzzle.cells.find((c) => c.row === 2 && c.col === 2)!.solution = 'R'

    const keys = getFinalLinkedKeys(puzzle)
    expect(keys.has('1:2')).toBe(true)
    expect(keys.has('2:2')).toBe(true)
  })

  it('imports exported puzzle JSON shape', () => {
    const puzzle = createEmptyPuzzle(2, 2)
    const imported = importPuzzle(JSON.stringify(puzzle))
    expect(imported.rows).toBe(2)
    expect(imported.cols).toBe(2)
  })
})
