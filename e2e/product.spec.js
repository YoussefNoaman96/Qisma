import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { readFile } from 'node:fs/promises';
import {
  addMembers,
  addExpense,
  viewResults,
  openEnglishApp,
  openHistory,
  settleAnimations,
} from './helpers';

test.beforeEach(async ({ page }) => {
  await openEnglishApp(page);
});

test('downloads readable PDF files from results and history and copies a summary', async ({
  page,
  context,
}, testInfo) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await addMembers(page, ['Alice', 'Bob']);
  await addExpense(page);
  await viewResults(page);
  await page.getByRole('button', { name: 'Copy summary', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Summary copied', exact: true })).toBeVisible();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toContain(
    'Bob → Alice: 50.00 EGP',
  );
  async function downloadReport(name) {
    const pending = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Download PDF', exact: true }).click();
    const download = await pending;
    expect(download.suggestedFilename()).toMatch(/^qisma-report-.*\.pdf$/u);
    const path = testInfo.outputPath(name);
    await download.saveAs(path);
    const content = await readFile(path);
    expect(content.subarray(0, 5).toString()).toBe('%PDF-');
    expect(content.length).toBeGreaterThan(15000);
  }
  await downloadReport('current.pdf');
  await openHistory(page);
  await downloadReport('history.pdf');
});

test('unknown links have a useful 404 without losing saved splits, in both directions', async ({
  page,
}) => {
  await addMembers(page, ['Alice', 'Bob']);
  await addExpense(page);
  await viewResults(page);
  await page.goto('/#/nothing-here');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'This one didn’t make the split.',
  );
  await settleAnimations(page);
  expect(
    (await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze())
      .violations,
  ).toEqual([]);
  await page.getByRole('link', { name: 'Open my history', exact: true }).click();
  await expect(page.getByRole('link', { name: 'View Details', exact: true })).toHaveCount(1);
  await page.goto('/a/missing/page');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'This one didn’t make the split.',
  );
  await page.getByRole('button', { name: 'Language', exact: true }).click();
  await page.getByRole('menuitemradio', { name: 'AR – عربي', exact: true }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('الصفحة دي طلعت برّه القِسمة.');
  await settleAnimations(page);
  expect(
    (await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze())
      .violations,
  ).toEqual([]);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
    ),
  ).toBe(true);
});

test('accepts Arabic amounts and keeps a current payer after member removal', async ({ page }) => {
  await addMembers(page, ['Alice', 'Bob']);
  await page.getByRole('button', { name: 'Back to Members', exact: true }).click();
  await page.getByRole('button', { name: 'Remove Alice', exact: true }).click();
  await addMembers(page, ['Charlie']);
  await expect(page.getByRole('combobox')).toHaveText('Bob');
  await addExpense(page, '٥٠٫٢٥', 'قهوة', 'Bob');
  await viewResults(page);
  await expect(page.getByTestId('total-expenses')).toHaveText('50.25 EGP');
});

test('render failures show recovery without clearing the draft', async ({ page }) => {
  await page.getByLabel('Member Name:', { exact: true }).fill('Keep this draft');
  const draft = await page.evaluate(() => localStorage.getItem('expenseSplitterDraft'));
  await page.route('**/src/components/MembersStep.jsx*', (route) =>
    route.fulfill({
      contentType: 'application/javascript',
      body: 'export default function Broken(){throw new Error("Test render failure");}',
    }),
  );
  await page.reload();
  await expect(
    page.getByRole('heading', { name: 'Something got tangled.', exact: true }),
  ).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem('expenseSplitterDraft'))).toBe(draft);
  await page.unroute('**/src/components/MembersStep.jsx*');
  await page.getByRole('button', { name: 'Reload the page', exact: true }).click();
  await expect(page.getByLabel('Member Name:', { exact: true })).toHaveValue('Keep this draft');
});

test('reduced-motion preference removes entrance animation', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.reload();
  expect(
    await page.locator('main').evaluate((element) => getComputedStyle(element).animationName),
  ).toBe('none');
  await expect(page.locator('link[rel="icon"]')).toHaveAttribute('href', '/brand/qisma-mark.svg');
});
