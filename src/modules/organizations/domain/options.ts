export type CountryOption = {
  code: string
  name: string
  currency: string
  timezone: string
  locale: string
}

export const COUNTRIES = [
  { code: "CO", name: "Colombia", currency: "COP", timezone: "America/Bogota", locale: "es-CO" },
  { code: "MX", name: "México", currency: "MXN", timezone: "America/Mexico_City", locale: "es-MX" },
  { code: "PE", name: "Perú", currency: "PEN", timezone: "America/Lima", locale: "es-PE" },
  { code: "CL", name: "Chile", currency: "CLP", timezone: "America/Santiago", locale: "es-CL" },
  { code: "AR", name: "Argentina", currency: "ARS", timezone: "America/Argentina/Buenos_Aires", locale: "es-AR" },
  { code: "EC", name: "Ecuador", currency: "USD", timezone: "America/Guayaquil", locale: "es-EC" },
  { code: "PA", name: "Panamá", currency: "USD", timezone: "America/Panama", locale: "es-PA" },
  { code: "CR", name: "Costa Rica", currency: "CRC", timezone: "America/Costa_Rica", locale: "es-CR" },
  { code: "DO", name: "República Dominicana", currency: "DOP", timezone: "America/Santo_Domingo", locale: "es-DO" },
  { code: "GT", name: "Guatemala", currency: "GTQ", timezone: "America/Guatemala", locale: "es-GT" },
  { code: "UY", name: "Uruguay", currency: "UYU", timezone: "America/Montevideo", locale: "es-UY" },
  { code: "PY", name: "Paraguay", currency: "PYG", timezone: "America/Asuncion", locale: "es-PY" },
  { code: "BO", name: "Bolivia", currency: "BOB", timezone: "America/La_Paz", locale: "es-BO" },
  { code: "ES", name: "España", currency: "EUR", timezone: "Europe/Madrid", locale: "es-ES" },
  { code: "US", name: "Estados Unidos", currency: "USD", timezone: "America/New_York", locale: "es-US" },
] as const satisfies readonly CountryOption[]

export type CountryCode = (typeof COUNTRIES)[number]["code"]

export const COUNTRY_CODES = COUNTRIES.map((country) => country.code) as [CountryCode, ...CountryCode[]]

export const CURRENCIES = [
  { code: "COP", name: "Peso colombiano" },
  { code: "MXN", name: "Peso mexicano" },
  { code: "PEN", name: "Sol peruano" },
  { code: "CLP", name: "Peso chileno" },
  { code: "ARS", name: "Peso argentino" },
  { code: "CRC", name: "Colón costarricense" },
  { code: "DOP", name: "Peso dominicano" },
  { code: "GTQ", name: "Quetzal" },
  { code: "UYU", name: "Peso uruguayo" },
  { code: "PYG", name: "Guaraní" },
  { code: "BOB", name: "Boliviano" },
  { code: "USD", name: "Dólar estadounidense" },
  { code: "EUR", name: "Euro" },
] as const

export type CurrencyCode = (typeof CURRENCIES)[number]["code"]

export const CURRENCY_CODES = CURRENCIES.map((currency) => currency.code) as [CurrencyCode, ...CurrencyCode[]]

export const TIMEZONES = [
  ...new Set<string>([...COUNTRIES.map((country) => country.timezone), "America/Chicago", "America/Los_Angeles"]),
].sort()

export const BUSINESS_TYPES = [
  "Tienda de ropa y accesorios",
  "Restaurante o cafetería",
  "Minimercado o tienda de barrio",
  "Belleza y cuidado personal",
  "Tecnología y electrónica",
  "Ferretería",
  "Farmacia o droguería",
  "Distribuidora o mayorista",
  "Servicios profesionales",
  "Otro",
] as const

export function findCountry(code: string) {
  return COUNTRIES.find((country) => country.code === code)
}
