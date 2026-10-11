/**
 * Normaliza número de telefone brasileiro para apenas dígitos.
 * Remove +55 se houver, garantindo padrão de 10 ou 11 dígitos.
 */
export function normalizePhone(rawPhone: string): string {
  if (!rawPhone) return "";
  let digits = rawPhone.replace(/\D/g, "");
  if (digits.startsWith("55") && digits.length >= 12) {
    digits = digits.substring(2);
  }
  return digits;
}

/**
 * Formata número de telefone para visualização brasileira: (XX) 9XXXX-XXXX
 */
export function formatPhone(rawPhone: string): string {
  const digits = normalizePhone(rawPhone);
  if (digits.length === 11) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  }
  if (digits.length === 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  return rawPhone;
}
