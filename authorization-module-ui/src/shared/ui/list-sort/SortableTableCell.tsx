import { TableCell, TableSortLabel } from "@mui/material"
import type { ListSort } from "../../api/types"

type SortableTableCellProps<Field extends string> = {
  field: Field
  label: string
  sort: ListSort<Field>
  onSort: (field: Field) => void
}

export const SortableTableCell = <Field extends string>({
  field,
  label,
  sort,
  onSort,
}: SortableTableCellProps<Field>) => {
  const active = sort.sort_by === field

  return (
    <TableCell sortDirection={active ? sort.sort_order : false}>
      <TableSortLabel
        active={active}
        direction={active ? sort.sort_order : "asc"}
        onClick={() => {
          onSort(field)
        }}
      >
        {label}
      </TableSortLabel>
    </TableCell>
  )
}
