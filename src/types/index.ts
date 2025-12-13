import { Vec3 } from "@webspatial/core-sdk";

export interface Product {
  id: string;
  name: string;
  price: number;
  image: string;
  description: string;
  model: string;
  position: Vec3;
  scale: Vec3;
  rotation: Vec3;
}

export interface CartItem {
  product: Product;
  quantity: number;
}
