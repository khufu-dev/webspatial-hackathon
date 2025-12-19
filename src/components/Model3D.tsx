import {
  Model,
  Vec3,
} from "@webspatial/react-sdk";

export type Model3DProps = {
  src: string;
  position: Vec3;
  scale: Vec3;
  rotation: Vec3;
  className?: string
}
export default function Model3D({ className, src }: Model3DProps) {
  return <Model src={src} className={className} enable-xr />;
}