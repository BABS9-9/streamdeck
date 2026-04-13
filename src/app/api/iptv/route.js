// CORS proxy for IPTV API calls (player_api.php).
// The IPTV server blocks cross-origin browser requests,
// so we proxy them through our server.
// Usage: /api/iptv?url=<encoded-api-url>

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const apiUrl = searchParams.get("url");

  if (!apiUrl) {
    return new Response("Missing url parameter", { status: 400 });
  }

  try {
    const upstream = await fetch(apiUrl, {
      headers: { "User-Agent": "Mozilla/5.0" },
      redirect: "follow",
      cache: "no-store",
    });

    if (!upstream.ok) {
      return new Response(`Upstream error: ${upstream.status}`, {
        status: upstream.status,
      });
    }

    const data = await upstream.text();

    return new Response(data, {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "no-cache",
      },
    });
  } catch (err) {
    console.error("IPTV API proxy error:", err);
    return new Response(`Proxy error: ${err.message}`, { status: 502 });
  }
}
