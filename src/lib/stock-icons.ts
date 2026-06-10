/** Financial Modeling Prep — reliable ticker logos for US equities */
export function fmpStockImageUrl(symbol: string): string {
  const normalized = symbol.replace(".", "-");
  return `https://financialmodelingprep.com/image-stock/${encodeURIComponent(normalized)}.png`;
}

export function clearbitLogoUrl(domain: string | null | undefined): string | null {
  if (!domain) return null;
  return `https://logo.clearbit.com/${domain}`;
}

export function getStockLogoSources(symbol: string, logoDomain?: string | null): string[] {
  const sources = [fmpStockImageUrl(symbol)];
  const clearbit = clearbitLogoUrl(logoDomain);
  if (clearbit) sources.push(clearbit);
  return sources;
}
