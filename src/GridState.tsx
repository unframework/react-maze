import React, { useState, useMemo, useCallback, useContext } from 'react';

export const GRID_CELL_SIZE = 2;

export const CARDINAL_DIR_LIST = [
  [1, 0],
  [0, 1],
  [-1, 0],
  [0, -1]
];

type GridState<Cell> = Array<Cell | undefined>;
type GridContextValue<Cell> = [
  GridState<Cell>,
  React.Dispatch<React.SetStateAction<GridState<Cell>>>
];

interface Helpers<Cell> {
  value: Cell | undefined;
}

function createHelpers<Cell>(
  grid: GridState<Cell>,
  gridWidth: number,
  gridHeight: number,
  x: number,
  y: number
): Helpers<Cell> {
  const cellIndex = x + y * gridWidth;

  return {
    value: grid[cellIndex]
  };
}

type CellSetter<Cell> = (helpers: Helpers<Cell>) => Cell | undefined;

function createGridState<Cell>(gridWidth: number, gridHeight: number) {
  const GridContext = React.createContext<GridContextValue<Cell> | null>(null);

  const GridProvider: React.FC = () => {
    const [grid, setGrid] = useState(
      () => new Array<Cell | undefined>(gridWidth * gridHeight)
    );

    const ctxValue = useMemo<GridContextValue<Cell>>(() => [grid, setGrid], [
      grid,
      setGrid
    ]);

    return <GridContext.Provider value={ctxValue}></GridContext.Provider>;
  };

  function useGridCell(ox: number, oy: number) {
    // read only once @todo check for changes?
    const [[x, y, cellIndex]] = useState(() => [ox, oy, ox + oy * gridWidth]);

    const ctxValue = useContext(GridContext);
    if (!ctxValue) {
      throw new Error('not in grid');
    }

    const [grid, setGrid] = ctxValue;

    const cellObject = useMemo(() => {}, [grid]);

    // static updater function
    const cellUpdater = useCallback(
      (callback: CellSetter<Cell>) => {
        setGrid((prev) => {
          const newCell = callback(
            createHelpers(prev, gridWidth, gridHeight, x, y)
          );

          const newState = [...prev];
          newState[cellIndex] = newCell;

          return newState;
        });
      },
      [x, y]
    );
  }

  return [GridProvider, useGridCell];
}
