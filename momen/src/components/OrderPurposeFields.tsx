"use client";

import { useState } from "react";
import type { Customer } from "@prisma/client";
import { ORDER_PURPOSES } from "@/lib/constants";
import { Field } from "./ui";

const HINTS: Record<string, string> = {
  MODELLING: "In-house: costs are tracked, nobody owes for it. Pick the model if you want their measurements.",
  ADVERT: "In-house: costs are tracked, nobody owes for it. Pick the model if you want their measurements.",
  RTW: "In-house: put the expected selling price for all pieces as the price, and record each sale as a payment.",
};

/** "Made for" choice; the customer is required for customer orders and optional (the model / wearer) otherwise. */
export function OrderPurposeFields({ customers, purpose, customerId }: { customers: Customer[]; purpose?: string; customerId?: number | null }) {
  const [p, setP] = useState(purpose ?? "CUSTOMER");
  const forCustomer = p === "CUSTOMER";

  return (
    <>
      <Field label="Made for *">
        <select name="purpose" className="input" value={p} onChange={(e) => setP(e.target.value)}>
          {ORDER_PURPOSES.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </Field>
      <Field label={forCustomer ? "Customer *" : "Model / wearer (optional)"}>
        <select name="customerId" className="input" required={forCustomer} defaultValue={customerId ?? ""}>
          <option value="">{forCustomer ? "Choose a customer…" : "No one in particular"}</option>
          {customers.map((c) => (
            <option key={c.id} value={c.id}>{c.name}{c.phone ? ` · ${c.phone}` : ""}</option>
          ))}
        </select>
      </Field>
      {HINTS[p] && <p className="sm:col-span-2 text-xs text-muted -mt-2">{HINTS[p]}</p>}
    </>
  );
}
