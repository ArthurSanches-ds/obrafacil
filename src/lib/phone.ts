// Link do WhatsApp a partir do telefone digitado do jeito que for:
// "(22) 99812-4410" → https://wa.me/5522998124410
export function whatsappLink(phone: string | null | undefined) {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 10) return null;
  const withCountry = digits.length <= 11 ? `55${digits}` : digits;
  return `https://wa.me/${withCountry}`;
}
