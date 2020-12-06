import React from 'react';
import { Story, Meta } from '@storybook/react';
import { Canvas } from 'react-three-fiber';
import * as THREE from 'three';

export default {
  title: 'Basic scene',
  parameters: {
    layout: 'fullscreen'
  }
} as Meta;

export const Main: Story = () => (
  <Canvas
    style={{ height: '100vh' }}
    camera={{ position: [-6, -4, 2], up: [0, 0, 1] }}
    shadowMap
    onCreated={({ gl }) => {
      gl.toneMapping = THREE.ACESFilmicToneMapping;
      gl.toneMappingExposure = 0.9;

      gl.outputEncoding = THREE.sRGBEncoding;
    }}
  >
    <scene>
      <mesh position={[0, 0, -3]} receiveShadow>
        <planeBufferGeometry attach="geometry" args={[20, 20]} />
        <meshLambertMaterial attach="material" color="#808080" />
      </mesh>

      <mesh position={[0, 1.5, 0]} castShadow receiveShadow>
        <boxBufferGeometry attach="geometry" args={[2, 2, 5]} />
        <meshLambertMaterial attach="material" color="#c0c0c0" />
      </mesh>

      <mesh position={[0, -1.5, -1.5]} castShadow receiveShadow>
        <boxBufferGeometry attach="geometry" args={[2, 2, 2]} />
        <meshLambertMaterial
          attach="material"
          color="#0000ff"
          emissive="#0000ff"
          emissiveIntensity={0.25}
        />
      </mesh>

      <mesh position={[0, -1.5, 1.5]} castShadow receiveShadow>
        <boxBufferGeometry attach="geometry" args={[2, 2, 2]} />
        <meshLambertMaterial attach="material" color="#ff0000" />
      </mesh>

      <directionalLight intensity={1} position={[-2.5, 2.5, 4]} castShadow />
    </scene>
  </Canvas>
);
