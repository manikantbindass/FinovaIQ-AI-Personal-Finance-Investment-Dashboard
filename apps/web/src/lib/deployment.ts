/** Fixed server-side upstream; never accept a proxy destination from a request. */
export function apiProxyOrigin(environment: {
  VERCEL?: string;
  API_PROXY_URL?: string;
}): string {
  if (environment.VERCEL && !environment.API_PROXY_URL) {
    throw new Error(
      "Set API_PROXY_URL to the deployed FinovaIQ API origin in Vercel before building.",
    );
  }
  const origin = new URL(environment.API_PROXY_URL ?? "http://127.0.0.1:4000");
  if (
    origin.username ||
    origin.password ||
    origin.search ||
    origin.hash ||
    origin.pathname !== "/"
  ) {
    throw new Error(
      "API_PROXY_URL must be an origin without credentials, query, or path.",
    );
  }
  if (!["http:", "https:"].includes(origin.protocol)) {
    throw new Error("API_PROXY_URL must use HTTP or HTTPS.");
  }
  if (
    environment.VERCEL &&
    (origin.protocol !== "https:" ||
      ["localhost", "127.0.0.1", "[::1]"].includes(origin.hostname))
  ) {
    throw new Error(
      "Vercel requires a hosted HTTPS API origin; localhost cannot be deployed.",
    );
  }
  return origin.origin;
}
