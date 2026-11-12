import { useState } from "react"
import type { ListSort } from "../../api/types"

export const useListSort = <Field extends string>(
  initialField: Field,
  resetPage: () => void,
) => {
  const [sort, setSort] = useState<ListSort<Field>>({
    sort_by: initialField,
    sort_order: "asc",
  })

  const sortBy = (field: Field, order?: ListSort<Field>["sort_order"]) => {
    setSort(current => ({
      sort_by: field,
      sort_order:
        order ??
        (current.sort_by === field && current.sort_order === "asc"
          ? "desc"
          : "asc"),
    }))
    resetPage()
  }

  return { sort, sortBy }
}
