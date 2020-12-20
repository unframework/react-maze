import React, {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useContext,
  useRef
} from 'react';

// @todo expose directions as just X+/X-/etc symbols instead of 0..3
const CARDINAL_DIR_LIST: [number, number][] = [
  [1, 0],
  [0, 1],
  [-1, 0],
  [0, -1]
];

export const GRID_DIRECTION_COUNT = CARDINAL_DIR_LIST.length;

export function directionXY(dir: number): [number, number] {
  return CARDINAL_DIR_LIST[dir];
}

export function directionAcross(dir: number) {
  return (dir + 2) % 4;
}

export interface GridCellInfo<Cell> {
  instanceId: number;

  value: Cell;

  getXY: () => [number, number];
  getNeighbor: (dir: number) => Cell | undefined;
  getNeighborXY: (dir: number) => [number, number];
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

  function createCellInfo(
    x: number,
    y: number,
    value: Cell,
    grid: GridState<Cell>
  ): GridCellInfo<Cell> {
    const instanceId = ++idCounter;

    const xy: [number, number] = [x, y];

    const neighborXY = CARDINAL_DIR_LIST.map(([dx, dy]): [number, number] => [
      x + dx,
      y + dy
    ]);

    return {
      instanceId,

      value,

      getXY() {
        return xy;
      },
      getNeighbor(dir: number) {
        const [nx, ny] = neighborXY[dir];

        if (nx < 0 || nx >= gridWidth || ny < 0 || ny >= gridHeight) {
          return emptyCell;
        }

        const nCellInfo = grid[nx + ny * gridWidth];
        return nCellInfo && nCellInfo.value;
      },
      getNeighborXY(dir: number) {
        return neighborXY[dir];
      }
    };
  }

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
      if (x < 0 || x >= gridWidth || y < 0 || y >= gridHeight) {
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
      const newCellInfo = createCellInfo(x, y, value, grid);
      grid[cellIndex] = newCellInfo;

      // mark as registered (the caller will know on next render)
      setCellInfo(newCellInfo);

      // on unmount, clean up (checking if someone else took over the cell, just in case)
      return () => {
        const existingCellInfo = grid[cellIndex];
        if (existingCellInfo === newCellInfo) {
          grid[cellIndex] = undefined;
        }
      };
    }, [x, y]);

    // expose current state to caller
    return cellInfo;
  }

  return [GridProvider, useGridCell];
}
