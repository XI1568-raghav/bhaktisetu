'use client';

import { useState, type ReactNode } from 'react';
import { isProofKey, openProof } from '../../lib/proof-video';

interface Props {
  bookingId: string;
  stored: string;
  token?: string | null;
  className?: string;
  children: ReactNode;
}

/** A link to a booking's video proof: plain <a> for legacy URLs, signed-URL fetch for private keys. */
export default function ProofLink({ bookingId, stored, token, className, children }: Props) {
  const [failed, setFailed] = useState(false);
  if (!isProofKey(stored)) {
    return (
      <a href={stored} target="_blank" rel="noopener noreferrer" className={className}>
        {children}
      </a>
    );
  }
  return (
    <a
      href="#"
      role="button"
      className={className}
      onClick={async (e) => {
        e.preventDefault();
        setFailed(!(await openProof(bookingId, stored, token)));
      }}
    >
      {failed ? 'Video could not be loaded - tap to retry' : children}
    </a>
  );
}
