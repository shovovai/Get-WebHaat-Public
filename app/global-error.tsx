"use client";

import { useEffect } from "react";

// Last-resort screen when even the root layout fails. Plain inline styles on purpose:
// the app's CSS and fonts may be what broke.
export default function GlobalError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#fbf8f3",
          color: "#1f1a17",
          fontFamily: "system-ui, -apple-system, Segoe UI, sans-serif",
          padding: 16,
        }}
      >
        <div style={{ maxWidth: 420, textAlign: "center" }}>
          <h1 style={{ fontSize: 28, margin: "0 0 12px" }}>Something went wrong</h1>
          <p style={{ color: "#6b625b", fontSize: 14, lineHeight: 1.6, margin: 0 }}>
            The store couldn&apos;t load. Please try again in a moment.
          </p>
          {error.digest && (
            <p style={{ color: "#6b625b", fontSize: 12, fontFamily: "monospace" }}>
              Error code: {error.digest}
            </p>
          )}
          <button
            type="button"
            onClick={() => retry()}
            style={{
              marginTop: 24,
              background: "#1f1a17",
              color: "#fbf8f3",
              border: 0,
              borderRadius: 999,
              padding: "10px 22px",
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
