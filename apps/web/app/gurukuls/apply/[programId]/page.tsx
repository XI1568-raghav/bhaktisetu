
import type { Metadata } from 'next';
import ApplyClient from './ApplyClient';

interface Params { programId: string }

export const metadata: Metadata = {
  title: 'Apply — Gurukul Admission',
  description: 'Submit a gurukul admission application with parent consent if applicant is a minor.',
};

export default async function ApplyPage({ params }: { params: Promise<Params> }) {
  const { programId } = await params;
  return <ApplyClient programId={programId} />;
}
