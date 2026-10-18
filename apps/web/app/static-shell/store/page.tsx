// Prerendered copy of /store for the query-less landing request. See ../pujas/page.tsx.
import type { Metadata } from 'next';
import StorePage, { metadata as storeMetadata } from '../../store/page';

export const revalidate = 3600;
export const metadata: Metadata = {
  ...storeMetadata,
  alternates: { canonical: (storeMetadata.alternates as { canonical: string }).canonical },
  description: storeMetadata.description ?? 'Darshya store',
};

export default function StoreStaticShell() {
  return <StorePage searchParams={Promise.resolve({})} />;
}
