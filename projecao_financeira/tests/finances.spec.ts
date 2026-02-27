  import { test, expect } from '@playwright/test';

  // -------------------------------------------------------------------
  // CONFIGURAÇÃO
  const REAL_PROJECT_ID = 'http://localhost:3000/dashboard/project/4b685c30-ff17-47cd-b3bf-2eb156785eaa;'
  const USER_EMAIL = 'reinaldorgoncalves1@gmail.com';     // <--- COLOQUE SEU EMAIL DE LOGIN AQUI
  const USER_PASS  = 'M@lfeitofeito6';    // <--- COLOQUE SUA SENHA AQUI
  // -------------------------------------------------------------------
  
  const PROJECT_URL = `http://localhost:3000/dashboard/project/4b685c30-ff17-47cd-b3bf-2eb156785eaa`;
  
  test('Fluxo completo: Login -> Criar Premissa -> Validar Tabela', async ({ page }) => {
  
    // 1. Tenta acessar a página do projeto
    await page.goto(PROJECT_URL);
  
    // 2. DETECTA SE CAIU NO LOGIN
    if (await page.locator('input[type="email"]').isVisible()) {
      console.log('Detectada tela de login. Realizando autenticação...');
      
      await page.locator('input[type="email"]').fill(USER_EMAIL);
      await page.locator('input[type="password"]').fill(USER_PASS);
      
      // Clica em Entrar e espera navegar
      await page.getByRole('button', { name: /entrar|login|acessar|sign in/i }).click();
      await page.waitForURL(/dashboard/, { timeout: 15000 });
  
      // --- O PULO DO GATO ---
      // Após logar, forçamos a ida para o projeto certo, caso ele tenha parado na Home
      console.log('Redirecionando para o projeto específico...');
      await page.goto(PROJECT_URL);
    }
  
    // 3. Valida se carregou a tabela (Usamos Regex /.../i para ser flexível com letras maiúsculas/minúsculas)
    // Agora procura por "Demonstrativo" ou "DRE", pois o título exato pode variar
    await expect(page.getByText(/Demonstrativo de Resultados/i)).toBeVisible({ timeout: 15000 });
  
    // 4. Clica no botão "Nova Premissa"
    await page.getByRole('button', { name: /nova premissa/i }).click();
  
    // 5. Preenche o formulário
    // Nome
    await page.getByLabel(/nome/i).fill('Receita Robot Final');
    
    // Categoria (Select)
    await page.click('button[role="combobox"]'); 
    await page.getByRole('option', { name: /receita/i }).first().click(); 
  
    // Valor
    await page.getByLabel(/valor/i).fill('1000');
    
    // Salva
    await page.getByRole('button', { name: /salvar|criar/i }).click();
  
    // 6. VALIDAÇÃO FINAL
    // Espera o modal fechar e o valor aparecer
    await expect(page.getByText('Receita Robot Final')).toBeVisible();
    await expect(page.locator('body')).toContainText('1.000');
    
    console.log('Teste concluído com sucesso!');
    await page.waitForTimeout(3000);
  });