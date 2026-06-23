import { useEffect, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { useVisiteStore } from "./store";

function PanoSphere({ url }: { url: string }) {
  const texture = useRef<THREE.Texture | null>(null);
  const meshRef = useRef<THREE.Mesh>(null);
  const { gl } = useThree();

  useEffect(() => {
    const loader = new THREE.TextureLoader();
    let cancelled = false;
    loader.load(url, (tex) => {
      if (cancelled) {
        tex.dispose();
        return;
      }
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = gl.capabilities.getMaxAnisotropy();
      const old = texture.current;
      texture.current = tex;
      if (meshRef.current) {
        const mat = meshRef.current.material as THREE.MeshBasicMaterial;
        mat.map = tex;
        mat.needsUpdate = true;
      }
      old?.dispose();
    });
    return () => {
      cancelled = true;
    };
  }, [url, gl]);

  useEffect(() => {
    return () => {
      texture.current?.dispose();
    };
  }, []);

  return (
    <mesh ref={meshRef} scale={[-1, 1, 1]}>
      <sphereGeometry args={[100, 64, 32]} />
      <meshBasicMaterial side={THREE.BackSide} />
    </mesh>
  );
}

function CameraSync() {
  const { camera, size } = useThree();
  useFrame(() => {
    const { yaw, pitch, fov } = useVisiteStore.getState();
    const persp = camera as THREE.PerspectiveCamera;
    if (persp.fov !== fov) {
      persp.fov = fov;
      persp.aspect = size.width / Math.max(1, size.height);
      persp.updateProjectionMatrix();
    }
    // Look in direction of yaw/pitch
    const x = Math.sin(yaw) * Math.cos(pitch);
    const y = Math.sin(pitch);
    const z = -Math.cos(yaw) * Math.cos(pitch);
    camera.lookAt(x, y, z);
  });
  return null;
}

// Preload the next room's panorama so transitions don't flash.
function PreloadHint({ urls }: { urls: string[] }) {
  useEffect(() => {
    const loader = new THREE.TextureLoader();
    const loaded: THREE.Texture[] = [];
    urls.forEach((u) => loader.load(u, (t) => loaded.push(t)));
    return () => {
      loaded.forEach((t) => t.dispose());
    };
  }, [urls]);
  return null;
}

export function PanoramaScene({
  panoramaUrl,
  preloadUrls,
}: {
  panoramaUrl: string;
  preloadUrls: string[];
}) {
  return (
    <Canvas
      camera={{ position: [0, 0, 0.001], fov: 70, near: 0.1, far: 1000 }}
      dpr={[1, 2]}
      gl={{ antialias: true }}
    >
      <PanoSphere url={panoramaUrl} />
      <CameraSync />
      <PreloadHint urls={preloadUrls} />
    </Canvas>
  );
}
