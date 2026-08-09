import { redirect } from 'next/navigation';

type Props = {
  params: Promise<{ resourceId: string }>;
};

export default async function AppWorkspaceResourcePage({ params }: Props) {
  const { resourceId } = await params;
  redirect(`/workspace/${encodeURIComponent(resourceId)}`);
}
