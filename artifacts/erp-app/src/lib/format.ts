import { format } from "date-fns";
import { arEG } from "date-fns/locale";

export const formatCurrency = (amount: number | null | undefined): string => {
  if (amount == null) return "0.00 ج.م";
  return new Intl.NumberFormat("ar-EG", {
    style: "currency",
    currency: "EGP",
  }).format(amount);
};

export const formatDate = (dateString: string | null | undefined): string => {
  if (!dateString) return "-";
  try {
    return format(new Date(dateString), "dd MMMM yyyy", { locale: arEG });
  } catch (e) {
    return dateString;
  }
};
