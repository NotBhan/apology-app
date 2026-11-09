"use client";

/**
 * Last-resort boundary: rendered when the root layout itself throws, so it must
 * supply its own `<html>` and `<body>`.
 *
 * The global stylesheet is not guaranteed here, hence inline styles only.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#faf6ff",
          color: "#33203f",
          fontFamily:
            "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
          WebkitFontSmoothing: "antialiased",
        }}
      >
        <main style={{ maxWidth: 420, padding: "48px 20px", textAlign: "center" }}>
          <p
            style={{
              margin: 0,
              fontSize: 11,
              letterSpacing: "0.28em",
              textTransform: "uppercase",
              color: "#a394b4",
            }}
          >
            something went wrong
          </p>

          <h1
            style={{
              margin: "16px 0 0",
              fontSize: 28,
              lineHeight: 1.2,
              fontWeight: 500,
              fontFamily: "Georgia, 'Times New Roman', serif",
            }}
          >
            Koi Koi couldn&rsquo;t start.
          </h1>

          <p
            style={{
              margin: "12px 0 0",
              fontSize: 14,
              lineHeight: 1.65,
              color: "#6b5580",
            }}
          >
            This is not something you did. Reload the page and try again.
          </p>

          {error.digest ? (
            <p style={{ margin: "12px 0 0", fontSize: 11, color: "#a394b4" }}>
              Reference: <span style={{ fontFamily: "monospace" }}>{error.digest}</span>
            </p>
          ) : null}

          <button
            type="button"
            onClick={reset}
            style={{
              marginTop: 28,
              minHeight: 44,
              padding: "0 28px",
              borderRadius: 999,
              border: 0,
              background: "#6d3fa8",
              color: "#fff",
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Reload
          </button>
        </main>
      </body>
    </html>
  );
}
