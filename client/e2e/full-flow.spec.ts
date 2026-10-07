import { test, expect } from '@playwright/test';

const UNIQUE = Date.now();
const EMAIL = `e2e_${UNIQUE}@test.com`;
const PASSWORD = 'password123';

test.describe('Kanban: полный пользовательский сценарий', () => {
  test('регистрация → вход → проект → доска → карточка → move', async ({ page }) => {
    // 1. Открываем приложение
    await page.goto('/');
    await expect(page).toHaveURL(/\/login/);

    // 2. Регистрация
    await page.click('text=Зарегистрироваться');
    await expect(page).toHaveURL(/\/register/);

    await page.fill('input[placeholder="Имя"]', 'E2E User');
    await page.fill('input[placeholder="Email"]', EMAIL);
    await page.fill('input[placeholder="Пароль (минимум 8 символов)"]', PASSWORD);
    await page.click('button[type="submit"]');

    // 3. Вход после регистрации
    await expect(page).toHaveURL(/\/login/);
    await page.fill('input[placeholder="Email"]', EMAIL);
    await page.fill('input[placeholder="Пароль"]', PASSWORD);
    await page.click('button[type="submit"]');

    // 4. Страница проектов
    await expect(page).toHaveURL(/\/projects/);
    await expect(page.locator('h1')).toHaveText('Мои проекты');

    // 5. Создание проекта
    await page.fill('input[placeholder="Название нового проекта"]', 'E2E Project');
    await page.click('text=Создать проект');
    await expect(page.locator('.project-card')).toHaveCount(1);
    await expect(page.locator('.project-card h2')).toHaveText('E2E Project');

    // 6. Создание доски (через prompt — подменяем на "E2E Board")
    page.once('dialog', async (dialog) => {
      await dialog.accept('E2E Board');
    });
    await page.click('text=+ Доска');

    // 7. Открылась Kanban-доска
    await expect(page).toHaveURL(/\/board\//);
    await expect(page.locator('h1')).toHaveText('E2E Board');
    await expect(page.locator('.column')).toHaveCount(3);
    await expect(page.locator('.column').nth(0).locator('h3')).toHaveText('To Do');
    await expect(page.locator('.column').nth(1).locator('h3')).toHaveText('In Progress');
    await expect(page.locator('.column').nth(2).locator('h3')).toHaveText('Done');

    // 8. Создание карточки (два prompt — title и priority)
    const dialogs = ['E2E Task 1', 'high'];
    page.on('dialog', async (dialog) => {
      const value = dialogs.shift() ?? 'medium';
      await dialog.accept(value);
    });

    await page.locator('.column').nth(0).locator('button:has-text("+ Добавить карточку")').click();

    // 9. Проверяем, что карточка появилась в To Do
    await expect(page.locator('.column').nth(0).locator('.card')).toHaveCount(1);
    await expect(page.locator('.column').nth(0).locator('.card-title')).toHaveText('E2E Task 1');
    await expect(page.locator('.column').nth(0).locator('.card-priority')).toHaveText('high');

    // 10. Перезагружаем страницу — карточка должна сохраниться
    await page.reload();
    await expect(page.locator('.column').nth(0).locator('.card')).toHaveCount(1);
    await expect(page.locator('.column').nth(0).locator('.card-title')).toHaveText('E2E Task 1');

    // 11. Возвращаемся к проектам
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

    // HTML-валидация не даёт отправить (minLength=8)
    const submitBtn = page.locator('button[type="submit"]');
    const passwordInput = page.locator('input[placeholder="Пароль (минимум 8 символов)"]');

    const isValid = await passwordInput.evaluate((el: HTMLInputElement) => el.checkValidity());
    expect(isValid).toBe(false);
  });
});