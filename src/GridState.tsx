import React, {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useContext,
  useRef
} from 'react';

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
  getNeighborXY: (dir: number) => [number, number];
}

function createCellInfo<Cell>(
  x: number,
  y: number,
  value: Cell
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
    getNeighborXY(dir: number) {
      return neighborXY[dir];
    }
  };
}

type GridState<Cell> = Array<GridCellInfo<Cell> | undefined>;

type CellHook<Cell> = (
  x: number,
  y: number,
  value: Cell,
  onPlaced?: () => void,
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
    onPlaced?: () => void,
    onOccupied?: (existingCell: Cell) => void
  ): GridCellInfo<Cell> | null {
    const isOutOfBounds = x < 0 || x >= gridWidth || y < 0 || y >= gridHeight;

    const grid = useContext(GridContext);
    if (!grid) {
      throw new Error('not in grid');
    }

    // wrap in ref to avoid re-triggering
    const onPlacedRef = useRef(onPlaced);
    onPlacedRef.current = onPlaced;
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
      const cellInfo = createCellInfo(x, y, value);
      grid[cellIndex] = cellInfo;

      // mark as registered (the caller will know on next render)
      setCellInfo(cellInfo);

      // notify
      if (onPlacedRef.current) {
        console.log('placed');
        onPlacedRef.current();
      }

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
