/** يُظهر آخر 3 أرقام فقط من رقم الهاتف، ويعيد نصاً فارغاً إن لم يوجد رقم كافٍ */
export function maskPhone(phone: string | null | undefined): string {
  const digits = (phone ?? "").replace(/\D/g, "").replace(/^963/, "");
  return digits.length >= 3 ? `***${digits.slice(-3)}` : "";
}
