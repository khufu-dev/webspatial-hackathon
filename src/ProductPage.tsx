import { Link, useParams } from "react-router";
import { products } from "./data/products";
import "./ProductPage.css";
import { ModelRef } from "@webspatial/react-sdk";
import { useEffect, useRef } from "react";
import Model3D from "./components/Model3D";

export default function ProductPage() {
  const { id } = useParams<{ id: string }>();
  const product = products.find((p) => p.id === id);
  const modelRef = useRef<ModelRef>(null);
  useEffect(() => {
    let mounted = true;
    function animate() {
      if (!mounted) return;
      const { current } = modelRef;
      if (current) {
        current.entityTransform = 
          DOMMatrix.fromMatrix(current.entityTransform).rotateSelf(0, 0.5, 0)
      }
      requestAnimationFrame(animate);
    }
    modelRef.current?.ready?.then(animate);
    return () => { mounted = false; };
  }, []);

  if (!product) {
    return (
      <div className="app">
        <h1>Product Not Found</h1>
        <p>The product you’re looking for doesn’t exist.</p>
        <Link to="/">Back to Store</Link>
      </div>
    );
  }
  return (
    <div className="productPage">
      <div>
        <h1 className="product-name">
          {product.name}
        </h1>
        <Model3D
          className="product-3D"
          src={product.model}
          imgSrc={product.image}
          alt={product.name}
          ref={modelRef}
        />
        <article>
          <h2>Description</h2>
          <p>{product.description}</p>
          <p>${product.price.toFixed(2)}</p>
          <Link to="/">Back to Store</Link>
        </article>
      </div>
    </div>
  );
}
