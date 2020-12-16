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

interface CellAreaSpec<Cell> {
  self: Cell | undefined;
  xPrev?: Cell | undefined;
  xNext?: Cell | undefined;
  yPrev?: Cell | undefined;
  yNext?: Cell | undefined;
}
type CellSetter<Cell> = (helpers: Helpers<Cell>) => CellAreaSpec<Cell>;

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

    // static updater function
    const cellUpdater = useCallback(
      (callback: CellSetter<Cell>) => {
        setGrid((prev) => {
          const newCellSpec = callback(
            createHelpers(prev, gridWidth, gridHeight, x, y)
          );

          // copy state and update based on spec
          const newState = [...prev];

          newState[cellIndex] = newCellSpec.self;

          if (Object.prototype.hasOwnProperty.call(newCellSpec, 'xPrev')) {
            if (x <= 0) {
              throw new Error('no xPrev');
            }

            newState[cellIndex - 1] = newCellSpec.xPrev;
          }

          if (Object.prototype.hasOwnProperty.call(newCellSpec, 'xNext')) {
            if (x >= gridWidth - 1) {
              throw new Error('no xNext');
            }

            newState[cellIndex + 1] = newCellSpec.xNext;
          }

          if (Object.prototype.hasOwnProperty.call(newCellSpec, 'yPrev')) {
            if (y <= 0) {
              throw new Error('no yPrev');
            }

            newState[cellIndex - gridWidth] = newCellSpec.yPrev;
          }

          if (Object.prototype.hasOwnProperty.call(newCellSpec, 'yNext')) {
            if (y >= gridHeight - 1) {
              throw new Error('no yNext');
            }

            newState[cellIndex + gridWidth] = newCellSpec.yNext;
          }

          return newState;
        });
      },
      [x, y]
    );

    // return current reference cell @todo also allow querying nearby cells at render time?
    return [grid[cellIndex], cellUpdater];
  }

  return [GridProvider, useGridCell];
}
