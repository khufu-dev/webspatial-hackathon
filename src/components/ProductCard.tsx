import { Product } from "../types";
import { Link } from "react-router-dom";
import { AddToCart } from "./AddToCart";
import {
  ModelAsset,
  ModelEntity,
  Reality,
  SceneGraph,
} from "@webspatial/react-sdk";

interface ProductCardProps {
  product: Product;
}

//function gotoPage(product: string) {
//  window.open(`${__XR_ENV_BASE__}product/` + product, "product/" + product);
//}

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
            position={{ x: 0.05, y: -0.0, z: 0.0 }}
            scale={{ x: 0.1, y: 0.1, z: 0.1 }}
            rotation={{ x: 0, y: 270, z: 0 }}
          />
        </SceneGraph>
      </Reality>
      <h3 className="product-name">{product.name}</h3>
      <p className="product-description">{product.description}</p>
      <p className="product-price">${product.price.toFixed(2)}</p>
      <Link to={"product/" + product.id} className="add-to-cart-btn">
        Go to product
      </Link>
      {
        //  <button onClick={() => gotoPage(product.id)} className="add-to-cart-btn">
        //  Go to product
        //</button>
      }
      <div style={{ marginTop: "1.5rem" }}>
        <AddToCart product={product.id} />
      </div>
    </div>
  );
}
