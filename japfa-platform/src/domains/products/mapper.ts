import type { Product } from "@/../payload-types";

export type ProductCanonical = {
  sku: string;
  name: string;
  category: string;
  uom: string;
};

export function toProductCanonical(doc: Product): ProductCanonical {
  return {
    sku: doc.sku,
    name: doc.name,
    category: doc.productType,
    uom: doc.uom,
  };
}

export function fromProductCanonical(input: {
  sku?: string;
  name?: string;
  category?: string;
  uom?: string;
}): Partial<Pick<Product, "sku" | "name" | "productType" | "uom">> {
  return {
    ...(input.sku === undefined ? {} : { sku: input.sku }),
    ...(input.name === undefined ? {} : { name: input.name }),
    ...(input.category === undefined ? {} : { productType: input.category }),
    ...(input.uom === undefined ? {} : { uom: input.uom }),
  };
}
