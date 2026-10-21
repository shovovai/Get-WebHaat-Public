import Container from "@/components/Container";

export default function CheckoutLoading() {
  return (
    <Container className="py-10">
      <div className="mb-8 h-10 w-56 animate-pulse rounded-full bg-sand" />
      <div className="grid gap-8 lg:grid-cols-[1fr_400px]">
        <div className="space-y-6">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-48 animate-pulse rounded-3xl bg-sand" />
          ))}
        </div>
        <div className="h-96 animate-pulse rounded-3xl bg-sand" />
      </div>
    </Container>
  );
}
