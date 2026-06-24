import { Receipt, ShoppingBag, PiggyBank, CreditCard, ArrowDownLeft } from "lucide-react";

// Visual identity for each expense type, kept in one place.
export const TYPE_META = {
  bill: { label: "Bill", Icon: Receipt, tint: "bg-jade-soft text-jade" },
  spending: { label: "Spending", Icon: ShoppingBag, tint: "bg-[#eef0f3] text-ink" },
  saving: { label: "Saving", Icon: PiggyBank, tint: "bg-amber-soft text-amber" },
  debt: { label: "Debt", Icon: CreditCard, tint: "bg-clay-soft text-clay" },
  income: { label: "Income", Icon: ArrowDownLeft, tint: "bg-jade text-white" },
};

export function typeMeta(type) {
  return TYPE_META[type] || TYPE_META.spending;
}
