import { permanentRedirect } from "next/navigation";

// The full catalog lives at /shop
export default function ProductIndexPage() {
  permanentRedirect("/shop");
}
