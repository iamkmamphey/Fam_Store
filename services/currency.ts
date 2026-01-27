export const USD_TO_GHS = 12;

export function moneyRound(value: number): number {
  return Math.round(value * 100) / 100;
}

export function usdToGhs(usd: number): number {
  return moneyRound(usd * USD_TO_GHS);
}

export function ghsToUsd(ghs: number): number {
  return moneyRound(ghs / USD_TO_GHS);
}

