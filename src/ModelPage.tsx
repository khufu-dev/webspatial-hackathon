import { products } from "./data/products";
import { mountPage } from "./mountPage";
import Model3D from "./components/Model3D";

const productId = new URLSearchParams(window.location.search).get("id");

export default function ModelPage() {
  const product = products.find((candidate) => candidate.id === productId);

  if (!product) {
    console.warn(`Product ${productId} not found`);
    return (location.href = "/");
  }
  return (
    <Model3D
      className="model"
      style={{ "--xr-depth": window.xrInnerDepth }}
      src={product.model}
      poster={product.image}
      alt={product.name}
      stagemode="orbit"
    />
  );
}

mountPage(<ModelPage />);
