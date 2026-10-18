// Prerendered copy of /store for the query-less landing request. See ../pujas/page.tsx.
import StorePage, { metadata as storeMetadata } from '../../store/page';

export const revalidate = 3600;
export const metadata = storeMetadata;

export default function StoreStaticShell() {
  return <StorePage searchParams={Promise.resolve({})} />;
}
