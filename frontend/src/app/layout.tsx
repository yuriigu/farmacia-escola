import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { ThemeProvider } from "next-themes";
import { Toaster } from "sonner";
import { QueryProvider } from "@/providers/query-provider";
import "./globals.css";

// carrega a fonte plus jakarta sans pelo next/font. o next otimiza
// o carregamento e expoe a fonte como variavel css (--font-sans) pra
// ser consumida pelo tailwind. o display: swap evita texto invisivel
// enquanto a fonte carrega.
const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

// metadados do app (titulo da aba e meta description). o next injeta
// isso no head automaticamente.
export const metadata: Metadata = {
  title: "Farmácia Escola",
  description: "Sistema web para gerenciamento de uma Farmácia Escola universitária. Estoque, retiradas, descartes, agendamentos e gestão de pacientes.",
};

// layout raiz do app. define o html/body, a fonte global, o provider
// de tema, o provider do react-query e o toaster. tudo que aparece
// em qualquer rota passa por aqui.
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // lang pt-br pra acessibilidade e seo. suppresshydrationwarning
    // evita warning no console por causa do tema aplicado no client
    // (o next-themes muda a classe do html apos hidratar).
    <html lang="pt-BR" suppressHydrationWarning>
      <body
        // aplica a variavel da fonte e as classes padrao do tema
        // (bg-background e text-foreground vem do globals.css).
        className={`${plusJakarta.variable} font-sans antialiased bg-background text-foreground`}
      >
        {/* provider de tema. attribute='class' liga o modo dark na
            classe .dark do html, defaulttheme='light' forca claro por
            padrao, enablesystem=false ignora a preferencia do so, e
            disabletransitiononchange evita piscar cor na troca. */}
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem={false}
          disableTransitionOnChange
        >
          {/* provider do react-query, que envolve o app inteiro pra
              cachear e orquestrar as chamadas de api. */}
          <QueryProvider>
            {children}
            {/* toaster do sonner, canto superior direito, com cores,
                botao de fechar e so um toast visivel por vez. */}
            <Toaster richColors position="top-right" closeButton visibleToasts={1} />
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}