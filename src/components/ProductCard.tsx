import { Product } from "../types";
import { Link } from "react-router-dom";
import {
  ModelAsset,
  ModelEntity,
  Reality,
  SceneGraph,
} from "@webspatial/react-sdk";

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  return (
    <div className="product-card">
      <Reality style={{ width: "100px", height: "200px", "--xr-depth": 100 }}>
        <ModelAsset
          id={product.model}
          src={`${import.meta.env.BASE_URL}${product.model}`}
        />
        <SceneGraph>
          <ModelEntity
            model={product.model}
            position={product.position}
            scale={product.scale}
            rotation={product.rotation}
          />
        </SceneGraph>
      </Reality>
      <h3 className="product-name">{product.name}</h3>
      <p className="product-description">{product.description}</p>
      <p className="product-price">${product.price.toFixed(2)}</p>
      <div className="product-card-footer">
        <Link
          to={`/product/${product.id}`}
          style={{ textDecoration: "none" }}
          className="add-to-cart-btn"
        >
          Go to product
        </Link>
      </div>
      {
        //<div style={{ marginTop: "1.5rem" }}>
        //  <AddToCart product={product.id} />
        //</div>
      }
    </div>
  );
}
