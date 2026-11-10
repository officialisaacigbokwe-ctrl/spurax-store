// Spurax platform fee. Change these two numbers to change the fee.
export const PLATFORM_FEE_PERCENT = 5;
export const PLATFORM_FEE_MIN_NGN = 100;

// Returns the fee in kobo (1 naira = 100 kobo) for an order amount in kobo.
export function calculatePlatformFeeKobo(amountInKobo: number): number {
  const percentFee = Math.round(amountInKobo * (PLATFORM_FEE_PERCENT / 100));
  const minimumFee = PLATFORM_FEE_MIN_NGN * 100;

  const fee = Math.max(percentFee, minimumFee);

  // Safety: never take more than half of a very small order.
  return Math.min(fee, Math.floor(amountInKobo / 2));
}