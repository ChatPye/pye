import { redirect } from 'next/navigation'

// Server component that immediately redirects extension users to Clerk auth
// Preserves extension=true and redirect=<extension-return-url>
export default async function StartRedirect({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const resolved = await searchParams
  const extension = typeof resolved.extension === 'string' ? resolved.extension : undefined
  const returnUrl = typeof resolved.redirect === 'string' ? resolved.redirect : undefined

  const qs = new URLSearchParams()
  if (extension) qs.set('extension', extension)
  if (returnUrl) qs.set('redirect', encodeURIComponent(returnUrl))

  // Prefer sign-in; Clerk will present sign-up as an option
  const target = qs.toString().length > 0 ? `/sign-in?${qs.toString()}` : '/sign-in'
  redirect(target)
}


