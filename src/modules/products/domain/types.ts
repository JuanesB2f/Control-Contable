export type Product = {
  id: string
  name: string
  sku: string | null
  category: string | null
  salePrice: number
  /** Null when the viewer can't see costs (`costs.read`). */
  costPrice: number | null
  stock: number
  minStock: number
  isActive: boolean
  unitsSold30d: number
  revenue30d: number
  createdAt: string
  imageUrl: string | null
}
