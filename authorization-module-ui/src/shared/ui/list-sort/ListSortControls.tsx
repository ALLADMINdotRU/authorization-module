import { TextField } from "@mui/material"
import { useTranslation } from "react-i18next"
import type { ListSort } from "../../api/types"

type ListSortControlsProps<Field extends string> = {
  fields: Record<Field, string>
  sort: ListSort<Field>
  onSort: (field: Field, order: ListSort<Field>["sort_order"]) => void
}

export const ListSortControls = <Field extends string>({
  fields,
  sort,
  onSort,
}: ListSortControlsProps<Field>) => {
  const { t } = useTranslation()
  const fieldNames = Object.keys(fields) as Field[]
  const directions = [
    { order: "asc", label: t("common.sortAscending"), arrow: "↑" },
    { order: "desc", label: t("common.sortDescending"), arrow: "↓" },
  ] as const

  return (
    <TextField
      select
      size="small"
      label={t("common.sortBy")}
      value={`${sort.sort_by}:${sort.sort_order}`}
      slotProps={{ select: { native: true } }}
      onChange={event => {
        const [field, order] = event.target.value.split(":")
        const selectedField = fieldNames.find(name => name === field)
        if (
          selectedField !== undefined &&
          (order === "asc" || order === "desc")
        ) {
          onSort(selectedField, order)
        }
      }}
      sx={{ minWidth: 180, maxWidth: "100%", mb: 2 }}
    >
      {directions.map(({ order, label, arrow }) => (
        <optgroup key={order} label={label}>
          {fieldNames.map(field => (
            <option key={field} value={`${field}:${order}`}>
              {fields[field]} {arrow}
            </option>
          ))}
        </optgroup>
      ))}
    </TextField>
  )
}
