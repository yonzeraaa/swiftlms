import { test, expect } from '@playwright/test'

test.describe('Login Flow (Example E2E)', () => {
  test('should display login page', async ({ page }) => {
    await page.goto('/')

    // Verificar se a página de login está visível
    await expect(page).toHaveTitle(/SwiftLMS|Login/)
  })

  test('should show error message with invalid credentials', async ({ page }) => {
    await page.goto('/login')

    // Preencher formulário com credenciais inválidas
    await page.fill('input[type="email"]', 'invalid@example.com')
    await page.fill('input[type="password"]', 'wrongpassword')

    // Submeter formulário
    await page.click('button[type="submit"]')

    // Verificar mensagem de erro
    // Nota: ajuste o seletor conforme a implementação real
    await expect(page.locator('text=/erro|invalid|inválid/i')).toBeVisible({ timeout: 5000 })
  })

  test.skip('should login successfully with valid credentials', async ({ page }) => {
    // SKIP: Requer credenciais válidas de teste
    await page.goto('/login')

    await page.fill('input[type="email"]', 'student@test.com')
    await page.fill('input[type="password"]', 'ValidPassword123')

    await page.click('button[type="submit"]')

    // Verificar redirecionamento para dashboard
    await expect(page).toHaveURL(/\/dashboard|\/courses/)
  })
})
