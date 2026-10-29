import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import {
  addExpense,
  addMembers,
  openEnglishApp,
  openHistory,
  settleAnimations,
  viewResults,
} from './helpers';

test.beforeEach(async ({ page }) => {
  await openEnglishApp(page);
});

test('requires two members and restores unsaved form inputs after reload', async ({ page }) => {
  await page.getByRole('button', { name: 'Next to Expenses', exact: true }).click();
  await expect(
    page.getByText('Add at least two members to split expenses', { exact: true }),
  ).toBeVisible();
  await page.getByLabel('Member Name:', { exact: true }).fill('Alice');
  await page.getByRole('button', { name: 'Add Member', exact: true }).click();
  await page.getByRole('button', { name: 'Next to Expenses', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Add Group Members', exact: true })).toBeVisible();
  await addMembers(page, ['Bob']);
  await page.getByLabel('Amount (in EGP):', { exact: true }).fill('12.34');
  await page.getByLabel('Expense description (optional):', { exact: true }).fill('Still typing');
  await page.getByRole('combobox').click();
  await page.getByRole('option', { name: 'Bob', exact: true }).click();
  await page.reload();
  await expect(page.getByLabel('Amount (in EGP):', { exact: true })).toHaveValue('12.34');
  await expect(page.getByLabel('Expense description (optional):', { exact: true })).toHaveValue(
    'Still typing',
  );
  await expect(page.getByRole('combobox')).toHaveText('Bob');
});

test('validates an amount and edits the existing expense without adding a duplicate', async ({
  page,
}) => {
  await addMembers(page, ['Alice', 'Bob']);
  await page.getByLabel('Amount (in EGP):', { exact: true }).fill('1.001');
  await page.getByRole('button', { name: 'Add Expense', exact: true }).click();
  await expect(page.getByLabel('Amount (in EGP):', { exact: true })).toHaveAttribute(
    'aria-invalid',
    'true',
  );
  await addExpense(page);
  await page.getByRole('button', { name: 'Edit Expense: Group dinner', exact: true }).click();
  await page.getByLabel('Amount (in EGP):', { exact: true }).fill('150');
  await page.getByRole('combobox').click();
  await page.getByRole('option', { name: 'Bob', exact: true }).click();
  await page.reload();
  await expect(page.getByRole('button', { name: 'Save Changes', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Save Changes', exact: true }).click();
  const expenses = page.getByRole('list', { name: 'Recorded Expenses', exact: true });
  await expect(expenses.getByRole('listitem')).toHaveCount(1);
  await expect(expenses).toContainText('150.00 EGP');
  await expect(expenses).toContainText('Paid by: Bob');
  await viewResults(page);
  await expect(page.getByTestId('total-expenses')).toHaveText('150.00 EGP');
  await expect(page.getByText('Receives 75.00 EGP', { exact: true })).toBeVisible();
});

test('combobox supports typeahead, active-descendant focus, cancellation and Tab', async ({
  page,
}) => {
  await addMembers(page);
  const payer = page.getByRole('combobox');
  await payer.focus();
  await payer.press('Enter');
  await expect(payer).toBeFocused();
  await payer.press('End');
  const activeId = await payer.getAttribute('aria-activedescendant');
  await expect(page.locator(`[id="${activeId}"]`)).toHaveText('Charlie');
  await payer.press('Escape');
  await expect(payer).toHaveText('Alice');
  await payer.press('b');
  await payer.press('Enter');
  await expect(payer).toHaveText('Bob');
  await payer.press('Enter');
  await payer.press('Home');
  await payer.press('Tab');
  await expect(payer).toHaveText('Alice');
  await expect(payer).toHaveAttribute('aria-expanded', 'false');
  await expect(page.getByLabel('Expense description (optional):', { exact: true })).toBeFocused();
});

test('saved revisions stay independent and unchanged results do not duplicate history', async ({
  page,
}) => {
  await addMembers(page);
  await addExpense(page);
  await viewResults(page);
  await expect(page.getByText('Share: 33.34 EGP', { exact: true })).toBeVisible();
  const firstHref = await page
    .getByRole('link', { name: 'View Saved Split', exact: true })
    .getAttribute('href');
  await page.getByRole('button', { name: 'Back to Expenses', exact: true }).click();
  await viewResults(page);
  await expect(page.getByRole('link', { name: 'View Saved Split', exact: true })).toHaveAttribute(
    'href',
    firstHref,
  );
  await page.getByRole('button', { name: 'Back to Expenses', exact: true }).click();
  await addExpense(page, '50', 'Travel', 'Bob');
  await viewResults(page);
  await openHistory(page);
  await expect(page.getByRole('link', { name: 'View Details', exact: true })).toHaveCount(2);
  await page.locator(`a[href="${firstHref}"]`).click();
  await page.reload();
  await expect(page.getByTestId('total-expenses')).toHaveText('100.00 EGP');
  await expect(
    page.getByRole('list', { name: 'Recorded Expenses', exact: true }).getByRole('listitem'),
  ).toHaveCount(1);
  await expect(page.getByRole('button', { name: /Edit Expense/ })).toHaveCount(0);
});

test('deletes one record or all history with confirmation, and restores a deduplicated backup', async ({
  page,
}, testInfo) => {
  await addMembers(page);
  await addExpense(page);
  await viewResults(page);
  await page.getByRole('button', { name: 'Back to Expenses', exact: true }).click();
  await addExpense(page, '50', 'Travel', 'Bob');
  await viewResults(page);
  await openHistory(page);
  const oldCard = page
    .getByRole('list', { name: 'Split History', exact: true })
    .getByRole('listitem')
    .filter({ hasText: 'Total Expenses: 100.00 EGP' });
  await oldCard.getByRole('button', { name: /Delete split saved on/ }).click();
  const dialog = page.getByRole('alertdialog');
  await expect(dialog.getByRole('button', { name: 'Cancel', exact: true })).toBeFocused();
  await dialog.getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(page.getByRole('link', { name: 'View Details', exact: true })).toHaveCount(2);
  await oldCard.getByRole('button', { name: /Delete split saved on/ }).click();
  await dialog.getByRole('button', { name: 'Delete Split', exact: true }).click();
  await expect(page.getByRole('link', { name: 'View Details', exact: true })).toHaveCount(1);
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export JSON Backup', exact: true }).click();
  const download = await downloadPromise;
  const backupPath = testInfo.outputPath('backup.json');
  await download.saveAs(backupPath);
  await page.getByRole('button', { name: 'Clear All History', exact: true }).click();
  await dialog.getByRole('button', { name: 'Clear All History', exact: true }).click();
  await expect(page.getByRole('link', { name: 'View Details', exact: true })).toHaveCount(0);
  await page.reload();
  await page
    .getByRole('navigation')
    .getByRole('link', { name: 'Split Expenses', exact: true })
    .click();
  await expect(page.getByTestId('total-expenses')).toHaveText('150.00 EGP');
  await expect(page.getByRole('link', { name: 'View Saved Split', exact: true })).toHaveCount(0);
  await openHistory(page);
  await page.getByLabel('Backup file', { exact: true }).setInputFiles(backupPath);
  await expect(page.getByRole('link', { name: 'View Details', exact: true })).toHaveCount(1);
  await page.getByLabel('Backup file', { exact: true }).setInputFiles(backupPath);
  await expect(page.getByRole('link', { name: 'View Details', exact: true })).toHaveCount(1);
  await page.getByLabel('Backup file', { exact: true }).setInputFiles({
    name: 'invalid.json',
    mimeType: 'application/json',
    buffer: Buffer.from('invalid'),
  });
  await expect(page.getByText(/Could not import this file/)).toBeVisible();
  await expect(page.getByRole('link', { name: 'View Details', exact: true })).toHaveCount(1);
});

test('clearing a corrupt archive requires confirmation and recovers the history page', async ({
  page,
}) => {
  await page.evaluate(() => localStorage.setItem('expenseSplitterHistory', 'invalid'));
  await page.reload();
  await openHistory(page);
  await expect(
    page.getByText('Could not read the history saved in this browser.', { exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Clear All History', exact: true }).click();
  await page
    .getByRole('alertdialog')
    .getByRole('button', { name: 'Clear All History', exact: true })
    .click();
  await expect(page.getByText(/No saved splits yet/)).toBeVisible();
});

test('starting a new group requires confirmation and keeps saved history', async ({ page }) => {
  await addMembers(page, ['Alice', 'Bob']);
  await addExpense(page);
  await viewResults(page);
  await page.getByRole('button', { name: 'Start New Group', exact: true }).click();
  await page.getByRole('alertdialog').getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(page.getByTestId('total-expenses')).toHaveText('100.00 EGP');
  await page.getByRole('button', { name: 'Start New Group', exact: true }).click();
  await page
    .getByRole('alertdialog')
    .getByRole('button', { name: 'Start New Group', exact: true })
    .click();
  await expect(page.getByRole('heading', { name: 'Add Group Members', exact: true })).toBeVisible();
  await page.getByLabel('Member Name:', { exact: true }).fill('Unfinished name');
  await page.reload();
  await expect(page.getByLabel('Member Name:', { exact: true })).toHaveValue('Unfinished name');
  await openHistory(page);
  await expect(page.getByRole('link', { name: 'View Details', exact: true })).toHaveCount(1);
});

test('an unreadable draft is preserved until explicitly discarded', async ({ page }) => {
  await addMembers(page, ['Alice', 'Bob']);
  await addExpense(page);
  await viewResults(page);
  await page.evaluate(() => localStorage.setItem('expenseSplitterDraft', 'invalid draft'));
  await page.reload();
  await expect(page.getByText(/The saved draft could not be restored/)).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem('expenseSplitterDraft'))).toBe(
    'invalid draft',
  );
  await page.getByRole('button', { name: 'Start New Draft', exact: true }).click();
  await page
    .getByRole('alertdialog')
    .getByRole('button', { name: 'Start New Draft', exact: true })
    .click();
  await expect(page.getByText(/The saved draft could not be restored/)).toHaveCount(0);
  await openHistory(page);
  await expect(page.getByRole('link', { name: 'View Details', exact: true })).toHaveCount(1);
});

test('light and dark pages have no automated WCAG A/AA violations', async ({ page }) => {
  async function audit() {
    await settleAnimations(page);
    const result = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze();
    expect(result.violations).toEqual([]);
  }
  await audit();
  await addMembers(page);
  await addExpense(page);
  await audit();
  await viewResults(page);
  await audit();
  await openHistory(page);
  await page.getByRole('button', { name: 'Clear All History', exact: true }).click();
  await audit();
  await page.getByRole('alertdialog').getByRole('button', { name: 'Cancel', exact: true }).click();
  await page.getByRole('button', { name: 'Theme', exact: true }).click();
  await page.getByRole('menuitemradio', { name: 'Dark', exact: true }).click();
  await audit();
  await page
    .getByRole('navigation')
    .getByRole('link', { name: 'Split Expenses', exact: true })
    .click();
  await audit();
  await page.getByRole('button', { name: 'Back to Expenses', exact: true }).click();
  await audit();
  await page.getByRole('combobox').click();
  await audit();
  await page.getByRole('combobox').press('Escape');
  await openHistory(page);
  await page.getByRole('button', { name: 'Language', exact: true }).click();
  await page.getByRole('menuitemradio', { name: 'AR – عربي', exact: true }).click();
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  await audit();
  const size = await page.evaluate(() => ({
    client: document.documentElement.clientWidth,
    content: document.documentElement.scrollWidth,
  }));
  expect(size.content).toBeLessThanOrEqual(size.client);
});
