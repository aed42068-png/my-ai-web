import { expect, Page } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

const tinyPngBase64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO7+zFsAAAAASUVORK5CYII=';

export function uniqueName(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export async function expectToast(page: Page, text: string) {
  await expect(page.getByText(text)).toBeVisible();
}

export function writeTinyPng(targetPath: string): string {
  mkdirSync(dirname(targetPath), { recursive: true });
  writeFileSync(targetPath, Buffer.from(tinyPngBase64, 'base64'));
  return targetPath;
}

export async function gotoHome(page: Page) {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: '账号与任务管理' })).toBeVisible();
}
