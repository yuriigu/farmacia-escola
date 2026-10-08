import Link from 'next/link';
import {
  ArrowRight,
  ArrowUpRight,
  Boxes,
  CalendarDays,
  Check,
  ClipboardCheck,
  GraduationCap,
  Pill,
  ShieldCheck,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/shared/theme-toggle';

const features = [
  {
    icon: Boxes,
    title: 'Estoque organizado',
    description:
      'Acompanhe medicamentos e lotes com informações claras para apoiar uma gestão responsável.',
  },
  {
    icon: CalendarDays,
    title: 'Agendamentos simples',
    description:
      'Consulte horários e organize solicitações de atendimento em um só lugar.',
  },
  {
    icon: ClipboardCheck,
    title: 'Dispensação acompanhada',
    description:
      'Registre atendimentos com processos que apoiam a prática farmacêutica supervisionada.',
  },
  {
    icon: ShieldCheck,
    title: 'Gestão com rastreabilidade',
    description:
      'Mantenha o histórico das operações para dar mais transparência à rotina da unidade.',
  },
];

const steps = [
  {
    number: '01',
    title: 'Acesse os serviços',
    description: 'Encontre as informações e os serviços disponíveis para a comunidade.',
  },
  {
    number: '02',
    title: 'Organize seu atendimento',
    description: 'Consulte a agenda e solicite um horário de forma prática.',
  },
  {
    number: '03',
    title: 'Conte com a equipe',
    description: 'Receba atendimento em um ambiente universitário de cuidado e aprendizado.',
  },
];

export function LandingPage() {
  return (
    <main className="overflow-hidden bg-white text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <header className="relative z-10 border-b border-emerald-950/5 bg-white/85 backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/85">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-3 py-4 sm:px-8">
          <Link href="/" aria-label="Farmácia Escola, página inicial" className="flex items-center gap-2 sm:gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-2xl bg-linear-to-br from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-600/20 sm:size-11">
              <Pill className="size-6" aria-hidden="true" />
            </span>
            <span className="text-sm font-extrabold tracking-tight sm:text-lg">
              Farmácia <span className="text-emerald-600 dark:text-emerald-400">Escola</span>
            </span>
          </Link>

          <nav aria-label="Navegação principal" className="flex shrink-0 items-center gap-1 sm:gap-3">
            <ThemeToggle />
            <Link
              href="/login"
              className="rounded-xl px-2 py-2 text-sm font-semibold text-slate-600 transition hover:text-emerald-700 dark:text-slate-300 dark:hover:text-emerald-300 sm:px-4"
            >
              Entrar
            </Link>
            <Button asChild variant="gradient" size="sm" className="px-2 text-xs sm:h-10 sm:px-4 sm:text-sm">
              <Link href="/register">Criar conta</Link>
            </Button>
          </nav>
        </div>
      </header>

      <section className="relative isolate">
        <div className="absolute inset-0 -z-10 bg-linear-to-br from-emerald-50 via-white to-teal-50 dark:from-emerald-950/40 dark:via-slate-950 dark:to-teal-950/30" />
        <div className="absolute -right-32 top-0 -z-10 size-96 rounded-full bg-emerald-300/20 blur-3xl dark:bg-emerald-500/10" />
        <div className="mx-auto grid max-w-7xl items-center gap-14 px-5 py-16 sm:px-8 sm:py-20 lg:grid-cols-[1.05fr_0.95fr] lg:gap-10 lg:py-28">
          <div className="max-w-2xl">
            <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-white/75 px-4 py-2 text-xs font-bold uppercase tracking-[0.13em] text-emerald-800 shadow-sm dark:border-emerald-800 dark:bg-slate-900/70 dark:text-emerald-300">
              <GraduationCap className="size-4" aria-hidden="true" />
              Cuidado que ensina. Ensino que cuida.
            </div>
            <h1 className="text-4xl font-extrabold leading-[1.08] tracking-tight sm:text-5xl lg:text-6xl">
              Saúde, conhecimento e cuidado{' '}
              <span className="bg-linear-to-r from-emerald-600 to-teal-500 bg-clip-text text-transparent dark:from-emerald-400 dark:to-teal-300">
                mais perto de você.
              </span>
            </h1>
            <p className="mt-6 max-w-xl text-base leading-8 text-slate-600 dark:text-slate-300 sm:text-lg">
              A Farmácia Escola conecta a comunidade à atenção farmacêutica e fortalece a formação
              universitária em um espaço de cuidado, orientação e aprendizado.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Button asChild variant="gradient" size="lg" className="h-12 rounded-xl px-6">
                <Link href="/register">
                  Acessar serviços
                  <ArrowRight className="size-4" aria-hidden="true" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="h-12 rounded-xl px-6">
                <a href="#como-funciona">Conheça a Farmácia Escola</a>
              </Button>
            </div>
            <div className="mt-8 flex flex-wrap gap-x-6 gap-y-3 text-sm font-medium text-slate-600 dark:text-slate-300">
              <span className="inline-flex items-center gap-2">
                <Check className="size-4 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
                Cuidado farmacêutico
              </span>
              <span className="inline-flex items-center gap-2">
                <Check className="size-4 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
                Formação universitária
              </span>
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-xl">
            <div className="absolute -inset-5 rounded-[2.5rem] bg-linear-to-br from-emerald-300/40 to-teal-200/20 blur-2xl dark:from-emerald-700/20 dark:to-teal-700/10" />
            <div className="relative rounded-[2rem] border border-white/80 bg-white/90 p-5 shadow-2xl shadow-emerald-950/10 backdrop-blur dark:border-slate-700 dark:bg-slate-900/90 sm:p-7">
              <div className="flex items-center justify-between border-b border-slate-100 pb-5 dark:border-slate-800">
                <div className="flex items-center gap-3">
                  <span className="flex size-11 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300">
                    <Pill className="size-5" aria-hidden="true" />
                  </span>
                  <div>
                    <p className="font-bold">Cuidado integrado</p>
                    <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">Comunidade e universidade</p>
                  </div>
                </div>
                <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                  Farmácia Escola
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 py-5 sm:gap-4">
                <div className="rounded-2xl bg-emerald-50/80 p-4 dark:bg-emerald-950/50 sm:p-5">
                  <CalendarDays className="mb-5 size-5 text-emerald-700 dark:text-emerald-400" aria-hidden="true" />
                  <p className="text-sm font-bold">Atendimento</p>
                  <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
                    Acesso à agenda e aos serviços
                  </p>
                </div>
                <div className="rounded-2xl bg-teal-50/80 p-4 dark:bg-teal-950/40 sm:p-5">
                  <GraduationCap className="mb-5 size-5 text-teal-700 dark:text-teal-400" aria-hidden="true" />
                  <p className="text-sm font-bold">Aprendizado</p>
                  <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
                    Prática em ambiente universitário
                  </p>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800/50 sm:p-5">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold">Uma jornada de cuidado</p>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Serviços conectados em um só lugar</p>
                  </div>
                  <span className="flex size-10 items-center justify-center rounded-xl bg-white text-emerald-700 shadow-sm dark:bg-slate-700 dark:text-emerald-300">
                    <ShieldCheck className="size-5" aria-hidden="true" />
                  </span>
                </div>
                <div className="flex items-center gap-2" aria-hidden="true">
                  <span className="h-1.5 flex-1 rounded-full bg-emerald-500" />
                  <span className="h-1.5 flex-1 rounded-full bg-emerald-300 dark:bg-emerald-700" />
                  <span className="h-1.5 flex-1 rounded-full bg-slate-200 dark:bg-slate-700" />
                </div>
                <div className="mt-3 flex justify-between text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                  <span>Acesso</span>
                  <span>Agendamento</span>
                  <span>Atendimento</span>
                </div>
              </div>

              <Link
                href="/login"
                className="mt-5 flex items-center justify-between rounded-xl px-1 py-2 text-sm font-bold text-emerald-700 transition hover:text-emerald-800 dark:text-emerald-300 dark:hover:text-emerald-200"
              >
                Já tem uma conta? Entre aqui
                <ArrowUpRight className="size-4" aria-hidden="true" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section id="servicos" className="scroll-mt-8 px-5 py-20 sm:px-8 sm:py-24">
        <div className="mx-auto max-w-7xl">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-bold uppercase tracking-[0.16em] text-emerald-700 dark:text-emerald-400">
              Um espaço para cuidar e aprender
            </p>
            <h2 className="mt-4 text-3xl font-extrabold tracking-tight sm:text-4xl">
              Uma experiência integrada para toda a comunidade
            </h2>
            <p className="mt-4 leading-7 text-slate-600 dark:text-slate-300">
              Serviços e ferramentas para aproximar o cuidado farmacêutico da formação acadêmica.
            </p>
          </div>

          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {features.map(({ icon: Icon, title, description }) => (
              <article
                key={title}
                className="group rounded-3xl border border-slate-200/80 bg-white p-6 transition duration-300 hover:-translate-y-1 hover:border-emerald-200 hover:shadow-xl hover:shadow-emerald-950/5 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-emerald-900"
              >
                <span className="flex size-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700 transition group-hover:bg-emerald-600 group-hover:text-white dark:bg-emerald-950 dark:text-emerald-300 dark:group-hover:bg-emerald-600">
                  <Icon className="size-5" aria-hidden="true" />
                </span>
                <h3 className="mt-5 font-bold">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-400">{description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="como-funciona" className="scroll-mt-8 bg-slate-50 px-5 py-20 dark:bg-slate-900/50 sm:px-8 sm:py-24">
        <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:items-center">
          <div className="max-w-lg">
            <p className="text-sm font-bold uppercase tracking-[0.16em] text-emerald-700 dark:text-emerald-400">
              Como funciona
            </p>
            <h2 className="mt-4 text-3xl font-extrabold tracking-tight sm:text-4xl">
              Da informação ao atendimento, com simplicidade.
            </h2>
            <p className="mt-5 leading-7 text-slate-600 dark:text-slate-300">
              A plataforma reúne os principais pontos de contato com a Farmácia Escola para que você
              encontre os serviços e se organize com tranquilidade.
            </p>
            <Button asChild variant="gradient" size="lg" className="mt-8 h-12 rounded-xl px-6">
              <Link href="/register">
                Começar agora
                <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
            </Button>
          </div>

          <ol className="grid gap-4 sm:grid-cols-3">
            {steps.map((step) => (
              <li
                key={step.number}
                className="rounded-3xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-950"
              >
                <span className="text-sm font-extrabold tracking-widest text-emerald-600 dark:text-emerald-400">
                  {step.number}
                </span>
                <h3 className="mt-5 font-bold">{step.title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-400">{step.description}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="px-5 py-16 sm:px-8 sm:py-20">
        <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-7 rounded-[2rem] bg-linear-to-br from-emerald-700 to-teal-700 px-7 py-10 text-white shadow-xl shadow-emerald-900/15 sm:px-12 sm:py-12 lg:flex-row lg:items-center">
          <div className="max-w-2xl">
            <p className="text-sm font-bold uppercase tracking-[0.15em] text-emerald-100">
              Farmácia Escola
            </p>
            <h2 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">
              Cuidado que transforma. Conhecimento que aproxima.
            </h2>
          </div>
          <Button
            asChild
            variant="outline"
            size="lg"
            className="h-12 shrink-0 rounded-xl border-white/40 bg-white text-emerald-800 hover:bg-emerald-50 dark:border-white/40 dark:bg-white dark:text-emerald-800 dark:hover:bg-emerald-50"
          >
            <Link href="/register">
              Acessar serviços
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </Button>
        </div>
      </section>

      <footer className="border-t border-slate-200 px-5 py-7 dark:border-slate-800 sm:px-8">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 text-center sm:flex-row sm:text-left">
          <Link href="/" className="flex items-center gap-2.5 font-bold">
            <span className="flex size-8 items-center justify-center rounded-xl bg-emerald-600 text-white">
              <Pill className="size-4" aria-hidden="true" />
            </span>
            Farmácia Escola
          </Link>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Cuidado, ensino e gestão farmacêutica em um só lugar.
          </p>
          <Link
            href="/login"
            className="text-sm font-semibold text-emerald-700 hover:text-emerald-800 dark:text-emerald-300 dark:hover:text-emerald-200"
          >
            Entrar na plataforma
          </Link>
        </div>
      </footer>
    </main>
  );
}
