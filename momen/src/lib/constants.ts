export const ORDER_STATUSES = [
  { value: "PENDING", label: "Pending" },
  { value: "CUTTING", label: "Cutting" },
  { value: "SEWING", label: "Sewing" },
  { value: "FITTING", label: "Fitting" },
  { value: "READY", label: "Ready for pickup" },
  { value: "DELIVERED", label: "Delivered" },
  { value: "CANCELLED", label: "Cancelled" },
] as const;

export const OPEN_STATUSES = ["PENDING", "CUTTING", "SEWING", "FITTING", "READY"];

export const ORDER_COST_CATEGORIES = [
  { value: "TAILOR", label: "Tailor pay" },
  { value: "EMBROIDERY", label: "Embroidery" },
  { value: "BUTTONHOLE", label: "Button holes" },
  { value: "BEADING", label: "Beading / stoning" },
  { value: "FABRIC", label: "Fabric" },
  { value: "LINING", label: "Lining" },
  { value: "ACCESSORIES", label: "Accessories (zip, buttons, thread…)" },
  { value: "TRANSPORT", label: "Transport / delivery" },
  { value: "OTHER", label: "Other" },
] as const;

export const EXPENSE_KINDS = [
  { value: "OPERATING", label: "Normal / day-to-day" },
  { value: "CAPITAL", label: "Big buy (equipment, machines)" },
] as const;

export const EXPENSE_CATEGORIES = [
  { value: "MATERIALS", label: "Materials / fabric stock" },
  { value: "ACCESSORIES", label: "Accessories (thread, zips, buttons…)" },
  { value: "EQUIPMENT", label: "Equipment / machines" },
  { value: "RENT", label: "Rent" },
  { value: "UTILITIES", label: "Electricity / utilities" },
  { value: "FUEL", label: "Fuel / generator" },
  { value: "TRANSPORT", label: "Transport" },
  { value: "SALARY", label: "Staff salary" },
  { value: "MARKETING", label: "Marketing / ads" },
  { value: "REPAIRS", label: "Repairs / maintenance" },
  { value: "DATA", label: "Data / airtime" },
  { value: "OTHER", label: "Other" },
] as const;

export const PHOTO_KINDS = [
  { value: "STYLE", label: "Style inspiration" },
  { value: "FABRIC", label: "Fabric" },
  { value: "FITTING", label: "Fitting" },
  { value: "FINISHED", label: "Finished outfit" },
] as const;

export const PAYMENT_METHODS = ["Transfer", "Cash", "POS"] as const;

// Standard measurement fields. Anything else can be added as a custom field on the form.
export const MEASUREMENT_FIELDS = [
  "Bust",
  "Under bust",
  "Waist",
  "Hips",
  "Shoulder",
  "Neck",
  "Bust point",
  "Nipple to nipple",
  "Shoulder to under bust",
  "Shoulder to waist",
  "Half length",
  "Blouse length",
  "Sleeve length",
  "Round sleeve (arm)",
  "Elbow",
  "Wrist",
  "Skirt length",
  "Gown length",
  "Trouser length",
  "Thigh",
  "Knee",
  "Ankle / bottom",
  "Crotch",
] as const;

export function labelFor(list: readonly { value: string; label: string }[], value: string) {
  return list.find((x) => x.value === value)?.label ?? value;
}
