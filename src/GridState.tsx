import React, { useState, useMemo, useCallback, useContext } from 'react';

export const GRID_CELL_SIZE = 2;

export const CARDINAL_DIR_LIST = [
  [1, 0],
  [0, 1],
  [-1, 0],
  [0, -1]
];

export function getGridDirectionAcross(dir: number) {
  return (dir + 2) % 4;
}

type GridState<Cell> = Array<Cell | undefined>;
type GridContextValue<Cell> = [
  GridState<Cell>,
  React.Dispatch<React.SetStateAction<GridState<Cell>>>
];

interface Helpers<Cell> {
  value: Cell | undefined;
  getCell(dir: number): Cell | undefined;
}

function createHelpers<Cell>(
  grid: GridState<Cell>,
  gridWidth: number,
  gridHeight: number,
  x: number,
  y: number,
  emptyCell: Cell | undefined
): Helpers<Cell> {
  function accessor(nx: number, ny: number) {
    if (nx < 0 || nx >= gridWidth || ny < 0 || ny >= gridHeight) {
      return emptyCell;
    }

    return grid[nx + ny * gridWidth];
  }

  return {
    value: accessor(x, y),

    getCell(dir: number) {
      const offset = CARDINAL_DIR_LIST[dir];
      return accessor(x + offset[0], y + offset[1]);
    }
  };
}

interface CellAreaSpec<Cell> {
  self: Cell | undefined;
  [dir: number]: Cell | undefined;
}
type CellSetter<Cell> = (helpers: Helpers<Cell>) => CellAreaSpec<Cell> | null;

type CellHookReturn<Cell> = [
  Cell | undefined,
  (callback: CellSetter<Cell>) => void
];
type CellHook<Cell> = (x: number, y: number) => CellHookReturn<Cell>;

export function createGridState<Cell>(
  gridWidth: number,
  gridHeight: number,
  emptyCell: Cell | undefined
): [React.FC, CellHook<Cell>] {
  const GridContext = React.createContext<GridContextValue<Cell> | null>(null);

  const GridProvider: React.FC = ({ children }) => {
    const [grid, setGrid] = useState(
      () => new Array<Cell | undefined>(gridWidth * gridHeight)
    );

    const ctxValue = useMemo<GridContextValue<Cell>>(() => [grid, setGrid], [
      grid,
      setGrid
    ]);

    return (
      <GridContext.Provider value={ctxValue}>{children}</GridContext.Provider>
    );
  };

  function useGridCell(ox: number, oy: number): CellHookReturn<Cell> {
    // read only once @todo check for changes?
    const [[x, y, cellIndex]] = useState(() => [ox, oy, ox + oy * gridWidth]);
    const isOutOfBounds = x < 0 || x >= gridWidth || y < 0 || y >= gridHeight;

    const ctxValue = useContext(GridContext);
    if (!ctxValue) {
      throw new Error('not in grid');
    }

    const [grid, setGrid] = ctxValue;

    // static updater function
    const cellUpdater = useCallback(
      (callback: CellSetter<Cell>) => {
        setGrid((prev) => {
          const newCellSpec = callback(
            createHelpers(prev, gridWidth, gridHeight, x, y, emptyCell)
          );

          // bail out if no change was requested
          if (!newCellSpec) {
            return prev;
          }

          // at least one change was requested: check if we are in bounds
          if (isOutOfBounds) {
            throw new Error(`cannot update out of bounds: ${x},${y}`);
          }

          // copy state and update based on spec
          const newState = [...prev];

          newState[cellIndex] = newCellSpec.self;

          for (let dir = 0; dir < CARDINAL_DIR_LIST.length; dir += 1) {
            if (Object.prototype.hasOwnProperty.call(newCellSpec, dir)) {
              const offset = CARDINAL_DIR_LIST[dir];
              const nx = x + offset[0];
              const ny = y + offset[1];

              if (nx < 0 || nx >= gridWidth || ny < 0 || ny >= gridHeight) {
                throw new Error(`setting out of range: ${nx},${ny}`);
              }

              newState[nx + ny * gridWidth] = newCellSpec[dir];
            }
          }

          return newState;
        });
      },
      [x, y]
    );

    // return current reference cell @todo also allow querying nearby cells at render time?
    return [isOutOfBounds ? emptyCell : grid[cellIndex], cellUpdater];
  }

  return [GridProvider, useGridCell];
}
