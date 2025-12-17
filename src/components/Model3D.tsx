import {
  Model,
  ModelAsset,
  ModelEntity,
  Reality,
  SceneGraph,
  Vec3,
} from "@webspatial/react-sdk";

export type Model3DProps = {
  src: string;
  position: Vec3;
  scale: Vec3;
  rotation: Vec3;
  className?: string
}
export default function Model3D({ className, src, position, scale, rotation }: Model3DProps) {
  // Check if HTML model tag is supported
  const modelSupported = !(document.createElement("model") instanceof HTMLUnknownElement);

  if (modelSupported) return <Model src={src} className={className} />;
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