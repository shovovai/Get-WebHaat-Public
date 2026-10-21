import Link from "next/link";
import { Category } from "@/sanity.types";
import { image } from "@/sanity/image";
import RailScroller from "./RailScroller";

/** Round category shortcuts ("Shop by category") */
const ShopByCategory = ({ categories }: { categories: Category[] }) => {
  const list = categories.filter((c) => c?.title && c?.slug?.current);
  if (!list.length) return null;

  return (
    <RailScroller title="Shop by category" href="/category">
      {list.map((category) => (
        <Link
          key={category._id}
          href={`/category/${category.slug?.current}`}
          className="group flex w-[7.5rem] shrink-0 snap-start flex-col items-center gap-3 text-center sm:w-[9.75rem]"
        >
          <span className="flex aspect-square w-full items-center justify-center overflow-hidden rounded-full bg-white">
            {category.image ? (
              <img
                src={image(category.image).width(320).height(320).fit("crop").quality(70).url()}
                alt=""
                width={160}
                height={160}
                loading="lazy"
                decoding="async"
                className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
            ) : (
              <span className="text-3xl text-ink">{category.title?.charAt(0)}</span>
            )}
          </span>
          <span className="line-clamp-2 text-[15px] leading-tight text-ink sm:text-lg">{category.title}</span>
        </Link>
      ))}
    </RailScroller>
  );
};

export default ShopByCategory;
