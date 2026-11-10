export const NIGERIA_STATES = [
  "Abia",
  "Abuja (FCT)",
  "Adamawa",
  "Akwa Ibom",
  "Anambra",
  "Bauchi",
  "Bayelsa",
  "Benue",
  "Borno",
  "Cross River",
  "Delta",
  "Ebonyi",
  "Edo",
  "Ekiti",
  "Enugu",
  "Gombe",
  "Imo",
  "Jigawa",
  "Kaduna",
  "Kano",
  "Katsina",
  "Kebbi",
  "Kogi",
  "Kwara",
  "Lagos",
  "Nasarawa",
  "Niger",
  "Ogun",
  "Ondo",
  "Osun",
  "Oyo",
  "Plateau",
  "Rivers",
  "Sokoto",
  "Taraba",
  "Yobe",
  "Zamfara",
];

export type DeliveryRates = {
  feeSameState: number;
  feeOtherStates: number;
  freeOver: number | null;
  originState: string | null;
};

// "Lagos State", "lagos" and "Lagos" all count as the same state.
export function normalizeState(value: string | null | undefined): string {
  const cleaned = (value || "")
    .toLowerCase()
    .trim()
    .replace(/\s+state$/, "")
    .replace(/[^a-z]/g, "");

  if (
    cleaned === "fct" ||
    cleaned === "abuja" ||
    cleaned === "abujafct" ||
    cleaned === "fctabuja" ||
    cleaned === "federalcapitalterritory"
  ) {
    return "fct";
  }

  return cleaned;
}

export function calculateDeliveryFee(
  rates: DeliveryRates,
  buyerState: string,
  subtotal: number
): number {
  if (
    rates.freeOver !== null &&
    rates.freeOver > 0 &&
    subtotal >= rates.freeOver
  ) {
    return 0;
  }

  const sameState =
    Boolean(rates.originState) &&
    normalizeState(rates.originState) === normalizeState(buyerState);

  const fee = sameState ? rates.feeSameState : rates.feeOtherStates;

  return Math.max(0, Number(fee) || 0);
}