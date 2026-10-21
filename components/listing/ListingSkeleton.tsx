import Container from "../Container";

/** Placeholder while a product listing loads */
export default function ListingSkeleton({ items = 8 }: { items?: number }) {
  return (
    <>
      <div className="h-[3.75rem] border-b border-black/[0.06] bg-white" />
      <Container className="py-8">
        <div className="h-5 w-48 animate-pulse rounded bg-sand" />
        <div className="mt-8 h-11 w-64 animate-pulse rounded bg-sand" />
        <div className="mt-8 h-12 animate-pulse rounded-md bg-sand" />
        <div className="mt-8 grid grid-cols-1 gap-x-6 gap-y-12 min-[480px]:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: items }).map((_, i) => (
            <div key={i}>
              <div className="aspect-[4/5] animate-pulse rounded-lg bg-sand" />
              <div className="mt-4 h-5 w-3/4 animate-pulse rounded bg-sand" />
              <div className="mt-3 h-5 w-1/2 animate-pulse rounded bg-sand" />
            </div>
          ))}
        </div>
      </Container>
    </>
  );
}
