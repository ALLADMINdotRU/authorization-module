export type Page<T> = {
  items: T[]
  total: number
  page: number
  limit: number
  pages: number
}

export type ListSort<Field extends string> = {
  sort_by: Field
  sort_order: "asc" | "desc"
}
