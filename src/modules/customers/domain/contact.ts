const CALLING_CODES: Record<string, string> = {
  CO: "57",
  MX: "52",
  PE: "51",
  CL: "56",
  AR: "54",
  EC: "593",
  PA: "507",
  CR: "506",
  DO: "1",
  GT: "502",
  UY: "598",
  PY: "595",
  BO: "591",
  ES: "34",
  US: "1",
}

/** wa.me link for a phone typed the local way ("300 123 4567") or with its country code ("+57 300…"). */
export function whatsappUrl(phone: string | null, country: string) {
  if (!phone) return null
  const digits = phone.replace(/\D/g, "")
  if (digits.length < 7) return null
  const code = CALLING_CODES[country]
  const hasCode = phone.trim().startsWith("+") || !code || (digits.startsWith(code) && digits.length > 10)
  return `https://wa.me/${hasCode ? digits : `${code}${digits.replace(/^0+/, "")}`}`
}
