import React, { useMemo, useState, useRef } from 'react';
import * as THREE from 'three';

import { CSG, Vector as CSGVector } from '@jscad/csg';

// polygon conversion is copy-pasted from https://github.com/szymonkaliski/modeler/blob/master/packages/modeler-csg/src/utils.js
const {
  createRootElement,
  CSGRenderer
} = require('../sk-csg-modeler/packages/modeler-csg/src/reconciler');

export const CSGGeometry: React.FC = ({ children }) => {
  // read once
  const childrenRef = useRef(children);

  // generate the model
  const model = useMemo(() => {
    // content accumulator object as fiber container root
    const rootObject = createRootElement();

    // create and populate fiber tree
    const fiberContainer = CSGRenderer.createContainer(rootObject);
    CSGRenderer.updateContainer(childrenRef.current, fiberContainer, null);

    // read directly from root object
    // (using getPublicRootInstance on root fiber node does not return entire content)
    return rootObject.content;
  }, []);

  // convert CSG model polygons to Three
  const geometry = useMemo(() => {
    const polygons = model.toPolygons();

    const geometry = new THREE.Geometry();

    // @todo de-duplicate
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
        const color = polygons[i].shared.color;

        const face = new THREE.Face3(
          vertices[0],
          vertices[j - 1],
          vertices[j],
          new THREE.Vector3(normal.x, normal.y, normal.z),
          color
            ? new THREE.Color(
                ((color[0] * 255) << 16) |
                  ((color[1] * 255) << 8) |
                  (color[2] * 255)
              )
            : undefined
        );

        geometry.faces.push(face);
      }
    }

    geometry.computeVertexNormals();
    geometry.computeBoundingBox();

    return geometry;
  }, [model]);

  return <primitive attach="geometry" object={geometry} />;
};
