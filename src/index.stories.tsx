import React, { useMemo, useState, useEffect, useRef } from 'react';
import { useAsync } from 'react-async-hook';
import { Story, Meta } from '@storybook/react';
import { Canvas } from 'react-three-fiber';
import { MapControls } from '@react-three/drei/MapControls';
import { Line } from '@react-three/drei/Line';
import * as THREE from 'three';
import { CSG } from '@jscad/csg';

import { CSGGeometry } from './CSGMesh';

export default {
  title: 'Basic scene',
  parameters: {
    layout: 'fullscreen'
  }
} as Meta;

const GRID_WIDTH = 4;
const GRID_HEIGHT = 4;
const GRID_CELL_SIZE = 2;

const CARDINAL_DIR_LIST = [
  [1, 0],
  [0, 1],
  [-1, 0],
  [0, -1]
];

const TileMeshPreview: React.FC<{
  x: number;
  y: number;
  entry: number;
}> = ({ entry, x, y }) => {
  const [px, py] = CARDINAL_DIR_LIST[entry];

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

const TileMesh: React.FC<{
  x: number;
  y: number;
  entry: number;
  exit: number;
}> = ({ entry, exit, x, y }) => {
  const [px, py] = CARDINAL_DIR_LIST[entry];
  const [nx, ny] = CARDINAL_DIR_LIST[exit];

  return (
    <>
      <group position={[x * GRID_CELL_SIZE, y * GRID_CELL_SIZE, 0]}>
        <mesh castShadow receiveShadow>
          <CSGGeometry
            csg={() =>
              CSG.cube({
                center: [0, 0, 0.25],
                radius: [GRID_CELL_SIZE * 0.25, GRID_CELL_SIZE * 0.25, 0.25]
              }).union(
                CSG.cube({
                  center: [
                    nx * 0.375 * GRID_CELL_SIZE,
                    ny * 0.375 * GRID_CELL_SIZE,
                    0.25
                  ],
                  radius: [
                    GRID_CELL_SIZE * (0.25 - Math.abs(nx) * 0.125),
                    GRID_CELL_SIZE * (0.25 - Math.abs(ny) * 0.125),
                    0.25
                  ]
                }).union(
                  CSG.cube({
                    center: [
                      px * 0.375 * GRID_CELL_SIZE,
                      py * 0.375 * GRID_CELL_SIZE,
                      0.25
                    ],
                    radius: [
                      GRID_CELL_SIZE * (0.25 - Math.abs(px) * 0.125),
                      GRID_CELL_SIZE * (0.25 - Math.abs(py) * 0.125),
                      0.25
                    ]
                  }).setColor([1, 0, 0])
                )
              )
            }
          />
          <meshLambertMaterial vertexColors />
        </mesh>
      </group>
    </>
  );
};

const ProposedTileOffshoot: React.FC<{
  grid: number[];
  x: number;
  y: number;
  onPlaced: (exit: number) => void;
}> = ({ grid, x, y, onPlaced }) => {
  const onPlacedRef = useRef(onPlaced);
  onPlacedRef.current = onPlaced;

  const [attempts, setAttempts] = useState(() =>
    CARDINAL_DIR_LIST.map((_, index) => index).sort(() => Math.random() - 0.5)
  );

  const { result: isReady } = useAsync(() => {
    return new Promise((resolve) => setTimeout(resolve, 200)).then(() => true);
  }, [attempts]);

  if (attempts.length === 0) {
    return null;
  }

  const exit = attempts[0];
  const nextEntry = (exit + 2) % CARDINAL_DIR_LIST.length; // diametral opposite
  const [dx, dy] = CARDINAL_DIR_LIST[exit];

  return isReady ? (
    <ProposedTile
      grid={grid}
      entry={nextEntry}
      x={x + dx}
      y={y + dy}
      onPlaced={() => {
        onPlacedRef.current(exit);
      }}
      onRejected={() => {
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
  grid?: number[];
  entry: number;
  x: number;
  y: number;
  onPlaced?: () => void;
  onRejected?: () => void;
}> = ({ grid, entry, x, y, onPlaced, onRejected }) => {
  const onPlacedRef = useRef(onPlaced);
  onPlacedRef.current = onPlaced;
  const onRejectedRef = useRef(onRejected);
  onRejectedRef.current = onRejected;

  const [exit, setExit] = useState(null as number | null);

  const updatedGrid = useMemo(() => {
    if (x < 0 || x >= GRID_WIDTH || y < 0 || y >= GRID_HEIGHT) {
      return null;
    }

    const currentGrid = grid || [];
    const cellIndex = y * GRID_WIDTH + x;

    if (currentGrid[cellIndex]) {
      return null;
    }

    const result = [...currentGrid];
    result[cellIndex] = 1;
    return result;
  }, [grid, x, y]);

  useEffect(() => {
    if (!updatedGrid && onRejectedRef.current) {
      onRejectedRef.current();
    }

    if (updatedGrid && onPlacedRef.current) {
      onPlacedRef.current();
    }
  }, [updatedGrid]);

  if (!updatedGrid) {
    return null;
  }

  return (
    <>
      {exit === null ? (
        <TileMeshPreview x={x} y={y} entry={entry} />
      ) : (
        <TileMesh x={x} y={y} entry={entry} exit={exit} />
      )}

      {updatedGrid && (
        <ProposedTileOffshoot
          grid={updatedGrid}
          x={x}
          y={y}
          onPlaced={setExit}
        />
      )}
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
        <ProposedTile entry={3} x={0} y={0} />
      </group>

      <directionalLight intensity={1} position={[-1, 1, 4]} castShadow />
    </scene>
  </Canvas>
);
