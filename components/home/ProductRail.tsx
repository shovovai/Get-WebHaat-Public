import { Product } from "@/sanity.types";
import ProductCard from "../ProductCard";
import RailScroller from "./RailScroller";

interface Props {
  title: string;
  products: Product[];
  href?: string;
  linkLabel?: string;
  eyebrow?: string;
}

/** Card widths below: 46% / 31% / 21.5% of the 1280px container */
const RAIL_SIZES = "(min-width: 1280px) 270px, (min-width: 1024px) 21vw, (min-width: 640px) 31vw, 46vw";

/** A titled, swipeable row of product cards (hidden when there is too little to show) */
const ProductRail = ({ title, products, href, linkLabel, eyebrow }: Props) => {
  if (products.length < 2) return null;
  return (
    <RailScroller title={title} href={href} linkLabel={linkLabel} eyebrow={eyebrow}>
      {products.map((product) => (
        <div key={product._id} className="w-[46%] shrink-0 snap-start sm:w-[31%] lg:w-[21.5%]">
          <ProductCard product={product} sizes={RAIL_SIZES} />
        </div>
      ))}
    </RailScroller>
  );
};

export default ProductRail;
