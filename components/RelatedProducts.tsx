import { Product } from "@/sanity.types";
import ProductCard from "./ProductCard";
import SectionHeading from "./SectionHeading";

interface RelatedProductsProps {
  currentProduct: Product;
  relatedProducts: Product[];
}

/** 2 / 3 / 4 columns in the 1280px container */
const RELATED_SIZES = "(min-width: 1280px) 300px, (min-width: 1024px) 24vw, (min-width: 768px) 32vw, 50vw";

const RelatedProducts = ({ currentProduct, relatedProducts }: RelatedProductsProps) => {
  const items = (relatedProducts || []).filter((p) => p._id !== currentProduct._id).slice(0, 4);
  if (items.length === 0) return null;

  return (
    <section className="mt-20">
      <SectionHeading title="You may also like" href="/shop" />
      <div className="grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-3 lg:grid-cols-4 lg:gap-x-5">
        {items.map((product) => (
          <ProductCard key={product._id} product={product} sizes={RELATED_SIZES} />
        ))}
      </div>
    </section>
  );
};

export default RelatedProducts;
