import { expect } from '@playwright/test';

export async function openEnglishApp(page) {
  await page.addInitScript(() => {
    localStorage.setItem('expenseSplitterLanguage', 'en');
    localStorage.setItem('expenseSplitterDarkMode', 'false');
  });
  await page.goto('/');
}

export async function addMembers(page, names = ['Alice', 'Bob', 'Charlie']) {
  for (const name of names) {
    await page.getByLabel('Member Name:', { exact: true }).fill(name);
    await page.getByRole('button', { name: 'Add Member', exact: true }).click();
  }
  await page.getByRole('button', { name: 'Next to Expenses', exact: true }).click();
}

export async function addExpense(
  page,
  amount = '100',
  description = 'Group dinner',
  payer = 'Alice',
) {
  await page.getByLabel('Amount (in EGP):', { exact: true }).fill(amount);
  await page.getByRole('combobox', { name: 'Who paid this expense:', exact: true }).click();
  await page.getByRole('option', { name: payer, exact: true }).click();
  await page.getByLabel('Expense description (optional):', { exact: true }).fill(description);
  await page.getByRole('button', { name: 'Add Expense', exact: true }).click();
}

export async function viewResults(page) {
  await page.getByRole('button', { name: 'Next to Results', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Split Results', exact: true })).toBeVisible();
}

export async function openHistory(page) {
  await page
    .getByRole('navigation')
    .getByRole('link', { name: /Split History/ })
    .click();
}

export async function settleAnimations(page) {
  await page.evaluate(() =>
    Promise.all(document.getAnimations().map((animation) => animation.finished.catch(() => {}))),
  );
}
