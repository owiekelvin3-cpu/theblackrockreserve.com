/** Financial Modeling Prep — reliable ticker logos for US equities */
export function fmpStockImageUrl(symbol: string): string {
  const normalized = symbol.replace(".", "-");
  return `https://financialmodelingprep.com/image-stock/${encodeURIComponent(normalized)}.png`;
}

/** Google favicon service — reliable fallback when FMP has no logo */
export function domainFaviconUrl(domain: string | null | undefined): string | null {
  if (!domain) return null;
  return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=128`;
}

export function getStockLogoSources(symbol: string, logoDomain?: string | null): string[] {
  const sources = [fmpStockImageUrl(symbol)];
  const favicon = domainFaviconUrl(logoDomain);
  if (favicon) sources.push(favicon);
  return sources;
}
