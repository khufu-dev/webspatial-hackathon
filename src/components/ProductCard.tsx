import { Link } from "react-router-dom";
import {
  ModelAsset,
  ModelEntity,
  Reality,
  SceneGraph,
  Vec3,
} from "@webspatial/react-sdk";
import { Product } from "../data/products";
import "./ProductCart.css";

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  return (
    <div className="product-card">
      <Model3D className="product-3D" {...product} src={product.model} />
      <h3 className="product-name">{product.name}</h3>
      <p className="product-description">{product.description}</p>
      <p className="product-price">${product.price.toFixed(2)}</p>
      <div className="product-card-footer">
        <Link to={`/product/${product.id}`}>
          Go to product
        </Link>
      </div>
    </div>
  );
}

type Model3DProps = {
  src: string;
  position: Vec3;
  scale: Vec3;
  rotation: Vec3;
  className?: string
}
function Model3D({ className, src, position, scale, rotation }: Model3DProps) {
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
