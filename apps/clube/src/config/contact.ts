export const contact = {
  name: "Amanda",
  phone: "(32) 9938-8743",
  whatsapp: "553299388743",
  email: "contato@qualibeneficios.com.br",
} as const;
export function whatsappUrl(message = "Olá, Amanda! Vim pelo site do Cartão Quali Benefícios.") {
  return `https://wa.me/${contact.whatsapp}?text=${encodeURIComponent(message)}`;
}
