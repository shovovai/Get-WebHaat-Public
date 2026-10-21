"use client";
import { Loader2, Search, X } from "lucide-react";
import { useCallback, useEffect, useState, useRef } from "react";
import { catalogFetch } from "@/lib/publicFetch";
import { Product } from "@/sanity.types";
import ProductCard from "../ProductCard";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useOutsideClick } from "@/hooks";

/** "icon": round header button (all screen sizes). The search window opens the same way either way. */
const SearchBar = ({ variant = "icon" }: { variant?: "icon" | "pill" }) => {
  const [search, setSearch] = useState("");
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [featuredProduct, setFeaturedProduct] = useState([]);
  const [isMac, setIsMac] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const modalRef = useOutsideClick<HTMLDivElement>(() => setShowSearch(false));

  // Detect if user is on Mac
  useEffect(() => {
    setIsMac(navigator.platform.toUpperCase().indexOf("MAC") >= 0);
  }, []);

  const fetchFeaturedProducts = useCallback(async () => {
    try {
      const response = await catalogFetch("featured");
      setFeaturedProduct(response);
    } catch (error) {
      console.error("Error fetching featured products:", error);
    }
  }, []);

  useEffect(() => {
    if (showSearch === true) {
      fetchFeaturedProducts();
      // Focus input when modal opens
      const timeoutId = setTimeout(() => {
        inputRef.current?.focus();
      }, 100);

      return () => clearTimeout(timeoutId); // Cleanup timeout
    }
  }, [showSearch, fetchFeaturedProducts]);

  // Other components (e.g. the mobile bottom nav) open search via this event
  useEffect(() => {
    const open = () => setShowSearch(true);
    window.addEventListener("open-search", open);
    return () => window.removeEventListener("open-search", open);
  }, []);

  // Handle escape key to close modal and Ctrl+K to open modal
  useEffect(() => {
    const handleKeydown = (e: KeyboardEvent) => {
      // Handle Escape key to close modal
      if (e.key === "Escape" && showSearch) {
        setShowSearch(false);
        return;
      }

      // Handle Ctrl+K (or Cmd+K on Mac) to open search modal
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault(); // Prevent browser's default search behavior
        setShowSearch(true);
        return;
      }
    };

    // Always listen for global keyboard shortcuts
    document.addEventListener("keydown", handleKeydown);

    // Handle body scroll lock only when modal is open
    if (showSearch) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }

    return () => {
      document.removeEventListener("keydown", handleKeydown);
      document.body.style.overflow = "unset";
    };
  }, [showSearch]);

  // Fetch products from Sanity based on search input
  const fetchProducts = useCallback(async () => {
    if (!search) {
      setProducts([]);
      return;
    }

    setLoading(true);
    try {
      const response = await catalogFetch("search", { search });
      setProducts(response);
    } catch (error) {
      console.error("Error fetching products:", error);
    } finally {
      setLoading(false);
    }
  }, [search]);

  // Debounce input changes to reduce API calls
  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      fetchProducts();
    }, 300); // Delay of 300ms

    return () => clearTimeout(debounceTimer); // Cleanup the timer
  }, [fetchProducts]);
  return (
    <>
      {variant === "icon" && (
        <button
          type="button"
          onClick={() => setShowSearch(true)}
          className="flex h-10 w-10 items-center justify-center rounded-full text-ink transition-colors hover:bg-sand"
          aria-label={`Search (${isMac ? "Cmd" : "Ctrl"}+K)`}
        >
          <Search className="h-[22px] w-[22px]" strokeWidth={1.6} />
        </button>
      )}

      {/* Search Trigger Button - Modern Input Style */}
      <div className={variant === "pill" ? "flex w-full" : "hidden"}>
        {/* Desktop Version - Full Input Style */}
        <button
          onClick={() => setShowSearch(true)}
          className="group hidden sm:flex w-full items-center gap-3 bg-sand hover:bg-white border border-transparent hover:border-clay/40 rounded-full px-4 py-2.5 transition-all duration-200 min-w-[200px]"
          aria-label={`Open search (${isMac ? "Cmd" : "Ctrl"}+K)`}
        >
          {/* Search Icon */}
          <Search className="w-4 h-4 text-gray-400 group-hover:text-shop_dark_green transition-colors duration-200 flex-shrink-0" />

          {/* Placeholder Text */}
          <span className="text-sm text-light-color group-hover:text-ink transition-colors duration-200 flex-1 text-left">
            Search for products, brands and more…
          </span>

          {/* Keyboard Shortcut Badge */}
          <div className="hidden md:flex items-center gap-1 bg-white border border-border px-2 py-0.5 rounded-full text-[11px] text-light-color font-mono flex-shrink-0">
            <span>{isMac ? "⌘" : "Ctrl"}</span>
            <span>K</span>
          </div>
        </button>

        {/* On phones the search pill lives in the header's second row (see ClientHeader) */}
      </div>

      {/* Search window */}
      {showSearch && (
        <div className="fixed inset-0 z-50 bg-black/40 sm:px-4 sm:pt-16" role="dialog" aria-modal="true" aria-label="Search">
          <div
            ref={modalRef}
            className="mx-auto flex h-full w-full max-w-5xl flex-col bg-cream sm:h-auto sm:max-h-[82vh] sm:overflow-hidden sm:rounded-xl"
          >
            <form
              className="flex items-center gap-3 border-b border-black/10 bg-white px-4 py-2 sm:px-6 sm:py-3"
              onSubmit={(e) => {
                e.preventDefault();
                if (search.trim()) {
                  setShowSearch(false);
                  router.push(`/shop?search=${encodeURIComponent(search.trim())}`);
                }
              }}
            >
              <Search className="h-5 w-5 shrink-0 text-ink" strokeWidth={1.6} />
              <input
                ref={inputRef}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search products"
                aria-label="Search products"
                className="h-12 min-w-0 flex-1 bg-transparent text-lg text-ink outline-none placeholder:text-light-color"
              />
              {search && (
                <button type="button" onClick={() => setSearch("")} className="text-[15px] text-light-color underline underline-offset-4">
                  Clear
                </button>
              )}
              <button
                type="button"
                onClick={() => setShowSearch(false)}
                className="-mr-2 flex h-10 w-10 items-center justify-center"
                aria-label="Close search"
              >
                <X className="h-6 w-6" strokeWidth={1.6} />
              </button>
            </form>

            <div className="flex-1 overflow-y-auto p-4 sm:p-6">
              {loading ? (
                <div className="flex items-center justify-center gap-3 py-16 text-light-color">
                  <Loader2 className="h-5 w-5 animate-spin" /> Searching…
                </div>
              ) : products?.length > 0 ? (
                <>
                  <div className="mb-5 flex items-center justify-between text-[15px]">
                    <p className="text-ink">
                      {products.length} result{products.length === 1 ? "" : "s"} for &ldquo;{search}&rdquo;
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setShowSearch(false);
                        router.push(`/shop?search=${encodeURIComponent(search.trim())}`);
                      }}
                      className="text-ink underline underline-offset-4"
                    >
                      See all
                    </button>
                  </div>
                  <div
                    className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-4"
                    onClickCapture={(e) => {
                      if ((e.target as HTMLElement).closest("a")) setShowSearch(false);
                    }}
                  >
                    {products.map((product: Product) => (
                      <ProductCard key={product._id} product={product} />
                    ))}
                  </div>
                </>
              ) : search.trim() === "" ? (
                <div className="py-6">
                  {featuredProduct?.length > 0 && (
                    <>
                      <p className="mb-3 text-[11px] font-medium uppercase tracking-[0.3em] text-light-color">
                        Popular searches
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {featuredProduct.slice(0, 8).map((item: Product) => (
                          <button
                            key={item._id}
                            type="button"
                            onClick={() => setSearch(item.name as string)}
                            className="rounded-full border border-black/15 bg-white px-4 py-2 text-[15px] text-ink hover:border-ink"
                          >
                            {item.name}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                  <p className="mb-3 mt-8 text-[11px] font-medium uppercase tracking-[0.3em] text-light-color">
                    Quick links
                  </p>
                  <div className="flex flex-wrap gap-x-6 gap-y-2 text-[15px]">
                    {[
                      { label: "New In", href: "/shop" },
                      { label: "Sale", href: "/deal" },
                      { label: "All categories", href: "/category" },
                      { label: "Brands", href: "/brands" },
                    ].map((l) => (
                      <Link
                        key={l.href}
                        href={l.href}
                        onClick={() => setShowSearch(false)}
                        className="text-ink underline underline-offset-4"
                      >
                        {l.label}
                      </Link>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="py-16 text-center">
                  <p className="text-2xl text-ink">No results for &ldquo;{search}&rdquo;</p>
                  <p className="mt-2 text-[15px] text-light-color">Check the spelling or try a more general word.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default SearchBar;
