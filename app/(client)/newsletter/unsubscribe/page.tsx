import type { Metadata } from "next";
import Container from "@/components/Container";
import UnsubscribeForm from "./UnsubscribeForm";

export const metadata: Metadata = {
  title: "Unsubscribe",
  robots: { index: false },
};

export default async function UnsubscribePage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string; token?: string }>;
}) {
  const { email = "", token = "" } = await searchParams;
  return (
    <Container className="py-16">
      <div className="mx-auto max-w-md rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
        <h1 className="mb-2 text-2xl font-bold text-gray-900">
          Unsubscribe from newsletter
        </h1>
        <p className="mb-6 text-sm text-gray-600">
          You will stop receiving marketing emails. Order emails are not affected.
        </p>
        <UnsubscribeForm initialEmail={email} token={token} />
      </div>
    </Container>
  );
}
