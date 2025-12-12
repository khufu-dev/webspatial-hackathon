import { Link, useParams } from "react-router-dom";
import { products } from "./data/products";
import "./App.css";
import {
  BoxEntity,
  ModelAsset,
  ModelEntity,
  Reality,
  SceneGraph,
  UnlitMaterial,
} from "@webspatial/react-sdk";
import { useEffect, useState } from "react";
import { CartProvider, useCart } from "./context/CartContext";

export default function ProductPage() {
  const { id } = useParams<{ id: string }>();
  const product = products.find((p) => p.id === id);

  if (!product) {
    return (
      <div className="app">
        <h1>Product Not Found</h1>
        <p>The product you’re looking for doesn’t exist.</p>
        <Link to="/">Back to Store</Link>
      </div>
    );
  }

  const [rotation, setRotation] = useState({ x: 0, y: 0, z: 0 });
  useEffect(() => {
    let id: number;
    function animate() {
      setRotation((prev) => ({ ...prev, y: prev.y + 1.0 }));
      id = requestAnimationFrame(animate);
    }
    animate();
    return () => cancelAnimationFrame(id);
  }, []);

  //const modelUrl = (product as any).modelUrl as string | undefined;

  return (
    <div className="app">
      <div
        style={{
          maxWidth: 720,
          margin: "10 auto",
          padding: "1rem",
          backgroundColor: "white",
        }}
      >
        <h1 className="product-name" style={{ marginTop: "1rem" }}>
          {product.name}
        </h1>
        <Reality style={{ width: "500px", height: "500px", "--xr-depth": 100 }}>
          <UnlitMaterial id="red" color="#ff0000" />
          <ModelAsset
            id="mainModel"
            src={`${import.meta.env.BASE_URL}${product.model}`}
          />
          <SceneGraph>
            <ModelEntity
              model="mainModel"
              position={{ x: 0.0, y: -0.05, z: 0.1 }}
              scale={{ x: 0.2, y: 0.2, z: 0.2 }}
              rotation={rotation}
            />
            {
              //  <BoxEntity
              //  materials={["red"]}
              //  width={0.1}
              //  height={0.2}
              //  depth={0.1}
              //  rotation={rotation}
              ///>
            }
          </SceneGraph>
        </Reality>
        <p className="product-price">
          ${product.price.toFixed(2)}
        </p>

        <h2 style={{ marginTop: "1rem" }}>Description</h2>
        <p className="product-description">{product.description}</p>
        <div style={{ marginTop: "1.5rem" }}>
          <Link to="/">Back to Store</Link>
        </div>
      </div>
    </div>
  );
}
