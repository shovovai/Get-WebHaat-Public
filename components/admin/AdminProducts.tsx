"use client";

import React, { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { urlFor } from "@/sanity/lib/image";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import {
  RefreshCw,
  Eye,
  Package,
  Calendar,
  Tag,
  Star,
  Package2,
  ChevronLeft,
  ChevronRight,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import ProductFormDialog from "./ProductFormDialog";
import { formatPrice } from "@/lib/storeConfig";
import { ProductsSkeleton } from "./SkeletonLoaders";
import { Product } from "./types";
import { safeApiCall, handleApiError } from "./apiHelpers";
import { ADMIN_CATEGORIES_QUERYResult } from "@/sanity.types";

interface AdminProductsProps {
  initialCategories?: ADMIN_CATEGORIES_QUERYResult;
}

const AdminProducts: React.FC<AdminProductsProps> = ({
  initialCategories = [],
}) => {
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [productCategory, setProductCategory] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isProductDetailsOpen, setIsProductDetailsOpen] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [imageLoading, setImageLoading] = useState(false);
  const [categories, setCategories] =
    useState<ADMIN_CATEGORIES_QUERYResult>(initialCategories);

  const limit = 10;
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const openEditor = (id: string | null) => {
    setEditingId(id);
    setEditorOpen(true);
  };

  const deleteProduct = async (product: Product) => {
    if (!window.confirm(`Delete "${product.name}"? This cannot be undone.`)) return;
    try {
      const res = await fetch(`/api/admin/products/${product._id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success(data.archived ? data.message : "Product deleted");
      fetchProducts(currentPage);
    } catch (err) {
      toast.error(err instanceof Error && err.message ? err.message : "Delete failed");
    }
  };

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Reset page when search changes
  useEffect(() => {
    if (debouncedSearchTerm !== searchTerm) {
      setCurrentPage(0);
    }
  }, [debouncedSearchTerm, searchTerm]);

  // Utility functions
  const formatCurrency = (amount: number): string => {
    return formatPrice(amount);
  };

  // Fetch products
  const fetchProducts = useCallback(
    async (page = 0) => {
      setLoading(true);
      try {
        const categoryParam = productCategory === "all" ? "" : productCategory;
        const data = await safeApiCall(
          `/api/admin/products?limit=${limit}&offset=${
            page * limit
          }&category=${categoryParam}&search=${debouncedSearchTerm}`
        );
        setProducts(data.products);
      } catch (error) {
        handleApiError(error, "Products fetch");
      } finally {
        setLoading(false);
      }
    },
    [productCategory, debouncedSearchTerm, limit]
  );

  // Effects
  useEffect(() => {
    fetchProducts(currentPage);
  }, [fetchProducts, currentPage]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(0);
  }, [productCategory, debouncedSearchTerm]);

  // Keyboard navigation for image carousel
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (
        !isProductDetailsOpen ||
        !selectedProduct?.images ||
        selectedProduct.images.length <= 1
      ) {
        return;
      }

      switch (event.key) {
        case "ArrowLeft":
          event.preventDefault();
          goToPrevImage();
          break;
        case "ArrowRight":
          event.preventDefault();
          goToNextImage();
          break;
        case "Escape":
          event.preventDefault();
          setIsProductDetailsOpen(false);
          break;
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isProductDetailsOpen, selectedProduct?.images]);

  // Handle product view
  const handleViewProduct = async (product: Product) => {
    try {
      // Reset image index when viewing a new product
      setCurrentImageIndex(0);
      // Fetch complete product details
      const response = await safeApiCall(
        `/api/admin/products?id=${product._id}`
      );
      setSelectedProduct(response.product);
      setIsProductDetailsOpen(true);
    } catch (error) {
      handleApiError(error, "Product details fetch");
      // Fallback to existing product data
      setCurrentImageIndex(0);
      setSelectedProduct(product);
      setIsProductDetailsOpen(true);
    }
  };

  // Carousel navigation functions
  const goToPrevImage = () => {
    if (selectedProduct?.images && selectedProduct.images.length > 0) {
      setCurrentImageIndex((prev) =>
        prev === 0 ? selectedProduct.images!.length - 1 : prev - 1
      );
    }
  };

  const goToNextImage = () => {
    if (selectedProduct?.images && selectedProduct.images.length > 0) {
      setCurrentImageIndex((prev) =>
        prev === selectedProduct.images!.length - 1 ? 0 : prev + 1
      );
    }
  };

  const goToImage = (index: number) => {
    setCurrentImageIndex(index);
  };

  // Format date
  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case "hot":
        return "destructive";
      case "new":
        return "default";
      case "sale":
        return "secondary";
      default:
        return "outline";
    }
  };

  return (
    <div className="space-y-4 p-4">
      {/* Header */}
      <div className="flex flex-col space-y-4 lg:flex-row lg:items-center lg:justify-between lg:space-y-0">
        <div>
          <h3 className="text-lg font-semibold">Products</h3>
          <p className="text-sm text-gray-500">Add, edit and manage your catalog.</p>
        </div>
        <div className="flex flex-col space-y-2 sm:flex-row sm:items-center sm:gap-2 sm:space-y-0">
          <Input
            placeholder="Search products..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full sm:w-48"
          />
          <Select value={productCategory} onValueChange={setProductCategory}>
            <SelectTrigger className="w-full sm:w-32">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map((category) => (
                <SelectItem key={category._id} value={category.title || ""}>
                  {category.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            onClick={() => fetchProducts(currentPage)}
            size="sm"
            variant="outline"
            className="w-full sm:w-auto"
          >
            <RefreshCw className="h-4 w-4" />
            <span className="ml-2 sm:hidden">Refresh</span>
          </Button>
          <Button onClick={() => openEditor(null)} size="sm" className="w-full sm:w-auto">
            <Plus className="mr-1 h-4 w-4" /> New product
          </Button>
        </div>
      </div>

      {loading ? (
        <ProductsSkeleton />
      ) : (
        <>
          {/* Desktop Table View */}
          <div className="hidden md:block">
            <Card>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Brand</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead>Stock</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {products.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={7}
                          className="text-center py-8 text-muted-foreground"
                        >
                          No products found.
                        </TableCell>
                      </TableRow>
                    ) : (
                      products.map((product) => (
                        <TableRow key={product._id}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              {/* Product Image */}
                              <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                                {product.images && product.images[0] ? (
                                  <Image
                                    src={urlFor(product.images[0])
                                      .width(48)
                                      .height(48)
                                      .url()}
                                    alt={product.name || "Product"}
                                    width={48}
                                    height={48}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-gray-400">
                                    <Package className="w-6 h-6" />
                                  </div>
                                )}
                              </div>
                              {/* Product Info */}
                              <div className="min-w-0">
                                <div className="font-medium truncate">
                                  {product.name}
                                </div>
                                {(product.featured || product.isFeatured) && (
                                  <Badge
                                    variant="secondary"
                                    className="text-xs"
                                  >
                                    Featured
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            {product.category?.name ||
                              product.category?.title ||
                              "N/A"}
                          </TableCell>
                          <TableCell>
                            {product.brand?.name ||
                              product.brand?.title ||
                              "N/A"}
                          </TableCell>
                          <TableCell>{formatCurrency(product.price)}</TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                product.stock > 0 ? "default" : "destructive"
                              }
                            >
                              {product.stock}
                            </Badge>
                          </TableCell>
                          <TableCell className="capitalize">
                            {product.status}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleViewProduct(product)}
                                aria-label="View"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button size="sm" variant="ghost" onClick={() => openEditor(product._id)} aria-label="Edit">
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button size="sm" variant="ghost" onClick={() => deleteProduct(product)} aria-label="Delete">
                                <Trash2 className="h-4 w-4 text-red-600" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </Card>
          </div>

          {/* Mobile Card View */}
          <div className="md:hidden space-y-4">
            {products.length === 0 ? (
              <Card>
                <div className="p-8 text-center text-muted-foreground">
                  No products found.
                </div>
              </Card>
            ) : (
              products.map((product) => (
                <Card key={product._id}>
                  <div className="p-4 space-y-4">
                    {/* Product Header */}
                    <div className="flex items-start gap-3">
                      <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                        {product.images && product.images[0] ? (
                          <Image
                            src={urlFor(product.images[0])
                              .width(64)
                              .height(64)
                              .url()}
                            alt={product.name || "Product"}
                            width={64}
                            height={64}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-400">
                            <Package className="w-8 h-8" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between">
                          <div className="min-w-0 flex-1">
                            <h3 className="font-medium text-gray-900 truncate">
                              {product.name}
                            </h3>
                            <div className="flex items-center gap-2 mt-1">
                              {(product.featured || product.isFeatured) && (
                                <Badge variant="secondary" className="text-xs">
                                  <Star className="w-3 h-3 mr-1" />
                                  Featured
                                </Badge>
                              )}
                            </div>
                          </div>
                          <div className="flex">
                            <Button size="sm" variant="ghost" onClick={() => handleViewProduct(product)} aria-label="View">
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => openEditor(product._id)} aria-label="Edit">
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => deleteProduct(product)} aria-label="Delete">
                              <Trash2 className="h-4 w-4 text-red-600" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Product Details Grid */}
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <div className="text-gray-500">Category</div>
                        <div className="font-medium">
                          {product.category?.name ||
                            product.category?.title ||
                            "N/A"}
                        </div>
                      </div>
                      <div>
                        <div className="text-gray-500">Brand</div>
                        <div className="font-medium">
                          {product.brand?.name || product.brand?.title || "N/A"}
                        </div>
                      </div>
                      <div>
                        <div className="text-gray-500">Price</div>
                        <div className="font-medium text-green-600">
                          {formatCurrency(product.price)}
                        </div>
                      </div>
                      <div>
                        <div className="text-gray-500">Stock</div>
                        <Badge
                          variant={
                            product.stock > 0 ? "default" : "destructive"
                          }
                          className="text-xs"
                        >
                          {product.stock} units
                        </Badge>
                      </div>
                    </div>

                    {/* Status */}
                    <div className="flex items-center justify-between pt-2 border-t">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-500">Status:</span>
                        <Badge
                          variant={getStatusColor(product.status)}
                          className="text-xs capitalize"
                        >
                          {product.status}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>

          <div className="flex flex-col sm:flex-row justify-center items-center gap-2 pt-4">
            <Button
              onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
              disabled={currentPage === 0}
              variant="outline"
              className="w-full sm:w-auto"
            >
              Previous
            </Button>
            <div className="hidden sm:flex items-center text-sm text-gray-500">
              Page {currentPage + 1}
            </div>
            <Button
              onClick={() => setCurrentPage(currentPage + 1)}
              variant="outline"
              className="w-full sm:w-auto"
            >
              Next
            </Button>
          </div>
        </>
      )}

      {/* Product Details Sidebar */}
      <Sheet open={isProductDetailsOpen} onOpenChange={setIsProductDetailsOpen}>
        <SheetContent className="w-full sm:w-[480px] md:w-[640px] overflow-y-auto">
          <SheetHeader className="pb-6">
            <SheetTitle>Product Details</SheetTitle>
            <SheetDescription>
              Product details
            </SheetDescription>
          </SheetHeader>

          {selectedProduct && (
            <div className="space-y-8 px-2">
              {/* Product Images Carousel */}
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <h4 className="text-sm font-medium text-gray-900">Images</h4>
                  {selectedProduct.images &&
                    selectedProduct.images.length > 1 && (
                      <span className="text-xs text-gray-500">
                        Use ← → keys to navigate
                      </span>
                    )}
                </div>
                {selectedProduct.images && selectedProduct.images.length > 0 ? (
                  <div className="space-y-4">
                    {/* Main Image Display */}
                    <div className="relative w-full">
                      <div className="aspect-square max-w-sm mx-auto rounded-lg overflow-hidden bg-gray-100 border border-gray-200 shadow-lg relative">
                        {imageLoading && (
                          <div className="absolute inset-0 flex items-center justify-center bg-gray-100 z-10">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
                          </div>
                        )}
                        <Image
                          src={urlFor(selectedProduct.images[currentImageIndex])
                            .width(400)
                            .height(400)
                            .url()}
                          alt={`${selectedProduct.name} - Image ${
                            currentImageIndex + 1
                          }`}
                          width={400}
                          height={400}
                          className="w-full h-full object-cover"
                          priority
                          onLoadStart={() => setImageLoading(true)}
                          onLoad={() => setImageLoading(false)}
                          onError={() => setImageLoading(false)}
                        />
                      </div>

                      {/* Navigation Buttons */}
                      {selectedProduct.images.length > 1 && (
                        <>
                          <Button
                            variant="outline"
                            size="icon"
                            className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white shadow-lg"
                            onClick={goToPrevImage}
                          >
                            <ChevronLeft className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white shadow-lg"
                            onClick={goToNextImage}
                          >
                            <ChevronRight className="w-4 h-4" />
                          </Button>
                        </>
                      )}
                    </div>

                    {/* Thumbnail Navigation */}
                    {selectedProduct.images.length > 1 && (
                      <div className="space-y-2">
                        <div className="flex gap-2 overflow-x-auto scrollbar-hide justify-center">
                          {selectedProduct.images.map((image, index) => (
                            <button
                              key={image._key || index}
                              onClick={() => goToImage(index)}
                              className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all duration-200 ${
                                index === currentImageIndex
                                  ? "border-gray-900 shadow-md"
                                  : "border-gray-200 hover:border-gray-300"
                              }`}
                            >
                              <Image
                                src={urlFor(image).width(64).height(64).url()}
                                alt={`${selectedProduct.name} - Thumbnail ${
                                  index + 1
                                }`}
                                width={64}
                                height={64}
                                className="w-full h-full object-cover"
                              />
                            </button>
                          ))}
                        </div>
                        <div className="text-xs text-gray-500 text-center">
                          {currentImageIndex + 1} of{" "}
                          {selectedProduct.images.length} images
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="aspect-square max-w-sm mx-auto rounded-lg bg-gray-100 flex items-center justify-center border border-gray-200">
                    <div className="text-center">
                      <Package className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                      <span className="text-sm text-gray-500">
                        No images available
                      </span>
                    </div>
                  </div>
                )}
              </div>

              <Separator className="my-6" />

              {/* Basic Information */}
              <div className="space-y-4">
                <h4 className="text-sm font-medium text-gray-900">
                  Basic Information
                </h4>
                <div className="grid gap-4 bg-gray-50 p-4 rounded-lg">
                  <div className="flex justify-between items-start">
                    <span className="text-sm text-gray-600 min-w-[80px]">
                      Product ID:
                    </span>
                    <span className="text-sm font-mono bg-white px-3 py-1 rounded border text-right break-all ml-2">
                      {selectedProduct._id}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Name:</span>
                    <span className="text-sm font-medium text-right ml-2 flex-1">
                      {selectedProduct.name}
                    </span>
                  </div>
                  <div className="flex justify-between items-start">
                    <span className="text-sm text-gray-600 min-w-[80px]">
                      Slug:
                    </span>
                    <span className="text-sm font-mono bg-white px-3 py-1 rounded border text-right break-all ml-2">
                      {selectedProduct.slug?.current || "N/A"}
                    </span>
                  </div>
                  {selectedProduct.description && (
                    <div className="flex flex-col gap-2">
                      <span className="text-sm text-gray-600">
                        Description:
                      </span>
                      <span className="text-sm text-gray-800 bg-white p-3 rounded border leading-relaxed">
                        {selectedProduct.description}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <Separator className="my-6" />

              {/* Pricing & Stock */}
              <div className="space-y-4">
                <h4 className="text-sm font-medium text-gray-900">
                  Pricing & Inventory
                </h4>
                <div className="grid gap-4 bg-gray-50 p-4 rounded-lg">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Price:</span>
                    <span className="text-lg font-semibold text-green-600">
                      {formatCurrency(selectedProduct.price)}
                    </span>
                  </div>
                  {selectedProduct.discount && selectedProduct.discount > 0 && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Discount:</span>
                      <Badge variant="secondary" className="text-sm px-3 py-1">
                        {selectedProduct.discount}%
                      </Badge>
                    </div>
                  )}
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Stock:</span>
                    <Badge
                      variant={
                        selectedProduct.stock > 0 ? "default" : "destructive"
                      }
                      className="text-sm px-3 py-1"
                    >
                      {selectedProduct.stock} units
                    </Badge>
                  </div>
                </div>
              </div>

              <Separator className="my-6" />

              {/* Categories & Brand */}
              <div className="space-y-4">
                <h4 className="text-sm font-medium text-gray-900">
                  Classification
                </h4>
                <div className="grid gap-4 bg-gray-50 p-4 rounded-lg">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Category:</span>
                    <Badge
                      variant="outline"
                      className="flex items-center gap-1 px-3 py-1"
                    >
                      <Tag className="w-3 h-3" />
                      {selectedProduct.category?.name ||
                        selectedProduct.category?.title ||
                        "N/A"}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Brand:</span>
                    <Badge
                      variant="outline"
                      className="flex items-center gap-1 px-3 py-1"
                    >
                      <Package2 className="w-3 h-3" />
                      {selectedProduct.brand?.name ||
                        selectedProduct.brand?.title ||
                        "N/A"}
                    </Badge>
                  </div>
                  {selectedProduct.variant && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">
                        Product Type:
                      </span>
                      <Badge variant="secondary" className="px-3 py-1">
                        {selectedProduct.variant}
                      </Badge>
                    </div>
                  )}
                </div>
              </div>

              <Separator className="my-6" />

              {/* Status & Features */}
              <div className="space-y-4">
                <h4 className="text-sm font-medium text-gray-900">
                  Status & Features
                </h4>
                <div className="grid gap-4 bg-gray-50 p-4 rounded-lg">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Status:</span>
                    <Badge
                      variant={getStatusColor(selectedProduct.status)}
                      className="px-3 py-1"
                    >
                      {selectedProduct.status}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Featured:</span>
                    <Badge
                      variant={
                        selectedProduct.featured || selectedProduct.isFeatured
                          ? "default"
                          : "outline"
                      }
                      className="px-3 py-1"
                    >
                      {selectedProduct.featured ||
                      selectedProduct.isFeatured ? (
                        <>
                          <Star className="w-3 h-3 mr-1 fill-current" />
                          Featured
                        </>
                      ) : (
                        "Not Featured"
                      )}
                    </Badge>
                  </div>
                </div>
              </div>

              <Separator className="my-6" />

              {/* Metadata */}
              <div className="space-y-4">
                <h4 className="text-sm font-medium text-gray-900">Metadata</h4>
                <div className="grid gap-4 bg-gray-50 p-4 rounded-lg">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Type:</span>
                    <span className="text-sm font-mono bg-white px-3 py-1 rounded border">
                      {selectedProduct._type}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Created:</span>
                    <div className="flex items-center gap-2 text-sm text-gray-600 bg-white px-3 py-1 rounded border">
                      <Calendar className="w-3 h-3" />
                      {formatDate(selectedProduct._createdAt)}
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Updated:</span>
                    <div className="flex items-center gap-2 text-sm text-gray-600 bg-white px-3 py-1 rounded border">
                      <Calendar className="w-3 h-3" />
                      {formatDate(selectedProduct._updatedAt)}
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <span className="text-sm text-gray-600">Revision:</span>
                    <span className="text-xs font-mono bg-white px-3 py-2 rounded border break-all leading-relaxed">
                      {selectedProduct._rev}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
      <ProductFormDialog
        open={editorOpen}
        productId={editingId}
        onOpenChange={setEditorOpen}
        onSaved={() => fetchProducts(currentPage)}
      />
    </div>
  );
};

export default AdminProducts;
