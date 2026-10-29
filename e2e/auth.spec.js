import { randomUUID } from 'node:crypto';
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import {
  openEnglishApp,
  addMembers,
  addExpense,
  viewResults,
  openHistory,
  settleAnimations,
} from './helpers';

test.beforeEach(async ({ page }) => {
  await openEnglishApp(page);
});

test('an unavailable API shows a service error and preserves registration inputs', async ({
  page,
}) => {
  await page.goto('/#/register');
  await page.getByLabel('Full name', { exact: true }).fill('Service Test');
  await page.getByLabel('Email address', { exact: true }).fill('service-test@example.test');
  await page.getByLabel('Password', { exact: true }).fill('a temporary test passphrase');
  await page.getByLabel('Confirm password', { exact: true }).fill('a temporary test passphrase');
  await page.route('**/api/auth/register', (route) =>
    route.fulfill({ status: 500, contentType: 'text/plain', body: '' }),
  );
  await page.getByRole('button', { name: 'Create account', exact: true }).click();
  await expect(page.getByRole('alert')).toHaveText(
    'The account service is currently unavailable. Please try again shortly.',
  );
  await expect(page.getByLabel('Email address', { exact: true })).toHaveValue(
    'service-test@example.test',
  );
  await expect(page.getByRole('button', { name: 'Create account', exact: true })).toBeEnabled();
});

async function createAccount(page, { importGuest = false } = {}) {
  const email = `${randomUUID()}@example.test`;
  await page.goto('/#/register');
  await page.getByLabel('Full name', { exact: true }).fill('Alex Example');
  await page.getByLabel('Email address', { exact: true }).fill(email);
  await page.getByLabel('Password', { exact: true }).fill('a unique browser passphrase');
  await page.getByLabel('Confirm password', { exact: true }).fill('a unique browser passphrase');
  if (importGuest) await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: 'Create account', exact: true }).click();
  await expect(page.getByText('Alex Example · Cloud history', { exact: true })).toBeVisible();
  return email;
}

test('optional account imports guest data with consent, syncs across devices, and deletes cloud records', async ({
  page,
  browser,
}) => {
  await addMembers(page, ['Alex', 'Sam']);
  await addExpense(page, '100', 'Group dinner', 'Alex');
  await viewResults(page);
  const email = await createAccount(page, { importGuest: true });
  await expect(page.getByRole('link', { name: 'View Details', exact: true })).toHaveCount(1);
  const access = (await page.context().cookies()).find((cookie) => cookie.name === 'access_token');
  await page.context().addCookies([{ ...access, value: 'expired-access-token' }]);
  await page.reload();
  await expect(page.getByText('Alex Example · Cloud history', { exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: 'View Details', exact: true })).toHaveCount(1);
  expect(
    await page.evaluate(() => Object.keys(localStorage).some((key) => /token|password/i.test(key))),
  ).toBe(false);

  const second = await browser.newContext();
  const other = await second.newPage();
  try {
    await openEnglishApp(other);
    await other.goto('/#/login');
    await other.getByLabel('Email address', { exact: true }).fill(email);
    await other.getByLabel('Password', { exact: true }).fill('a unique browser passphrase');
    await other.getByRole('button', { name: 'Sign in', exact: true }).click();
    await expect(other.getByRole('link', { name: 'View Details', exact: true })).toHaveCount(1);
    await other.getByRole('link', { name: 'View Details', exact: true }).click();
    await expect(other.getByTestId('total-expenses')).toHaveText('100.00 EGP');
    await other.getByRole('button', { name: 'Delete Split', exact: true }).click();
    await other
      .getByRole('alertdialog')
      .getByRole('button', { name: 'Delete Split', exact: true })
      .click();
    await expect(other.getByText(/No saved splits yet/)).toBeVisible();

    await other.getByRole('button', { name: 'Sign out everywhere', exact: true }).click();
    await page.reload();
    await expect(page.getByRole('link', { name: 'Sign in', exact: true })).toBeVisible();
    await openHistory(page);
    await expect(page.getByRole('link', { name: 'View Details', exact: true })).toHaveCount(1);
  } finally {
    await second.close();
  }
});

test('account starts clean without consent and saves new splits to cloud', async ({ page }) => {
  await addMembers(page, ['Guest One', 'Guest Two']);
  await addExpense(page, '100', 'Group dinner', 'Guest One');
  await viewResults(page);
  await createAccount(page);
  await expect(page.getByText(/No saved splits yet/)).toBeVisible();
  await page
    .getByRole('navigation')
    .getByRole('link', { name: 'Split Expenses', exact: true })
    .click();
  await expect(page.getByText('Guest One', { exact: true })).toHaveCount(0);
  await addMembers(page, ['Cloud One', 'Cloud Two']);
  await addExpense(page, '40', 'Cloud meal', 'Cloud One');
  await viewResults(page);
  await expect(page.getByRole('link', { name: 'View Saved Split', exact: true })).toBeVisible();
  await openHistory(page);
  await expect(page.getByRole('link', { name: 'View Details', exact: true })).toHaveCount(1);
  await page.getByRole('button', { name: 'Clear All History', exact: true }).click();
  await page
    .getByRole('alertdialog')
    .getByRole('button', { name: 'Clear All History', exact: true })
    .click();
  await expect(page.getByText(/No saved splits yet/)).toBeVisible();
  const tab = await page.context().newPage();
  await tab.goto('/#/history');
  await expect(tab.getByText('Alex Example · Cloud history', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Sign out', exact: true }).click();
  await expect(tab.getByRole('link', { name: 'Sign in', exact: true })).toBeVisible();
  await tab.close();
  await expect(page.getByTestId('total-expenses')).toHaveText('100.00 EGP');
});

test('auth forms validate and remain accessible in both directions and themes', async ({
  page,
}) => {
  await page.goto('/#/register');
  await page.getByRole('button', { name: 'Create account', exact: true }).click();
  await expect(page.getByText('Enter a valid email address.', { exact: true })).toBeVisible();
  for (const language of ['en', 'ar']) {
    if (language === 'ar') {
      await page.getByRole('button', { name: 'Language', exact: true }).click();
      await page.getByRole('menuitemradio', { name: 'AR – عربي', exact: true }).click();
    }
    for (const route of ['register', 'login']) {
      await page.goto(`/#/${route}`);
      await settleAnimations(page);
      const result = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
        .analyze();
      expect(result.violations).toEqual([]);
      const size = await page.evaluate(() => ({
        content: document.documentElement.scrollWidth,
        client: document.documentElement.clientWidth,
      }));
      expect(size.content).toBeLessThanOrEqual(size.client);
    }
    await page
      .getByRole('button', { name: language === 'en' ? 'Theme' : 'المظهر', exact: true })
      .click();
    await page
      .getByRole('menuitemradio', { name: language === 'en' ? 'Dark' : 'غامق', exact: true })
      .click();
    await settleAnimations(page);
    expect(
      (await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze())
        .violations,
    ).toEqual([]);
  }
});
