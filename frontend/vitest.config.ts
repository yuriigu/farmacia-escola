import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  root: path.resolve(__dirname),
  plugins: [react()],
  resolve: {
    alias: {
      '@/services/api': path.resolve(__dirname, './src/services/api.ts'),
      '@/services/estoqueService': path.resolve(__dirname, './src/services/estoque-service.ts'),
      '@/services/agendamentoService': path.resolve(__dirname, './src/services/agendamento-service.ts'),
      '@/hooks/useEstoque': path.resolve(__dirname, './src/hooks/use-estoque.ts'),
      '@/hooks/useAgendamento': path.resolve(__dirname, './src/hooks/use-agendamento.ts'),
      '@/lib/api': path.resolve(__dirname, './src/lib/api.ts'),
      '@/lib/axios': path.resolve(__dirname, './src/lib/axios.ts'),
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: [path.resolve(__dirname, 'vitest.setup.ts')],
    include: ['tests/**/*-test.{ts,tsx}'],
  },
});
