import { Model, type ModelProps, type ModelRef } from "@webspatial/react-sdk";
import type { Ref } from "react";
import "./model-element-polyfill.js";
import "./Model3D.css";

export type Model3DProps = ModelProps & {
  alt: string;
  ref?: Ref<ModelRef>;
};
export default function Model3D({
  className,
  poster,
  alt,
  ref,
  ...restProps
}: Model3DProps) {
  return (
    <Model
      enable-xr
      className={`model3D ${className}`}
      ref={ref}
      poster={poster}
      {...restProps}
    >
      <img src={poster} alt={alt} />
    </Model>
  );
}
