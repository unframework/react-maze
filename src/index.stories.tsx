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

const ProposedTileProduction: React.FC<{
  cell: GridCellInfo<unknown>;
}> = ({ cell }) => {
  const [attempts, setAttempts] = useState(() =>
    [...new Array(GRID_DIRECTION_COUNT)]
      .map((_, index) => index)
      .sort(() => Math.random() - 0.5)
  );

  // interactive delay (re-triggered on every attempt)
  // @todo this causes a temporary flash of ProposedTile on second/etc attempts
  const { result: isReady } = useAsync(() => {
    return new Promise((resolve) => setTimeout(resolve, 200)).then(() => true);
  }, [attempts.length]);

  // if we run out of attempts, nothing else to do
  if (attempts.length === 0) {
    return null;
  }

  const [x, y] = cell.getXY();

  const currentAttemptExit = attempts[0];
  const [nx, ny] = cell.getNeighborXY(currentAttemptExit);

  return isReady ? (
    <ProposedTile
      key={currentAttemptExit} // always re-create for new attempts
      entry={directionAcross(currentAttemptExit)}
      x={nx}
      y={ny}
      onOccupied={() => {
        // try next config
        setAttempts((prev) => prev.slice(1));
      }}
    />
  ) : (
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

const ProposedTile: React.FC<{
  isFirst?: boolean;
  entry: number;
  x: number;
  y: number;
  onOccupied?: () => void;
}> = ({ isFirst, entry, x, y, onOccupied }) => {
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

      <ProposedTileProduction cell={cell} />
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
          <ProposedTile isFirst entry={3} x={0} y={0} />
        </GridProvider>
      </group>

      <directionalLight intensity={1} position={[-1, 1, 4]} castShadow />
    </scene>
  </Canvas>
);
