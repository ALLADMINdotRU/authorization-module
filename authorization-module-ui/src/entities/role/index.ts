export {
  roleApi,
  useListRolesQuery,
  useGetRoleQuery,
  useCreateRoleMutation,
  useUpdateRoleMutation,
  useDeleteRoleMutation,
} from "./api/roleApi"
export type {
  Role,
  RoleCreate,
  RoleSortField,
  RoleUpdate,
  ListRolesArgs,
} from "./model/types"
