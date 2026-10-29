import { chromium } from '@playwright/test';
import { readFile, writeFile } from 'node:fs/promises';

const browser = await chromium.launch({ channel: process.env.PLAYWRIGHT_CHANNEL || undefined });
try {
  const page = await browser.newPage();
  const svg = await readFile('public/brand/social-preview.svg', 'utf8');
  await page.setViewportSize({ width: 1200, height: 630 });
  await page.setContent(`<style>body{margin:0}</style>${svg}`);
  await page.screenshot({ path: 'public/brand/social-preview.png' });
  const mark = await readFile('public/brand/qisma-mark.svg', 'utf8');
  await page.setViewportSize({ width: 180, height: 180 });
  await page.setContent(`<style>body{margin:0}svg{width:180px;height:180px}</style>${mark}`);
  await page.screenshot({ path: 'public/brand/apple-touch-icon.png', omitBackground: true });
  await page.setViewportSize({ width: 32, height: 32 });
  await page.setContent(`<style>body{margin:0}svg{width:32px;height:32px}</style>${mark}`);
  const png = await page.screenshot({ omitBackground: true });
  const header = Buffer.alloc(22);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(1, 4);
  header[6] = 32;
  header[7] = 32;
  header.writeUInt16LE(1, 10);
  header.writeUInt16LE(32, 12);
  header.writeUInt32LE(png.length, 14);
  header.writeUInt32LE(22, 18);
  await writeFile('public/favicon.ico', Buffer.concat([header, png]));
  console.log('Qisma brand assets generated.');
} finally {
  await browser.close();
}
