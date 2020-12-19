import React, {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useContext,
  useRef
} from 'react';

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

interface GridCellInfo<Cell> {
  instanceId: number;
  value: Cell;
}

type GridState<Cell> = Array<GridCellInfo<Cell> | undefined>;

type CellHook<Cell> = (
  x: number,
  y: number,
  value: Cell,
  onOccupied?: (existingCell?: Cell) => void
) => GridCellInfo<Cell> | null;

let idCounter = 0; // @todo track via grid context for SSR?

export function createGridState<Cell>(
  gridWidth: number,
  gridHeight: number,
  emptyCell: Cell
): [React.FC, CellHook<Cell>] {
  const GridContext = React.createContext<GridState<Cell> | null>(null);

  const GridProvider: React.FC = ({ children }) => {
    const [grid] = useState(
      () => new Array<GridCellInfo<Cell> | undefined>(gridWidth * gridHeight)
    );

    return <GridContext.Provider value={grid}>{children}</GridContext.Provider>;
  };

  function useGridCell(
    x: number,
    y: number,
    value: Cell,
    onOccupied?: (existingCell: Cell) => void
  ): GridCellInfo<Cell> | null {
    const isOutOfBounds = x < 0 || x >= gridWidth || y < 0 || y >= gridHeight;

    const grid = useContext(GridContext);
    if (!grid) {
      throw new Error('not in grid');
    }

    // wrap in ref to avoid re-triggering
    const onOccupiedRef = useRef(onOccupied);
    onOccupiedRef.current = onOccupied;
    const firstValueRef = useRef(value); // read only once

    // store and update cell value in holder info object
    const [cellInfo, setCellInfo] = useState<GridCellInfo<Cell> | null>(null);

    // update on each render without setting state
    if (cellInfo) {
      cellInfo.value = value;
    }

    // perform initial registration/unregistration
    useEffect(() => {
      // nothing to do
      if (isOutOfBounds) {
        // notify
        if (onOccupiedRef.current) {
          onOccupiedRef.current(emptyCell);
        }
        return;
      }

      // check if the cell is free
      const cellIndex = x + y * gridWidth;
      const occupiedCellInfo = grid[cellIndex];

      if (occupiedCellInfo) {
        // notify
        if (onOccupiedRef.current) {
          onOccupiedRef.current(occupiedCellInfo.value);
        }
        return;
      }

      // register on grid
      const cellInfo = { instanceId: ++idCounter, value };
      grid[cellIndex] = cellInfo;

      // mark as registered (the caller will know on next render)
      setCellInfo(cellInfo);

      // on unmount, clean up (checking if someone else took over the cell, just in case)
      return () => {
        const existingCellInfo = grid[cellIndex];
        if (existingCellInfo === cellInfo) {
          grid[cellIndex] = undefined;
        }
      };
    }, [x, y, isOutOfBounds]);

    // expose current state to caller
    return cellInfo;
  }

  return [GridProvider, useGridCell];
}
