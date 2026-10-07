import { test, expect } from '@playwright/test';

const UNIQUE = Date.now();
const EMAIL = `e2e_${UNIQUE}@test.com`;
const PASSWORD = 'password123';

test.describe('Kanban: полный пользовательский сценарий', () => {
  test('регистрация → вход → проект → доска → карточка → move', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/\/login/);

    await page.click('text=Зарегистрироваться');
    await expect(page).toHaveURL(/\/register/);

    await page.fill('input[placeholder="Имя"]', 'E2E User');
    await page.fill('input[placeholder="Email"]', EMAIL);
    await page.fill('input[placeholder="Пароль (минимум 8 символов)"]', PASSWORD);
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL(/\/login/);
    await page.fill('input[placeholder="Email"]', EMAIL);
    await page.fill('input[placeholder="Пароль"]', PASSWORD);
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL(/\/projects/);
    await expect(page.locator('h2')).toHaveText('Мои проекты');

    await page.click('text=+ Новый проект');
    await page.fill('input[placeholder="Например: Разработка сайта"]', 'E2E Project');
    await page.click('.modal-footer button:has-text("Создать")');
    await expect(page.locator('.project-card')).toHaveCount(1);
    await expect(page.locator('.project-card h3')).toHaveText('E2E Project');

    await page.click('text=+ Добавить доску');
    await page.fill('input[placeholder="Например: Спринт 1"]', 'E2E Board');
    await page.click('.modal-footer button:has-text("Создать")');

    await expect(page).toHaveURL(/\/board\//);
    await expect(page.locator('h1')).toHaveText('E2E Board');
    await expect(page.locator('.column')).toHaveCount(3);
    await expect(page.locator('.column').nth(0).locator('h3')).toHaveText('К выполнению');
    await expect(page.locator('.column').nth(1).locator('h3')).toHaveText('В работе');
    await expect(page.locator('.column').nth(2).locator('h3')).toHaveText('Готово');

    await page.locator('.column').nth(0).locator('button:has-text("+ Добавить карточку")').click();
    await page.fill('input[placeholder="Что нужно сделать?"]', 'E2E Task 1');
    await page.selectOption('select', 'high');
    await page.click('.modal-footer button:has-text("Создать")');

    await expect(page.locator('.column').nth(0).locator('.card')).toHaveCount(1);
    await expect(page.locator('.column').nth(0).locator('.card-title')).toHaveText('E2E Task 1');
    await expect(page.locator('.column').nth(0).locator('.priority-badge')).toHaveText('Высокий');

    await page.reload();
    await expect(page.locator('.column').nth(0).locator('.card')).toHaveCount(1);
    await expect(page.locator('.column').nth(0).locator('.card-title')).toHaveText('E2E Task 1');

    await page.click('text=← К проектам');
    await expect(page).toHaveURL(/\/projects/);
  });

  test('защита: без токена редиректит на /login', async ({ page }) => {
    await page.goto('/projects');
    await expect(page).toHaveURL(/\/login/);
  });

  test('валидация: регистрация с коротким паролем', async ({ page }) => {
    await page.goto('/register');
    await page.fill('input[placeholder="Email"]', `short_${Date.now()}@test.com`);
    await page.fill('input[placeholder="Пароль (минимум 8 символов)"]', '123');

    const passwordInput = page.locator('input[placeholder="Пароль (минимум 8 символов)"]');
    const isValid = await passwordInput.evaluate((el: HTMLInputElement) => el.checkValidity());
    expect(isValid).toBe(false);
  });
});