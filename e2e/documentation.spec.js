import { test } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import {
  addExpense,
  addMembers,
  openEnglishApp,
  openHistory,
  settleAnimations,
  viewResults,
} from './helpers';

test('capture the live English interface for the README', async ({ page }) => {
  await openEnglishApp(page);
  await addMembers(page);
  await addExpense(page, '360', 'Dinner together', 'Alice');
  await addExpense(page, '180', 'Travel', 'Bob');
  await viewResults(page);
  const closeToast = page.getByRole('button', { name: 'Close notification', exact: true });
  if (await closeToast.isVisible()) await closeToast.click();
  await mkdir('docs/screenshots', { recursive: true });
  await page.setViewportSize({ width: 1440, height: 1100 });
  await settleAnimations(page);
  await page.screenshot({ path: 'docs/screenshots/desktop.png', fullPage: true });
  await openHistory(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await settleAnimations(page);
  await page.screenshot({ path: 'docs/screenshots/mobile.png', fullPage: true });
  await page.goto('/#/login');
  await page.setViewportSize({ width: 1440, height: 1000 });
  await settleAnimations(page);
  await page.screenshot({ path: 'docs/screenshots/login.png', fullPage: true });
  await page.goto('/#/register');
  await page.setViewportSize({ width: 390, height: 844 });
  await settleAnimations(page);
  await page.screenshot({ path: 'docs/screenshots/register-mobile.png', fullPage: true });
});
