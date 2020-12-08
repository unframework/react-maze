import React, { useMemo, useState, useEffect, useRef } from 'react';
import * as THREE from 'three';

const {
  Geometry: CSGGeometry
} = require('../sk-csg-modeler/packages/modeler-csg/src/index');

import { GRID_CELL_SIZE, CARDINAL_DIR_LIST } from './grid';

export const TileMesh: React.FC<{
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
          <CSGGeometry>
            <cube
              color={[1, 0, 0]}
              center={[0, 0, 0.25]}
              radius={[GRID_CELL_SIZE * 0.25, GRID_CELL_SIZE * 0.25, 0.25]}
            />
            <cube
              center={[
                nx * 0.375 * GRID_CELL_SIZE,
                ny * 0.375 * GRID_CELL_SIZE,
                0.25
              ]}
              radius={[
                GRID_CELL_SIZE * (0.25 - Math.abs(nx) * 0.125),
                GRID_CELL_SIZE * (0.25 - Math.abs(ny) * 0.125),
                0.25
              ]}
            />
            <cube
              center={[
                px * 0.375 * GRID_CELL_SIZE,
                py * 0.375 * GRID_CELL_SIZE,
                0.25
              ]}
              radius={[
                GRID_CELL_SIZE * (0.25 - Math.abs(px) * 0.125),
                GRID_CELL_SIZE * (0.25 - Math.abs(py) * 0.125),
                0.25
              ]}
            />
          </CSGGeometry>
          <meshLambertMaterial vertexColors />
        </mesh>
      </group>
    </>
  );
};
