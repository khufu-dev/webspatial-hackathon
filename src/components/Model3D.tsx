import { Canvas, useLoader } from '@react-three/fiber'
import {
  Model,
  ModelAsset,
  ModelEntity,
  Reality,
  SceneGraph,
  Vec3,
} from "@webspatial/react-sdk";
import { Suspense } from 'react';
import { USDZLoader } from "three/examples/jsm/loaders/USDZLoader.js";

function ModelWeb({ src }: { src: string }) {
  const usdz = useLoader(USDZLoader, src);
  return (
    <>
      <primitive object={usdz} scale={2} />
    </>
  );
};

export type Model3DProps = {
  src: string;
  position: Vec3;
  scale: Vec3;
  rotation: Vec3;
  className?: string
}
export default function Model3D({ className, src, position, scale, rotation }: Model3DProps) {
  // Check if HTML model tag is supported
  const supportsModelTag = !(document.createElement("model") instanceof HTMLUnknownElement);
  const isWebSpatial = false;

  if (supportsModelTag) return <Model src={src} className={className} enable-xr />;
  if (!isWebSpatial) {
    return (
      <div className={className}>
        <Canvas>
          <Suspense fallback={null}>
            <ModelWeb src={src} />
          </Suspense>
        </Canvas>
      </div>
    );
  }
  return (
    <Reality className={className}>
      <ModelAsset id={src} src={src} />
      <SceneGraph>
        <ModelEntity
          model={src}
          position={position}
          scale={scale}
          rotation={rotation}
        />
      </SceneGraph>
    </Reality>
  );
}
