import { NextRequest, NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { isUserAdmin } from "@/lib/adminUtils";
import { backendClient as client } from "@/sanity/lib/backendClient";
import { requireAdmin } from "@/lib/adminAuth";
import { parseProductInput } from "@/lib/productInput";
import { invalidateProducts } from "@/lib/cache";

export async function GET(req: NextRequest) {
  try {
    // Get authenticated user
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized - Not logged in" },
        { status: 401 }
      );
    }

    // Get current user details to check admin status
    const clerk = await clerkClient();
    const currentUser = await clerk.users.getUser(userId);
    const userEmail = currentUser.primaryEmailAddress?.emailAddress;

    // Check if current user is admin
    if (!userEmail || !isUserAdmin(userEmail)) {
      return NextResponse.json(
        { error: "Forbidden - Admin access required" },
        { status: 403 }
      );
    }

    // Get query parameters
    const { searchParams } = new URL(req.url);
    const productId = searchParams.get("id");
    const limit = Math.min(Math.max(parseInt(searchParams.get("limit") || "10") || 10, 1), 100);
    const offset = Math.max(parseInt(searchParams.get("offset") || "0") || 0, 0);
    const category = searchParams.get("category") || "";
    const search = searchParams.get("search") || "";
    const sortBy = ["_createdAt", "name", "price", "stock"].includes(searchParams.get("sortBy") || "")
      ? searchParams.get("sortBy")!
      : "_createdAt";
    const sortOrder = searchParams.get("sortOrder") === "asc" ? "asc" : "desc";


    // If requesting a specific product by ID, return full details
    if (productId) {
      const productQuery = `
        *[_type == "product" && _id == $productId][0] {
          _id,
          _type,
          _createdAt,
          _updatedAt,
          _rev,
          name,
          slug,
          description,
          price,
          discount,
          stock,
          images[]{
            ...,
            asset->{
              _id,
              url
            }
          },
          categories[]->{
            _id,
            title,
            slug
          },
          brand->{
            _id,
            title,
            slug
          },
          status,
          variant,
          isFeatured
        }
      `;

      const product = await client.fetch(productQuery, { productId });

      if (!product) {
        return NextResponse.json(
          { error: "Product not found" },
          { status: 404 }
        );
      }

      // Transform the data to match our interface
      const transformedProduct = {
        ...product,
        category: product.categories?.[0]
          ? {
              _id: product.categories[0]._id,
              name: product.categories[0].title,
              title: product.categories[0].title,
              slug: product.categories[0].slug,
            }
          : null,
        brand: product.brand
          ? {
              _id: product.brand._id,
              name: product.brand.title,
              title: product.brand.title,
              slug: product.brand.slug,
            }
          : null,
        featured: product.isFeatured,
      };

      return NextResponse.json({ product: transformedProduct });
    }

    // Build filter conditions
    const filterConditions = [];
    const queryParams: Record<string, string> = {};
    if (category) queryParams.category = category;
    if (search) queryParams.searchTerm = `${search.replace(/[*"\\]/g, "")}*`;

    if (category) {
      // Use references to filter by category
      filterConditions.push(
        `references(*[_type == "category" && title == $category]._id)`
      );
    }
    if (search) {
      filterConditions.push(
        `(name match $searchTerm || description match $searchTerm)`
      );
    } // Build GROQ query
    const query = `
      *[_type == "product"${
        filterConditions.length > 0
          ? ` && (${filterConditions.join(" && ")})`
          : ""
      }] | order(${sortBy} ${sortOrder}) [${offset}...${offset + limit}] {
        _id,
        _createdAt,
        name,
        description,
        price,
        stock,
        images[]{
          asset->{
            _id,
            url
          },
          alt
        },
        "category": categories[0]->{
          _id,
          "name": title,
          "title": title
        },
        "categories": categories[]->{
          _id,
          "name": title,
          "title": title
        },
        brand-> {
          _id,
          "name": title
        },
        "featured": isFeatured,
        status
      }
    `;

    // Get count query
    const countQuery = `
      count(*[_type == "product"${
        filterConditions.length > 0
          ? ` && (${filterConditions.join(" && ")})`
          : ""
      }])
    `;

    // Execute queries
    const [products, totalCount] = await Promise.all([
      client.fetch(query, queryParams),
      client.fetch(countQuery, queryParams),
    ]);

    return NextResponse.json({
      products,
      totalCount,
      hasNextPage: offset + limit < totalCount,
      pagination: {
        limit,
        offset,
        total: totalCount,
        currentPage: Math.floor(offset / limit) + 1,
        totalPages: Math.ceil(totalCount / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching products:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST — create a product from the admin panel
export async function POST(req: NextRequest) {
  try {
    const admin = await requireAdmin();
    if (!admin.ok) return admin.response;

    const parsed = parseProductInput(await req.json());
    if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });

    const slug = (parsed.doc.slug as { current: string }).current;
    const clash = await client.fetch<number>(`count(*[_type == "product" && slug.current == $slug])`, { slug });
    if (clash) {
      return NextResponse.json({ error: "A product with this slug already exists" }, { status: 409 });
    }

    const doc = Object.fromEntries(Object.entries(parsed.doc).filter(([, v]) => v !== undefined));
    const product = await client.create({ _type: "product", ...doc, averageRating: 0, totalReviews: 0 });
    await invalidateProducts();
    return NextResponse.json({ success: true, product });
  } catch (error) {
    console.error("Create product failed:", error);
    return NextResponse.json({ error: "Failed to create product" }, { status: 500 });
  }
}
