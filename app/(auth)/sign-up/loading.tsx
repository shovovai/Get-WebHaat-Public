export default function Loading() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center bg-cream">
      <div className="flex flex-col items-center gap-4">
        <span className="h-8 w-8 animate-spin rounded-full border-2 border-ink/15 border-t-ink" />
        <p className="text-sm text-light-color">Loading sign up…</p>
      </div>
    </div>
  );
}
