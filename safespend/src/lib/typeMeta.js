import { Receipt, ShoppingBag, PiggyBank, CreditCard, ArrowDownLeft } from "lucide-react";

// Visual identity for each expense type, kept in one place.
export const TYPE_META = {
  bill: { label: "Bill", Icon: Receipt, tint: "bg-iris-soft text-iris", bar: "bg-iris" },
  spending: { label: "Spending", Icon: ShoppingBag, tint: "bg-blue-soft text-blue", bar: "bg-blue" },
  saving: { label: "Saving", Icon: PiggyBank, tint: "bg-amber-soft text-amber", bar: "bg-amber" },
  debt: { label: "Debt", Icon: CreditCard, tint: "bg-clay-soft text-clay", bar: "bg-clay" },
  income: { label: "Income", Icon: ArrowDownLeft, tint: "bg-mint-soft text-jade", bar: "bg-mint" },
};

export function typeMeta(type) {
  return TYPE_META[type] || TYPE_META.spending;
}
