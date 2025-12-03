export function formatBalance(value: string, decimals: number = 2): string {
  const num = parseFloat(value);
  if (isNaN(num)) return '0';
  return num.toFixed(decimals);
}
