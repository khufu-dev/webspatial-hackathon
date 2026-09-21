import { products } from "./data/products";
import { mountPage } from "./mountPage";
import { initScene, type ModelRef } from "@webspatial/react-sdk";
import { useEffect, useRef } from "react";
import Model3D from "./components/Model3D";

const ROTATION_DEGREES_PER_SECOND = 30;
const productId = new URLSearchParams(window.location.search).get("id");

export default function ProductPage() {
  const product = products.find((candidate) => candidate.id === productId);
  const target = `product-${product?.id}-volume`;
  const modelRef = useRef<ModelRef>(null);
  // Rotate animation
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
    modelRef.current?.ready?.then(() => requestAnimationFrame(animate));
    return () => {
      mounted = false;
    };
  }, []);
  // Open 3D model in a new volume container
  useEffect(() => {
    let defaultSize = { width: "800px", height: "800px", depth: "800px" };
    initScene(target, (config) => ({ ...config, defaultSize }), {
      type: "volume",
    });
  }, [target]);

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
        <p>{product.description}</p>
        <p>${product.price.toFixed(2)}</p>
        <a href={`/model.html?id=${product.id}`} target={target}>
          World Space
        </a>
        <p>
          <a href="/">Back to Store</a>
        </p>
      </article>
    </>
  );
}

mountPage(<ProductPage />);
