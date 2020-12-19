import React, { useMemo, useState, useEffect, useRef } from 'react';
import { useAsync } from 'react-async-hook';
import { Story, Meta } from '@storybook/react';
import { Canvas } from 'react-three-fiber';
import { MapControls } from '@react-three/drei/MapControls';
import { Line } from '@react-three/drei/Line';
import * as THREE from 'three';

import { directionXY, directionAcross, createGridState } from './GridState';
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
  onExit?: (exit: number) => void;
}>(GRID_WIDTH, GRID_HEIGHT, {});

const TileMeshPreview: React.FC<{
  x: number;
  y: number;
  entry: number;
}> = ({ entry, x, y }) => {
  const [px, py] = directionXY(entry);

  return (
    <>
      <mesh position={[x * GRID_CELL_SIZE, y * GRID_CELL_SIZE, 0]} castShadow>
        <planeBufferGeometry
          args={[GRID_CELL_SIZE * 0.8, GRID_CELL_SIZE * 0.8]}
        />
        <meshLambertMaterial color="#f00" shadowSide={THREE.FrontSide} />

        <Line
          points={[
            [px * 0.4 * GRID_CELL_SIZE, py * 0.4 * GRID_CELL_SIZE, -0.1],
            [px * 0.5 * GRID_CELL_SIZE, py * 0.5 * GRID_CELL_SIZE, -0.1]
          ]}
          color="#00f"
          lineWidth={2}
        />
      </mesh>
    </>
  );
};

const ProposedTileProduction: React.FC<{
  x: number;
  y: number;
  onPlaced: (exit: number) => void;
}> = ({ x, y, onPlaced }) => {
  const [attempts, setAttempts] = useState(() =>
    [...new Array(4)].map((_, index) => index).sort(() => Math.random() - 0.5)
  );

  // interactive delay (re-triggered on every attempt)
  const { result: isReady } = useAsync(() => {
    return new Promise((resolve) => setTimeout(resolve, 200)).then(() => true);
  }, [attempts.length]);

  // if we run out of attempts, nothing else to do
  if (attempts.length === 0) {
    return null;
  }

  const currentAttemptExit = attempts[0];
  const nextEntry = directionAcross(currentAttemptExit); // diametral opposite
  const [dx, dy] = directionXY(currentAttemptExit);

  return isReady ? (
    <ProposedTile
      key={currentAttemptExit} // always re-create for new attempts
      entry={nextEntry}
      x={x + dx}
      y={y + dy}
      onPlaced={() => {
        onPlaced(currentAttemptExit);
      }}
      onOccupied={() => {
        // try next config
        setAttempts((prev) => prev.slice(1));
      }}
    />
  ) : (
    <Line
      points={[
        [
          (x + dx * 0.5) * GRID_CELL_SIZE,
          (y + dy * 0.5) * GRID_CELL_SIZE,
          -0.1
        ],
        [
          (x + dx * 0.75) * GRID_CELL_SIZE,
          (y + dy * 0.75) * GRID_CELL_SIZE,
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
  onPlaced?: () => void;
  onOccupied?: () => void;
}> = ({ isFirst, entry, x, y, onPlaced, onOccupied }) => {
  const [exit, setExit] = useState<number | null>(null);

  const cell = useGridCell(x, y, {}, onOccupied);

  useEffect(() => {
    if (cell && onPlaced) {
      onPlaced();
    }
  }, [cell]);

  // nothing to do further if not claimed
  if (!cell) {
    return null;
  }

  return (
    <>
      {exit === null ? (
        <TileMeshPreview x={x} y={y} entry={entry} />
      ) : (
        <TileMesh x={x} y={y} entry={entry} exit={exit} />
      )}

      <ProposedTileProduction x={x} y={y} onPlaced={setExit} />
    </>
  );
};

export const Main: Story = () => (
  <Canvas
    style={{ height: '100vh' }}
    camera={{ position: [0, -1, 5], up: [0, 0, 1] }}
    shadowMap
    onCreated={({ gl }) => {
      gl.toneMapping = THREE.ACESFilmicToneMapping;
      gl.toneMappingExposure = 0.9;

      gl.outputEncoding = THREE.sRGBEncoding;
    }}
  >
    <MapControls />

    <scene>
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
