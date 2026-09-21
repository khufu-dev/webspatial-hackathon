import { products } from "./data/products";
import { mountPage } from "./mountPage";
import "./ProductPage.css";
import type { ModelRef } from "@webspatial/react-sdk";
import { useEffect, useRef } from "react";
import Model3D from "./components/Model3D";

const ROTATION_DEGREES_PER_SECOND = 30;
const productId = new URLSearchParams(window.location.search).get("id");

export default function ProductPage() {
  const product = products.find((candidate) => candidate.id === productId);
  const modelRef = useRef<ModelRef>(null);
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

  if (!product) {
    return (
      <>
        <title>Product Not Found | WebSpatial Store</title>
        <div className="app">
          <h1>Product Not Found</h1>
          <p>The product you’re looking for doesn’t exist.</p>
          <a href="/">Back to Store</a>
        </div>
      </>
    );
  }
  return (
    <>
      <title>{product.name} | WebSpatial fStore</title>
      <div className="productPage">
        <div>
          <h1 className="product-name">{product.name}</h1>
          <Model3D
            className="product-3D"
            src={product.model}
            poster={product.image}
            alt={product.name}
            ref={modelRef}
          />
          <article>
            <h2>Description</h2>
            <p>{product.description}</p>
            <p>${product.price.toFixed(2)}</p>
            <a href="/">Back to Store</a>
          </article>
        </div>
      </div>
    </>
  );
}

mountPage(<ProductPage />);
