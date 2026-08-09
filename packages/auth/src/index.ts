/** Clerk auth boundary — product code must not read roles from client metadata alone. */
export type TenantContext = {
  userId: string;
  organisationId?: string;
  roles: string[];
  permissions: string[];
};

export type AuthorizeInput = {
  action: string;
  tenant: TenantContext;
  resourceOrganisationId?: string;
};

export function authorize(input: AuthorizeInput): boolean {
  if (input.resourceOrganisationId && input.tenant.organisationId !== input.resourceOrganisationId) {
    return false;
  }
  if (input.tenant.permissions.includes('*')) return true;
  return input.tenant.permissions.includes(input.action);
}
