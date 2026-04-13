// CORS proxy for IPTV streams.
// Passes all formats through directly — Fire TV / Android handles them natively.
// Usage: /api/stream?url=<encoded-stream-url>

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const streamUrl = searchParams.get("url");

  if (!streamUrl) {
    return new Response("Missing url parameter", { status: 400 });
  }

  try {
    const range = request.headers.get("range");
    const upstreamHeaders = { "User-Agent": "Mozilla/5.0" };
    if (range) upstreamHeaders["Range"] = range;

    const upstream = await fetch(streamUrl, {
      headers: upstreamHeaders,
      redirect: "follow",
      cache: "no-store",
    });

    if (!upstream.ok && upstream.status !== 206) {
      return new Response(`Upstream error: ${upstream.status}`, {
        status: upstream.status,
      });
    }

    const responseHeaders = new Headers();
    const ct = upstream.headers.get("content-type") || "application/octet-stream";
    responseHeaders.set("Content-Type", ct);
    responseHeaders.set("Accept-Ranges", "bytes");
    responseHeaders.set("Cache-Control", "no-cache");
    responseHeaders.set("Access-Control-Allow-Origin", "*");

    const contentLength = upstream.headers.get("content-length");
    if (contentLength) responseHeaders.set("Content-Length", contentLength);

    const contentRange = upstream.headers.get("content-range");
    if (contentRange) responseHeaders.set("Content-Range", contentRange);

    return new Response(upstream.body, {
      status: contentRange ? 206 : 200,
      headers: responseHeaders,
    });
  } catch (err) {
    console.error("Stream proxy error:", err);
    return new Response(`Proxy error: ${err.message}`, { status: 502 });
  }
}
