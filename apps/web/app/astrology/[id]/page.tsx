import { redirect } from 'next/navigation';


// Canonical astrologer profile lives at /astrology/view?id=… for historical
// reasons. Provider-strip cards + "similar astrologers" rail + any external
// shares of /astrology/<id> would otherwise 404 into the global not-found
// loader. Redirect keeps the friendly URL working without duplicating the
// 550-line client profile component.
export default async function AstrologerByIdRedirect({
 params,
}: {
 params: Promise<{ id: string }>;
}) {
 const { id } = await params;
 redirect(`/astrology/view?id=${encodeURIComponent(id)}`);
}
