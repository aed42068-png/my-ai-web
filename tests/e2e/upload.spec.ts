import { expect, test, type APIRequestContext, type Page } from '@playwright/test';
import { join } from 'node:path';
import { expectToast, gotoHome, uniqueName, writeTinyPng } from './helpers';

test('upload flow: add account cover via UI and verify asset URL is readable', async ({ page, request }, testInfo) => {
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
  await expect(page.getByTestId('account-editor-cover-preview')).toBeVisible();
  await page.getByTestId('account-editor-confirm-cover').click();
  await page.getByTestId('account-editor-submit').scrollIntoViewIfNeeded();
  await page.getByTestId('account-editor-submit').click();
  await expect(page.getByTestId('account-editor-submit')).toContainText(/上传封面中|保存账号中/);
  await expect(page.getByTestId('account-editor-saving-hint')).toBeVisible();

  const signResponse = await signResponsePromise;
  expect(signResponse.ok()).toBeTruthy();

  const completeResponse = await completeResponsePromise;
  const completePayload = completeResponse.ok()
    ? ((await completeResponse.json()) as { asset: { url: string; mimeType: string } })
    : await completeResponse.text();
  expect(completeResponse.ok(), String(completePayload)).toBeTruthy();
  const completeJson = completePayload as { asset: { url: string; mimeType: string } };

  await expectToast(page, '上传成功');
  await expect(page.getByTestId('home-active-account-name')).toHaveText(accountName);

  const assetResponse = await waitForReadableAsset(request, page, completeJson.asset.url);
  expect(assetResponse.ok()).toBeTruthy();
  expect(assetResponse.headers()['content-type']).toContain('image/png');
});

async function waitForReadableAsset(request: APIRequestContext, page: Page, url: string) {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < 4; attempt += 1) {
    try {
      const response = await request.get(url, {
        failOnStatusCode: false,
        timeout: 5000,
      });

      if (response.ok() && response.headers()['content-type']?.includes('image/png')) {
        return response;
      }

      lastError = new Error(`Asset not ready yet (status ${response.status()})`);
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Asset request failed');
    }

    await page.waitForTimeout(400 * (attempt + 1));
  }

  throw lastError ?? new Error('Asset URL did not become readable in time');
}
