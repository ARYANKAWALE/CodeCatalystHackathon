import { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float } from '@react-three/drei';
import * as THREE from 'three';
import { useTheme } from '../context/ThemeContext';

function FloatingShape({ position, color, speed, scale, shape }) {
  const ref = useRef();
  const offset = useMemo(() => Math.random() * Math.PI * 2, []);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime() * speed + offset;
    ref.current.rotation.x = t * 0.4;
    ref.current.rotation.y = t * 0.3;
    ref.current.position.y = position[1] + Math.sin(t) * 0.3;
  });

  const geometry = useMemo(() => {
    switch (shape) {
      case 'icosahedron': return new THREE.IcosahedronGeometry(1, 0);
      case 'octahedron': return new THREE.OctahedronGeometry(1, 0);
      case 'torus': return new THREE.TorusGeometry(1, 0.4, 8, 16);
      case 'torusKnot': return new THREE.TorusKnotGeometry(0.8, 0.25, 64, 8);
      case 'dodecahedron': return new THREE.DodecahedronGeometry(1, 0);
      default: return new THREE.IcosahedronGeometry(1, 0);
    }
  }, [shape]);

  return (
    <Float speed={1.5} floatIntensity={0.5}>
      <mesh ref={ref} position={position} scale={scale} geometry={geometry}>
        <meshStandardMaterial
          color={color}
          transparent
          opacity={0.15}
          wireframe
          emissive={color}
          emissiveIntensity={0.1}
        />
      </mesh>
    </Float>
  );
}

function Particles({ count = 80, dark }) {
  const ref = useRef();
  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      arr[i * 3] = (Math.random() - 0.5) * 20;
      arr[i * 3 + 1] = (Math.random() - 0.5) * 20;
      arr[i * 3 + 2] = (Math.random() - 0.5) * 10;
    }
    return arr;
  }, [count]);

  useFrame(({ clock }) => {
    ref.current.rotation.y = clock.getElapsedTime() * 0.02;
    ref.current.rotation.x = Math.sin(clock.getElapsedTime() * 0.015) * 0.1;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial size={0.04} color={dark ? '#a5b4fc' : '#c7d2fe'} transparent opacity={0.6} sizeAttenuation />
    </points>
  );
}

function Scene() {
  const { dark } = useTheme();
  const shapes = useMemo(() => [
    { position: [-4, 2, -3], color: '#818cf8', speed: 0.3, scale: 1.2, shape: 'icosahedron' },
    { position: [4, -1, -4], color: '#c084fc', speed: 0.25, scale: 0.9, shape: 'octahedron' },
    { position: [-2, -2.5, -2], color: '#60a5fa', speed: 0.35, scale: 0.7, shape: 'dodecahedron' },
    { position: [3, 2.5, -5], color: '#f472b6', speed: 0.2, scale: 1.0, shape: 'torus' },
    { position: [0, -3, -6], color: '#34d399', speed: 0.15, scale: 0.8, shape: 'torusKnot' },
    { position: [-3.5, 0, -5], color: '#fbbf24', speed: 0.28, scale: 0.6, shape: 'octahedron' },
  ], []);

  return (
    <>
      <ambientLight intensity={0.4} />
      <pointLight position={[5, 5, 5]} intensity={0.6} color={dark ? '#818cf8' : '#667eea'} />
      <pointLight position={[-5, -5, 3]} intensity={0.3} color="#c084fc" />
      {shapes.map((s, i) => <FloatingShape key={i} {...s} />)}
      <Particles dark={dark} />
    </>
  );
}

export default function AuthBackground() {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 0 }}>
      <Canvas
        camera={{ position: [0, 0, 6], fov: 50 }}
        dpr={[1, 1.5]}
        gl={{ antialias: true, alpha: true }}
        style={{ background: 'transparent' }}
      >
        <Scene />
      </Canvas>
    </div>
  );
}
