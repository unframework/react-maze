import React, { useMemo, useState, useEffect, useRef } from 'react';
import { useAsyncCallback } from 'react-async-hook';
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
  onExhausted?: () => void;
}> = ({ cell, onExhausted }) => {
  const [directions] = useState(() =>
    [...new Array(GRID_DIRECTION_COUNT)]
      .map((_, index) => index)
      .sort(() => Math.random() - 0.5)
  );

  const [attempts, setAttempts] = useState<boolean[]>([]);

  // interactive delay (re-triggered on every attempt)
  const { result: currentAttempt, execute } = useAsyncCallback(
    (attempt: number) => {
      return new Promise((resolve) => setTimeout(resolve, 200)).then(
        () => attempt
      );
    }
  );

  useEffect(() => {
    if (currentAttempt === undefined) {
      return;
    }

    if (currentAttempt >= directions.length) {
      if (onExhausted) onExhausted();
    } else {
      setAttempts((prev) => [...prev, true]);
    }
  }, [currentAttempt]);

  useEffect(() => {
    execute(0);
  }, []);

  return (
    <>
      {attempts.map((attempt, index) => {
        // check for a dud
        if (!attempt) {
          return null;
        }

        const currentAttemptExit = directions[index];
        const [nx, ny] = cell.getNeighborXY(currentAttemptExit);

        return (
          <ProposedTile
            key={currentAttemptExit} // always re-create for new attempts
            entry={directionAcross(currentAttemptExit)}
            x={nx}
            y={ny}
            onOccupied={() => {
              // mark as a dud
              setAttempts((prev) => [
                ...prev.slice(0, index),
                false,
                ...prev.slice(index + 1)
              ]);

              // kick off next attempt delay
              execute(index + 1);
            }}
            onExhausted={() => {
              execute(index + 1);
            }}
          />
        );
      })}
    </>
  );
};

const ProposedTile: React.FC<{
  isFirst?: boolean;
  entry: number;
  x: number;
  y: number;
  onOccupied?: () => void;
  onExhausted?: () => void;
}> = ({ isFirst, entry, x, y, onOccupied, onExhausted }) => {
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

      <ProposedTileProduction cell={cell} onExhausted={onExhausted} />
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
