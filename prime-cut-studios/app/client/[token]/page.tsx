import {redirect} from 'next/navigation';
// Deprecated bearer-token portal: a saved old link must never bypass client sign-in.
export const dynamic='force-dynamic';
export default function LegacyClientLink(){redirect('/client/login');}
