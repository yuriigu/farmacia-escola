import type { Metadata } from 'next';
import { LandingPage } from '@/components/pages/landing-page';

export const metadata: Metadata = {
  title: 'Farmácia Escola | Cuidado, ensino e gestão',
  description:
    'Conheça a Farmácia Escola: um espaço universitário que integra cuidado farmacêutico, aprendizado e gestão responsável.',
};

export default function RootPage() {
  return <LandingPage />;
}
