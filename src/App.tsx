import { useEffect, useMemo, useRef, useState } from 'react'
import type { Cell, ClueEntry, Direction, Mode, Puzzle, SolverProgress } from './types'
import {
  clonePuzzle,
  createEmptyPuzzle,
  exportPuzzle,
  extractAnswerForClue,
  getCell,
  getFinalLinkedKeys,
  importPuzzle,
  loadCurrentDraftId,
  loadProgress,
  loadSavedPuzzles,
  makeCellKey,
  saveProgress,
  savePuzzleToBrowser,
  updateCell
} from './lib'

const defaultRows = 8
const defaultCols = 8

function App() {
  const [mode, setMode] = useState<Mode>('home')
  const [draftPuzzle, setDraftPuzzle] = useState<Puzzle>(() => createEmptyPuzzle(defaultRows, defaultCols))
  const [selectedCell, setSelectedCell] = useState<{ row: number; col: number } | null>(null)
  const [tool, setTool] = useState<'answer' | 'clue' | 'blocked'>('answer')
  const [status, setStatus] = useState<string>('')
  const [savedPuzzles, setSavedPuzzles] = useState<Puzzle[]>(() => loadSavedPuzzles())
  const [solverPuzzle, setSolverPuzzle] = useState<Puzzle | null>(null)
  const [progress, setProgress] = useState<SolverProgress | null>(null)
  const [finalFeedback, setFinalFeedback] = useState<string>('')
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const importSolveRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    const currentDraftId = loadCurrentDraftId()
    const puzzles = loadSavedPuzzles()
    setSavedPuzzles(puzzles)
    if (currentDraftId) {
      const found = puzzles.find((p) => p.id === currentDraftId)
      if (found) setDraftPuzzle(found)
    }
  }, [])

  useEffect(() => {
    if (solverPuzzle) {
      const loaded = loadProgress(solverPuzzle.id)
      setProgress(
        loaded ?? {
          puzzleId: solverPuzzle.id,
          entries: {},
          finalAnswerAttempt: ''
        }
      )
    }
  }, [solverPuzzle])

  useEffect(() => {
    if (progress) saveProgress(progress)
  }, [progress])

  const finalLinkedKeys = useMemo(() => getFinalLinkedKeys(draftPuzzle), [draftPuzzle])
  const solverFinalLinkedKeys = useMemo(() => (solverPuzzle ? getFinalLinkedKeys(solverPuzzle) : new Set<string>()), [solverPuzzle])

  const selectedDraftCell = selectedCell ? getCell(draftPuzzle, selectedCell.row, selectedCell.col) : undefined

  const handleGridResize = (rows: number, cols: number) => {
    setDraftPuzzle(createEmptyPuzzle(rows, cols))
    setSelectedCell(null)
    setStatus('Created a new blank puzzle.')
  }

  const handleCellClick = (row: number, col: number) => {
    setSelectedCell({ row, col })
    setDraftPuzzle((prev) =>
      updateCell(prev, row, col, (cell) => ({
        ...cell,
        type: tool,
        solution: tool === 'answer' ? cell.solution : '',
        clues: tool === 'clue' ? cell.clues.slice(0, 2) : []
      }))
    )
  }

  const setAnswerValue = (row: number, col: number, value: string) => {
    const char = [...value].slice(-1)[0] ?? ''
    setDraftPuzzle((prev) =>
      updateCell(prev, row, col, (cell) => ({
        ...cell,
        type: 'answer',
        solution: char.toLocaleUpperCase('hu-HU')
      }))
    )
  }

  const updateSelectedClueCell = (updater: (cell: Cell) => Cell) => {
    if (!selectedCell) return
    setDraftPuzzle((prev) => updateCell(prev, selectedCell.row, selectedCell.col, updater))
  }

  const saveDraft = () => {
    savePuzzleToBrowser(draftPuzzle)
    setSavedPuzzles(loadSavedPuzzles())
    setStatus('Puzzle saved to this browser.')
  }

  const downloadDraft = () => {
    const blob = new Blob([exportPuzzle(draftPuzzle)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `${draftPuzzle.title || 'puzzle'}.json`
    anchor.click()
    URL.revokeObjectURL(url)
    setStatus('Puzzle JSON downloaded.')
  }

  const openImport = () => fileInputRef.current?.click()
  const openSolveImport = () => importSolveRef.current?.click()

  const onImportFile = async (file: File, target: 'create' | 'solve') => {
    const text = await file.text()
    const imported = importPuzzle(text)
    if (target === 'create') {
      setDraftPuzzle(imported)
      setMode('create')
      setStatus('Puzzle imported into creator.')
    } else {
      setSolverPuzzle(imported)
      setMode('solve')
      setFinalFeedback('')
    }
  }

  const loadIntoSolver = (puzzle: Puzzle) => {
    setSolverPuzzle(clonePuzzle(puzzle))
    setMode('solve')
    setFinalFeedback('')
  }

  const updateProgressCell = (row: number, col: number, value: string) => {
    if (!solverPuzzle) return
    const char = [...value].slice(-1)[0] ?? ''
    setProgress((prev) =>
      prev
        ? {
            ...prev,
            entries: {
              ...prev.entries,
              [makeCellKey(row, col)]: char.toLocaleUpperCase('hu-HU')
            }
          }
        : prev
    )
  }

  const submitFinalAnswer = () => {
    if (!solverPuzzle || !progress) return
    const expected = solverPuzzle.finalAnswer.trim().toLocaleUpperCase('hu-HU')
    const given = progress.finalAnswerAttempt.trim().toLocaleUpperCase('hu-HU')
    setFinalFeedback(given && expected === given ? 'Correct final answer!' : 'Not correct yet.')
  }

  return (
    <div className="app-shell">
      {mode === 'home' && (
        <div className="home">
          <h1>Clue-in-Square Crossword</h1>
          <p>Create and solve arrowword-style puzzles with Hungarian character support.</p>
          <div className="home-actions">
            <button className="primary" onClick={() => setMode('create')}>
              Create Puzzle
            </button>
            <button className="secondary" onClick={() => setMode('solve')}>
              Solve Puzzle
            </button>
          </div>
          <div className="panel" style={{ maxWidth: 760 }}>
            <h2>Saved puzzles in this browser</h2>
            {savedPuzzles.length === 0 ? <p className="muted">No saved puzzles yet.</p> : null}
            <div className="puzzle-list">
              {savedPuzzles.map((puzzle) => (
                <div className="puzzle-item" key={puzzle.id}>
                  <div>
                    <strong>{puzzle.title}</strong>
                    <div className="muted">
                      {puzzle.rows} × {puzzle.cols}
                    </div>
                  </div>
                  <div className="inline-actions">
                    <button className="secondary" onClick={() => { setDraftPuzzle(clonePuzzle(puzzle)); setMode('create') }}>
                      Edit
                    </button>
                    <button className="primary" onClick={() => loadIntoSolver(puzzle)}>
                      Solve
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {mode === 'create' && (
        <CreateView
          puzzle={draftPuzzle}
          selectedCell={selectedCell}
          selectedDraftCell={selectedDraftCell}
          tool={tool}
          setTool={setTool}
          onCellClick={handleCellClick}
          onAnswerChange={setAnswerValue}
          onResize={handleGridResize}
          onBack={() => setMode('home')}
          onSave={saveDraft}
          onDownload={downloadDraft}
          onImport={openImport}
          onUpdatePuzzle={setDraftPuzzle}
          onUpdateSelectedClueCell={updateSelectedClueCell}
          status={status}
          finalLinkedKeys={finalLinkedKeys}
        />
      )}

      {mode === 'solve' && (
        <SolveView
          puzzle={solverPuzzle}
          progress={progress}
          setProgress={setProgress}
          onBack={() => setMode('home')}
          onImport={openSolveImport}
          onLoadSaved={(puzzle) => loadIntoSolver(puzzle)}
          savedPuzzles={savedPuzzles}
          onCellChange={updateProgressCell}
          onSubmitFinal={submitFinalAnswer}
          feedback={finalFeedback}
          finalLinkedKeys={solverFinalLinkedKeys}
        />
      )}

      <input
        ref={fileInputRef}
        type="file"
        hidden
        accept="application/json"
        onChange={(event) => {
          const file = event.target.files?.[0]
          if (file) void onImportFile(file, 'create')
          event.currentTarget.value = ''
        }}
      />
      <input
        ref={importSolveRef}
        type="file"
        hidden
        accept="application/json"
        onChange={(event) => {
          const file = event.target.files?.[0]
          if (file) void onImportFile(file, 'solve')
          event.currentTarget.value = ''
        }}
      />
    </div>
  )
}

function CreateView(props: {
  puzzle: Puzzle
  selectedCell: { row: number; col: number } | null
  selectedDraftCell: Cell | undefined
  tool: 'answer' | 'clue' | 'blocked'
  setTool: (tool: 'answer' | 'clue' | 'blocked') => void
  onCellClick: (row: number, col: number) => void
  onAnswerChange: (row: number, col: number, value: string) => void
  onResize: (rows: number, cols: number) => void
  onBack: () => void
  onSave: () => void
  onDownload: () => void
  onImport: () => void
  onUpdatePuzzle: (puzzle: Puzzle) => void
  onUpdateSelectedClueCell: (updater: (cell: Cell) => Cell) => void
  status: string
  finalLinkedKeys: Set<string>
}) {
  const [rows, setRows] = useState(props.puzzle.rows)
  const [cols, setCols] = useState(props.puzzle.cols)

  useEffect(() => {
    setRows(props.puzzle.rows)
    setCols(props.puzzle.cols)
  }, [props.puzzle.rows, props.puzzle.cols])

  const selected = props.selectedDraftCell

  return (
    <div className="layout">
      <div className="panel">
        <h2>Create Puzzle</h2>
        <div className="field-grid two">
          <label>
            Title
            <input
              value={props.puzzle.title}
              onChange={(event) => props.onUpdatePuzzle({ ...props.puzzle, title: event.target.value })}
            />
          </label>
          <label>
            Final answer
            <input
              value={props.puzzle.finalAnswer}
              onChange={(event) => props.onUpdatePuzzle({ ...props.puzzle, finalAnswer: event.target.value })}
            />
          </label>
        </div>

        <h3>New grid</h3>
        <div className="field-grid two">
          <label>
            Rows
            <input type="number" min={1} max={30} value={rows} onChange={(e) => setRows(Number(e.target.value))} />
          </label>
          <label>
            Columns
            <input type="number" min={1} max={30} value={cols} onChange={(e) => setCols(Number(e.target.value))} />
          </label>
        </div>
        <div className="inline-actions">
          <button className="secondary" onClick={() => props.onResize(rows, cols)}>
            Create blank grid
          </button>
        </div>

        <h3>Cell tools</h3>
        <div className="toolbar">
          {(['answer', 'clue', 'blocked'] as const).map((tool) => (
            <button
              key={tool}
              className={`tool-btn ${props.tool === tool ? 'active' : 'secondary'}`}
              onClick={() => props.setTool(tool)}
            >
              {tool}
            </button>
          ))}
        </div>
        <p className="muted">Click cells to assign type. Type directly into answer cells to enter solution letters.</p>

        {selected?.type === 'clue' ? (
          <ClueEditor cell={selected} onChange={(next) => props.onUpdateSelectedClueCell(() => next)} />
        ) : (
          <p className="muted">Select a clue cell to edit up to two clues.</p>
        )}

        <div className="inline-actions">
          <button className="primary" onClick={props.onSave}>
            Save to browser
          </button>
          <button className="secondary" onClick={props.onDownload}>
            Export JSON
          </button>
          <button className="secondary" onClick={props.onImport}>
            Import JSON
          </button>
          <button className="danger" onClick={props.onBack}>
            Back
          </button>
        </div>

        {props.status ? <p className="status">{props.status}</p> : null}
      </div>

      <div className="panel">
        <h2>{props.puzzle.title || 'Untitled puzzle'}</h2>
        <GridView
          puzzle={props.puzzle}
          editable
          selectedCell={props.selectedCell}
          onCellClick={props.onCellClick}
          onAnswerChange={props.onAnswerChange}
          finalLinkedKeys={props.finalLinkedKeys}
        />
      </div>
    </div>
  )
}

function ClueEditor({ cell, onChange }: { cell: Cell; onChange: (cell: Cell) => void }) {
  const clues = [...cell.clues]
  while (clues.length < 2) {
    clues.push({
      id: crypto.randomUUID(),
      text: '',
      startRow: null,
      startCol: null,
      direction: 'right',
      isFinalLinked: false
    })
  }

  const activeCount = cell.clues.length || 1

  const updateClue = (index: number, updater: (clue: ClueEntry) => ClueEntry) => {
    const next = clues.map((clue, idx) => (idx === index ? updater(clue) : clue))
    onChange({ ...cell, clues: next.slice(0, activeCount) })
  }

  return (
    <div>
      <h3>Clue cell editor</h3>
      <label>
        Number of clues
        <select
          value={activeCount}
          onChange={(event) => {
            const count = Number(event.target.value)
            onChange({ ...cell, clues: clues.slice(0, count) })
          }}
        >
          <option value={1}>1 clue</option>
          <option value={2}>2 clues</option>
        </select>
      </label>

      {clues.slice(0, activeCount).map((clue, index) => (
        <div className="clue-entry" key={clue.id}>
          <h4>Clue {index + 1}</h4>
          <div className="field-grid">
            <label>
              Clue text
              <textarea value={clue.text} onChange={(e) => updateClue(index, (item) => ({ ...item, text: e.target.value }))} />
            </label>
            <div className="field-grid two">
              <label>
                Start row
                <input
                  type="number"
                  min={0}
                  value={clue.startRow ?? ''}
                  onChange={(e) => updateClue(index, (item) => ({ ...item, startRow: e.target.value === '' ? null : Number(e.target.value) }))}
                />
              </label>
              <label>
                Start col
                <input
                  type="number"
                  min={0}
                  value={clue.startCol ?? ''}
                  onChange={(e) => updateClue(index, (item) => ({ ...item, startCol: e.target.value === '' ? null : Number(e.target.value) }))}
                />
              </label>
            </div>
            <label>
              Direction after first cell
              <select value={clue.direction} onChange={(e) => updateClue(index, (item) => ({ ...item, direction: e.target.value as Direction }))}>
                <option value="right">Right</option>
                <option value="down">Down</option>
              </select>
            </label>
            <label>
              <input
                type="checkbox"
                checked={clue.isFinalLinked}
                onChange={(e) => updateClue(index, (item) => ({ ...item, isFinalLinked: e.target.checked }))}
              />{' '}
              This clue is part of the final answer
            </label>
          </div>
        </div>
      ))}
    </div>
  )
}

function SolveView(props: {
  puzzle: Puzzle | null
  progress: SolverProgress | null
  setProgress: (next: SolverProgress | null | ((prev: SolverProgress | null) => SolverProgress | null)) => void
  onBack: () => void
  onImport: () => void
  onLoadSaved: (puzzle: Puzzle) => void
  savedPuzzles: Puzzle[]
  onCellChange: (row: number, col: number, value: string) => void
  onSubmitFinal: () => void
  feedback: string
  finalLinkedKeys: Set<string>
}) {
  return (
    <div className="layout">
      <div className="panel">
        <h2>Solve Puzzle</h2>
        <div className="inline-actions">
          <button className="secondary" onClick={props.onImport}>
            Import JSON
          </button>
          <button className="danger" onClick={props.onBack}>
            Back
          </button>
        </div>

        <h3>Saved puzzles</h3>
        <div className="puzzle-list">
          {props.savedPuzzles.map((puzzle) => (
            <div className="puzzle-item" key={puzzle.id}>
              <div>
                <strong>{puzzle.title}</strong>
                <div className="muted">
                  {puzzle.rows} × {puzzle.cols}
                </div>
              </div>
              <button className="primary" onClick={() => props.onLoadSaved(puzzle)}>
                Open
              </button>
            </div>
          ))}
          {props.savedPuzzles.length === 0 ? <p className="muted">No saved puzzles in this browser.</p> : null}
        </div>

        {props.puzzle && props.progress ? (
          <>
            <h3>Final answer</h3>
            <div className="final-answer-box">
              <input
                value={props.progress.finalAnswerAttempt}
                onChange={(event) =>
                  props.setProgress((prev) =>
                    prev
                      ? {
                          ...prev,
                          finalAnswerAttempt: event.target.value
                        }
                      : prev
                  )
                }
                placeholder="Enter final answer"
              />
              <button className="primary" onClick={props.onSubmitFinal}>
                Check final answer
              </button>
            </div>
            {props.feedback ? <p className={props.feedback.includes('Correct') ? 'success' : 'error'}>{props.feedback}</p> : null}
          </>
        ) : (
          <p className="muted">Import or open a puzzle to start solving.</p>
        )}
      </div>

      <div className="panel">
        {props.puzzle && props.progress ? (
          <>
            <h2>{props.puzzle.title}</h2>
            <GridView
              puzzle={props.puzzle}
              editable={false}
              progress={props.progress}
              onAnswerChange={props.onCellChange}
              finalLinkedKeys={props.finalLinkedKeys}
            />
          </>
        ) : (
          <p className="muted">No puzzle loaded.</p>
        )}
      </div>
    </div>
  )
}

function GridView(props: {
  puzzle: Puzzle
  editable: boolean
  selectedCell?: { row: number; col: number } | null
  onCellClick?: (row: number, col: number) => void
  onAnswerChange: (row: number, col: number, value: string) => void
  progress?: SolverProgress
  finalLinkedKeys: Set<string>
}) {
  return (
    <div className="grid-wrap">
      <div className="grid" style={{ gridTemplateColumns: `repeat(${props.puzzle.cols}, 56px)` }}>
        {props.puzzle.cells.map((cell) => {
          const key = makeCellKey(cell.row, cell.col)
          const selected = props.selectedCell?.row === cell.row && props.selectedCell?.col === cell.col
          const finalLinked = props.finalLinkedKeys.has(key)

          if (cell.type === 'blocked') {
            return <button key={key} className={`cell blocked ${selected ? 'selected-cell' : ''}`} onClick={() => props.onCellClick?.(cell.row, cell.col)} />
          }

          if (cell.type === 'clue') {
            return (
              <button key={key} className={`cell clue ${selected ? 'selected-cell' : ''}`} onClick={() => props.onCellClick?.(cell.row, cell.col)}>
                <div className={`clue-segments ${cell.clues.length === 2 ? 'two' : ''}`}>
                  {(cell.clues.length > 0 ? cell.clues : [{ id: 'placeholder', text: '', startRow: null, startCol: null, direction: 'right', isFinalLinked: false }]).map((clue) => (
                    <div className="clue-segment" key={clue.id}>
                      <span className="clue-meta">
                        {clue.direction === 'right' ? '→' : '↓'} {clue.startRow ?? '-'}, {clue.startCol ?? '-'}
                      </span>
                      {clue.text}
                    </div>
                  ))}
                </div>
              </button>
            )
          }

          const value = props.editable ? cell.solution : props.progress?.entries[key] ?? ''
          return (
            <div key={key} className={`cell answer ${selected ? 'selected-cell' : ''} ${finalLinked ? 'final-linked' : ''}`} onClick={() => props.onCellClick?.(cell.row, cell.col)}>
              <input
                aria-label={`cell-${cell.row}-${cell.col}`}
                value={value}
                onChange={(event) => props.onAnswerChange(cell.row, cell.col, event.target.value)}
                maxLength={2}
              />
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default App
