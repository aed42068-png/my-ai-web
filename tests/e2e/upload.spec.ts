import { expect, test } from '@playwright/test';
import { join } from 'node:path';
import { expectToast, gotoHome, uniqueName, writeTinyPng } from './helpers';

test('upload flow: add account cover via UI and verify asset URL is readable', async ({ page }, testInfo) => {
  const accountName = uniqueName('上传账号');
  const imagePath = writeTinyPng(join(testInfo.outputDir, 'e2e-account-cover.png'));

  await gotoHome(page);

  const signResponsePromise = page.waitForResponse((response) =>
    response.url().includes('/api/uploads/sign') && response.request().method() === 'POST'
  );
  const completeResponsePromise = page.waitForResponse((response) =>
    response.url().includes('/api/uploads/complete') && response.request().method() === 'POST'
  );

  await page.getByTestId('home-add-account').click();
  await page.getByTestId('account-editor-name-input').fill(accountName);
  await page.getByTestId('account-editor-file-input').setInputFiles(imagePath);
  await page.getByTestId('account-editor-submit').click();

  const signResponse = await signResponsePromise;
  expect(signResponse.ok()).toBeTruthy();

  const completeResponse = await completeResponsePromise;
  const completePayload = completeResponse.ok()
    ? ((await completeResponse.json()) as { asset: { url: string; mimeType: string } })
    : await completeResponse.text();
  expect(completeResponse.ok(), String(completePayload)).toBeTruthy();
  const completeJson = completePayload as { asset: { url: string; mimeType: string } };

  await expectToast(page, '账号已新增');
  await expect(page.getByTestId('home-active-account-name')).toHaveText(accountName);

  const assetResponse = await page.request.get(completeJson.asset.url);
  expect(assetResponse.ok()).toBeTruthy();
  expect(assetResponse.headers()['content-type']).toContain('image/png');
});
