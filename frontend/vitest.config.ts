import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  root: path.resolve(__dirname),
  plugins: [react()],
  resolve: {
    alias: {
      '@/services/api': path.resolve(__dirname, './src/services/Api.ts'),
      '@/services/estoqueService': path.resolve(__dirname, './src/services/EstoqueService.ts'),
      '@/services/agendamentoService': path.resolve(__dirname, './src/services/AgendamentoService.ts'),
      '@/hooks/useEstoque': path.resolve(__dirname, './src/hooks/UseEstoque.ts'),
      '@/hooks/useAgendamento': path.resolve(__dirname, './src/hooks/UseAgendamento.ts'),
      '@/lib/api': path.resolve(__dirname, './src/lib/Api.ts'),
      '@/lib/axios': path.resolve(__dirname, './src/lib/Axios.ts'),
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: [path.resolve(__dirname, 'vitest.setup.ts')],
    include: ['__tests__/**/*.{test,spec}.{ts,tsx}'],
  },
});
