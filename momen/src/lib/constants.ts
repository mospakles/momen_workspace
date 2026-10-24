export const ORDER_STATUSES = [
  { value: "PENDING", label: "Pending" },
  { value: "CUTTING", label: "Cutting" },
  { value: "SEWING", label: "Sewing" },
  { value: "FITTING", label: "Fitting" },
  { value: "READY", label: "Ready for pickup" },
  { value: "DELIVERED", label: "Delivered" },
  { value: "CANCELLED", label: "Cancelled" },
] as const;

// Who an order is made for. Anything but CUSTOMER is in-house work: it costs money but nobody owes for it.
export const ORDER_PURPOSES = [
  { value: "CUSTOMER", label: "A customer" },
  { value: "MODELLING", label: "Modelling / photoshoot" },
  { value: "ADVERT", label: "Advert / campaign" },
  { value: "RTW", label: "Ready-to-wear stock" },
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

// Any other type typed in by hand counts as a running expense, like OPERATING.
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

export const MATERIAL_UNITS = ["yards", "metres", "pieces", "rolls", "packs", "cones"];

export const PAYMENT_METHODS = ["Transfer", "Cash", "POS"] as const;

export type MeasurementSet = "FEMALE" | "MALE";

// Standard tailoring measurements, grouped as they're taken. Names shared by both sets
// (Shoulder, Neck, Waist, Hips, sleeves, trousers) are spelled the same so values carry over.
export const MEASUREMENT_SETS: Record<MeasurementSet, { label: string; groups: { title: string; fields: string[] }[] }> = {
  MALE: {
    label: "Male",
    groups: [
      { title: "Top", fields: ["Neck", "Chest", "Stomach", "Shoulder", "Across back", "Armhole"] },
      { title: "Sleeves", fields: ["Sleeve length", "Short sleeve length", "Round sleeve (arm)", "Wrist"] },
      { title: "Lengths", fields: ["Shirt / top length", "Kaftan / senator length", "Jacket length", "Agbada length", "Agbada width", "Cap (head)"] },
      { title: "Trousers", fields: ["Waist", "Hips", "Trouser length", "Thigh", "Knee", "Ankle / bottom", "Crotch"] },
    ],
  },
  FEMALE: {
    label: "Female",
    groups: [
      { title: "Top", fields: ["Bust", "Under bust", "Waist", "Hips", "Shoulder", "Neck", "Bust point", "Nipple to nipple", "Shoulder to under bust", "Shoulder to waist", "Half length", "Armhole"] },
      { title: "Sleeves", fields: ["Sleeve length", "Round sleeve (arm)", "Elbow", "Wrist"] },
      { title: "Lengths", fields: ["Blouse length", "Waist to knee", "Skirt length", "Gown length"] },
      { title: "Trousers", fields: ["Trouser length", "Thigh", "Knee", "Ankle / bottom", "Crotch"] },
    ],
  },
};

export const setFields = (set: MeasurementSet) => MEASUREMENT_SETS[set].groups.flatMap((g) => g.fields);

/** Every standard measurement name across both sets. */
export const MEASUREMENT_FIELDS = [...new Set([...setFields("FEMALE"), ...setFields("MALE")])];

/** Which set a saved measurement belongs to, from the names it uses. */
export function guessMeasurementSet(values: Record<string, string>): MeasurementSet | null {
  const keys = Object.keys(values);
  const only = (a: MeasurementSet, b: MeasurementSet) => keys.filter((k) => setFields(a).includes(k) && !setFields(b).includes(k)).length;
  const male = only("MALE", "FEMALE");
  const female = only("FEMALE", "MALE");
  if (male === female) return null;
  return male > female ? "MALE" : "FEMALE";
}

export function labelFor(list: readonly { value: string; label: string }[], value: string) {
  return list.find((x) => x.value === value)?.label ?? value;
}
