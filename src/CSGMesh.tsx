import React, { useState } from 'react';
import * as THREE from 'three';
import { CSG, Vector as CSGVector } from '@jscad/csg';

// polygon conversion is copy-pasted from https://github.com/szymonkaliski/modeler/blob/master/packages/modeler-csg/src/utils.js

export const CSGMesh: React.FC<{ csg: () => CSG }> = ({ csg, children }) => {
  const [geometry] = useState(() => {
    // construct the CSG and get polygons
    const polygons = csg().toPolygons();

    // convert to Three
    const geometry = new THREE.Geometry();

    const getGeometryVertice = (v: CSGVector) => {
      geometry.vertices.push(new THREE.Vector3(v.x, v.y, v.z));
      return geometry.vertices.length - 1;
    };

    for (let i = 0; i < polygons.length; i++) {
      let vertices = [];

      for (let j = 0; j < polygons[i].vertices.length; j++) {
        vertices.push(getGeometryVertice(polygons[i].vertices[j].pos));
      }

      if (vertices[0] === vertices[vertices.length - 1]) {
        vertices.pop();
      }

      for (let j = 2; j < vertices.length; j++) {
        const normal = polygons[i].plane.normal;
        const face = new THREE.Face3(
          vertices[0],
          vertices[j - 1],
          vertices[j],
          new THREE.Vector3().set(normal.x, normal.y, normal.z)
        );

        geometry.faces.push(face);
      }
    }

    geometry.computeVertexNormals();
    geometry.computeBoundingBox();

    return geometry;
  });

  return <mesh geometry={geometry}>{children}</mesh>;
};