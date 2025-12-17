import { Canvas } from '@react-three/fiber'
import { USDZLoader } from 'three-usdz-loader';
import {
  Model,
  ModelAsset,
  ModelEntity,
  Reality,
  SceneGraph,
  Vec3,
} from "@webspatial/react-sdk";
import { useEffect, useRef } from 'react';
import { Group, Object3DEventMap } from 'three';
import { USDZInstance } from 'three-usdz-loader/lib/USDZInstance';

function ModelWeb({ src }: { src: string }) {
  const groupRef = useRef<Group<Object3DEventMap>>(null);

  useEffect(() => {
    let model: USDZInstance | undefined;
    const loadModel = async () => {
      const loader = new USDZLoader();
      const response = await fetch(src);
      const blob = await response.blob()
      const file = new File([blob], "model.usdz");
      if (groupRef.current !== null) {
        model = await loader.loadFile(file, groupRef.current);
      }
    }
    loadModel();
    return () => { model?.clear(); };
  }, [src]);

  return (<group ref={groupRef} dispose={null}></group>);
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
          <ModelWeb src={src} />
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
