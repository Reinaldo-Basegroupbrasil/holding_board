import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  // Onde estão seus testes
  testDir: './tests',
  // Roda testes em paralelo para ser mais rápido
  fullyParallel: true,
  // Tenta rodar de novo se falhar (útil para testes instáveis)
  retries: 1,
  // Configurações globais
  use: {
    // URL base do seu site (assim não precisa repetir no teste)
    baseURL: 'http://localhost:3000',
    // Tira print e grava vídeo apenas se der erro (economiza espaço)
    trace: 'on-first-retry',
  },

  projects: [
    {
      name: 'Microsoft Edge',
      use: {
        // Esta linha é a mágica que usa o seu navegador instalado
        channel: 'msedge', 
        headless: false, // true = escondido, false = mostra a janela
        viewport: { width: 1280, height: 720 },
        ignoreHTTPSErrors: true,
      },
    },
  ],
});