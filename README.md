# Clue-in-Square Crossword App

Anonymous web app for creating and solving clue-in-square / arrowword-style crosswords with Hungarian character support.

## Features

- Create or solve from the start screen
- Adjustable grid size
- Three cell types: answer, clue, blocked
- Enter solution letters directly into answer cells
- Up to 2 clues per clue cell
- Clue setup by choosing adjacent start cell + direction (right/down)
- Mark clues as part of the final answer; related answer cells are shaded
- No correctness feedback during solving except final answer check
- Anonymous storage using browser localStorage
- Import/export puzzle JSON files
- Share puzzle files by downloading/exporting them

## How to use

### Create puzzle
1. Click **Create Puzzle**
2. Set rows and columns and generate a grid
3. Use the cell type tools to mark cells as answer, clue, or blocked
4. Type solution letters directly into answer cells
5. Click a clue cell to edit up to two clues
6. For each clue, choose clue text, start cell, and direction
7. Optionally mark a clue as part of the final answer
8. Enter the final answer text
9. Save to browser or export JSON

### Solve puzzle
1. Click **Solve Puzzle**
2. Load a puzzle from browser storage or import a JSON file
3. Fill answer cells
4. Enter the final answer and submit

## Tech

- React + TypeScript + Vite
- No backend required for v1
- Vitest test suite included

## Development

```bash
npm install
npm run dev
```

## Test

```bash
npm run test
npm run build
```
