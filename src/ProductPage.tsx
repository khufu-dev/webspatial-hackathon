import { products } from "./data/products";
import { mountPage } from "./mountPage";
import type { ModelRef } from "@webspatial/react-sdk";
import { useEffect, useRef, useState } from "react";
import Model3D from "./components/Model3D";

const ROTATION_DEGREES_PER_SECOND = 30;
const productId = new URLSearchParams(window.location.search).get("id");

type ModelGeometryRef = ModelRef & {
  readonly boundingBoxExtents: DOMPointReadOnly;
  readonly boundingBoxCenter: DOMPointReadOnly;
};

type ModelMetrics = {
  boundingBoxExtents: DOMPointReadOnly;
  boundingBoxCenter: DOMPointReadOnly;
  scale: DOMPointReadOnly;
};

export default function ProductPage() {
  const product = products.find((candidate) => candidate.id === productId);
  const modelRef = useRef<ModelGeometryRef>(null);
  const [modelMetrics, setModelMetrics] = useState<ModelMetrics>();

  useEffect(() => {
    let mounted = true;
    let lastTimestamp: DOMHighResTimeStamp | undefined;

    function animate(timestamp: DOMHighResTimeStamp) {
      if (!mounted) return;

      const deltaSeconds =
        lastTimestamp === undefined ? 0 : (timestamp - lastTimestamp) / 1000;
      lastTimestamp = timestamp;
      const { current } = modelRef;
      if (current) {
        const rotY = ROTATION_DEGREES_PER_SECOND * deltaSeconds;
        current.entityTransform = DOMMatrix.fromMatrix(
          current.entityTransform,
        ).rotateSelf(0, rotY, 0);
      }
      requestAnimationFrame(animate);
    }

    const model = modelRef.current;
    model?.ready?.then(() => {
      if (!mounted) return;

      const { boundingBoxExtents, boundingBoxCenter, entityTransform } = model;
      const scale = new DOMPointReadOnly(
        Math.hypot(
          entityTransform.m11,
          entityTransform.m12,
          entityTransform.m13,
        ),
        Math.hypot(
          entityTransform.m21,
          entityTransform.m22,
          entityTransform.m23,
        ),
        Math.hypot(
          entityTransform.m31,
          entityTransform.m32,
          entityTransform.m33,
        ),
      );
      setModelMetrics({ boundingBoxExtents, boundingBoxCenter, scale });
      requestAnimationFrame(animate);
    });

    return () => {
      mounted = false;
    };
  }, []);

  if (!product) {
    console.warn(`Product ${productId} not found`);
    return (location.href = "/");
  }
  return (
    <>
      <title>{product.name}</title>
      <h1>{product.name}</h1>
      <Model3D
        className="model"
        src={product.model}
        poster={product.image}
        alt={product.name}
        ref={modelRef}
      />
      <article>
        <h2>Description</h2>
        <dl>
          <dt>Description</dt>
          <dd>{product.description}</dd>
          <dt>Price</dt>
          <dd>${product.price.toFixed(2)}</dd>
          <dt>Container size (px)</dt>
          <dd>
            ({modelRef?.current?.offsetWidth}, {modelRef?.current?.offsetHeight}
            )
          </dd>
          <dt>Extents (m SI)</dt>
          <dd>{formatVector(modelMetrics?.boundingBoxExtents)}</dd>
          <dt>Center</dt>
          <dd>{formatVector(modelMetrics?.boundingBoxCenter)}</dd>
          <dt>Scale</dt>
          <dd>{formatVector(modelMetrics?.scale)}</dd>
        </dl>
        <a href="/">Back to Store</a>
      </article>
    </>
  );
}

function formatVector({ x, y, z }: DOMPointReadOnly = new DOMPointReadOnly()) {
  return `(x: ${x.toFixed(4)}, y: ${y.toFixed(4)}, z: ${z.toFixed(4)})`;
}

mountPage(<ProductPage />);
