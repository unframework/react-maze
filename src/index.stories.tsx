import React, { useMemo, useState, useEffect, useRef } from 'react';
import { useAsync } from 'react-async-hook';
import { Story, Meta } from '@storybook/react';
import { Canvas } from 'react-three-fiber';
import { MapControls } from '@react-three/drei/MapControls';
import { Line } from '@react-three/drei/Line';
import * as THREE from 'three';

export default {
  title: 'Basic scene',
  parameters: {
    layout: 'fullscreen'
  }
} as Meta;

const GRID_WIDTH = 4;
const GRID_HEIGHT = 4;

const CARDINAL_DIR_LIST = [
  [1, 0],
  [0, 1],
  [-1, 0],
  [0, -1]
];

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
        [x + dx * 0.5, y + dy * 0.5, 0.1],
        [x + dx * 0.75, y + dy * 0.75, 0.1]
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

  const [px, py] = CARDINAL_DIR_LIST[entry];
  const [nx, ny] = exit === null ? [] : CARDINAL_DIR_LIST[exit];

  return (
    <>
      <mesh position={[x, y, 0]} castShadow>
        <planeBufferGeometry args={[0.8, 0.8]} />
        <meshLambertMaterial color="#f00" shadowSide={THREE.FrontSide} />
      </mesh>

      <Line
        points={[
          [x + px * 0.4, y + py * 0.4, -0.1],
          [x + px * 0.5, y + py * 0.5, -0.1]
        ]}
        color="#00f"
        lineWidth={2}
      />

      {exit !== null && (
        <Line
          points={[
            [x + nx * 0.4, y + ny * 0.4, -0.1],
            [x + nx * 0.5, y + ny * 0.5, -0.1]
          ]}
          color="#f0f"
          lineWidth={2}
        />
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

      <group position={[-0.5 * (GRID_WIDTH - 1), -0.5 * (GRID_HEIGHT - 1), 0]}>
        <ProposedTile entry={3} x={0} y={0} />
      </group>

      <directionalLight intensity={1} position={[-1, 1, 4]} castShadow />
    </scene>
  </Canvas>
);
