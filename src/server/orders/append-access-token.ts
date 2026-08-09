/** Append capability token to a same-origin relative payment URL (mock redirect). */

export function appendAccessTokenToUrl(
  paymentUrl: string,
  accessToken: string,
): string {
  const url = paymentUrl.trim();
  const token = accessToken.trim();
  if (!url || !token) return url;
  // Only decorate relative app paths — never rewrite absolute PSP URLs.
  if (/^https?:\/\//i.test(url)) return url;
  const sep = url.includes("?") ? "&" : "?";
  return `${url}${sep}token=${encodeURIComponent(token)}`;
}
