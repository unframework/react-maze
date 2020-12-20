import React, { useMemo, useState, useEffect, useRef } from 'react';
import { useAsync } from 'react-async-hook';
import { Story, Meta } from '@storybook/react';
import { Canvas } from 'react-three-fiber';
import { MapControls } from '@react-three/drei/MapControls';
import { Line } from '@react-three/drei/Line';
import * as THREE from 'three';

import {
  directionXY,
  directionAcross,
  createGridState,
  GRID_DIRECTION_COUNT,
  GridCellInfo
} from './GridState';
import { TileMesh, GRID_CELL_SIZE } from './TileMesh';

export default {
  title: 'Basic scene',
  parameters: {
    layout: 'fullscreen'
  }
} as Meta;

const GRID_WIDTH = 4;
const GRID_HEIGHT = 4;

const [GridProvider, useGridCell] = createGridState<{
  onExit?: (dir: number) => void;
}>(GRID_WIDTH, GRID_HEIGHT, {});

const TileCheck: React.FC<{
  cell: GridCellInfo<unknown>;
  direction: number;
  onResult: (isAvailable: boolean) => void;
}> = ({ cell, direction, onResult }) => {
  const [x, y] = cell.getXY();
  const [nx, ny] = cell.getNeighborXY(direction);

  const checkedCell = useGridCell(nx, ny, {});

  // interactive delay
  const { result: isReady } = useAsync(() => {
    return new Promise((resolve) => setTimeout(resolve, 200)).then(() => true);
  }, []);

  useEffect(() => {
    if (isReady) {
      onResult(!!checkedCell);
    }
  }, [isReady, checkedCell]);

  // @todo debug display
  return (
    <Line
      points={[
        [
          (x + (nx - x) * 0.5) * GRID_CELL_SIZE,
          (y + (ny - y) * 0.5) * GRID_CELL_SIZE,
          -0.1
        ],
        [
          (x + (nx - x) * 0.75) * GRID_CELL_SIZE,
          (y + (ny - y) * 0.75) * GRID_CELL_SIZE,
          -0.1
        ]
      ]}
      color="#0f0"
      lineWidth={2}
    />
  );
};

const TileProduction: React.FC<{
  cell: GridCellInfo<unknown>;
  onExhausted?: () => void;
}> = ({ cell, onExhausted }) => {
  const [currentAttempt, setCurrentAttempt] = useState<number>(0);
  const attemptDirections = useMemo(
    () =>
      [...new Array(GRID_DIRECTION_COUNT)]
        .map((_, index) => index)
        .sort(() => Math.random() - 0.5),
    []
  );

  const [productions, setProductions] = useState<number[]>([]);

  useEffect(() => {
    if (currentAttempt >= attemptDirections.length && onExhausted) {
      onExhausted();
    }
  }, [currentAttempt]);

  return (
    <>
      {productions.map((direction) => {
        const [nx, ny] = cell.getNeighborXY(direction);

        return (
          <Tile
            key={direction} // always re-create for new attempts
            entry={directionAcross(direction)}
            x={nx}
            y={ny}
          />
        );
      })}

      {currentAttempt < attemptDirections.length && (
        <TileCheck
          key={currentAttempt} // re-create on every new attempt
          cell={cell}
          direction={attemptDirections[currentAttempt]}
          onResult={(isAvailable) => {
            setProductions((prev) => [
              ...prev,
              attemptDirections[currentAttempt]
            ]);
            setCurrentAttempt(currentAttempt + 1);
          }}
        />
      )}
    </>
  );
};

const Tile: React.FC<{
  entry: number;
  x: number;
  y: number;
  onOccupied?: () => void;
  onExhausted?: () => void;
}> = ({ entry, x, y, onOccupied, onExhausted }) => {
  const [exits, setExits] = useState<number[]>([]);

  const cell = useGridCell(
    x,
    y,
    {
      onExit: (dir) =>
        setExits((prev) => (prev.indexOf(dir) === -1 ? [...prev, dir] : []))
    },
    onOccupied
  );

  useEffect(() => {
    if (!cell) {
      return;
    }

    // notify cell from which we entered to complete the link
    const fromCell = cell.getNeighbor(entry);

    if (fromCell && fromCell.onExit) {
      fromCell.onExit(directionAcross(entry));
    }
  }, [cell]);

  // nothing to do further if not claimed
  if (!cell) {
    return null;
  }

  return (
    <>
      <TileMesh x={x} y={y} entry={entry} exits={exits} />

      <TileProduction cell={cell} onExhausted={onExhausted} />
    </>
  );
};

export const Main: Story = () => (
  <Canvas
    style={{ height: '100vh' }}
    camera={{ position: [0, -1, 8], up: [0, 0, 1] }}
    shadowMap
    onCreated={({ gl }) => {
      gl.toneMapping = THREE.ACESFilmicToneMapping;
      gl.toneMappingExposure = 0.9;

      gl.outputEncoding = THREE.sRGBEncoding;
    }}
  >
    <MapControls />

    <scene>
      <ambientLight color="#a0e0ff" />

      <mesh position={[0, 0, -1]} receiveShadow>
        <planeBufferGeometry args={[10, 10]} />
        <meshLambertMaterial color="#808080" />
      </mesh>

      <group
        position={[
          -0.5 * (GRID_WIDTH - 1) * GRID_CELL_SIZE,
          -0.5 * (GRID_HEIGHT - 1) * GRID_CELL_SIZE,
          0
        ]}
      >
        <GridProvider>
          <Tile entry={3} x={0} y={0} />
        </GridProvider>
      </group>

      <directionalLight intensity={1} position={[-1, 1, 4]} castShadow />
    </scene>
  </Canvas>
);
