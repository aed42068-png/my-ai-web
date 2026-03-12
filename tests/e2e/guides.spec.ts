import { expect, test } from '@playwright/test';
import { gotoHome } from './helpers';

test('page guides: dismiss state persists and guides can be reopened across tabs', async ({ page }) => {
  await gotoHome(page);

  const homeGuide = page.getByTestId('home-page-guide');
  await expect(homeGuide).toBeVisible();
  await homeGuide.getByRole('button', { name: '我知道了' }).click();
  await expect(page.getByTestId('home-page-guide-trigger')).toBeVisible();

  await page.reload();
  await expect(page.getByTestId('home-page-guide-trigger')).toBeVisible();
  await page.getByTestId('home-page-guide-trigger').click();
  await expect(homeGuide).toBeVisible();

  await page.getByTestId('tab-archive').click();
  const archiveGuide = page.getByTestId('archive-page-guide');
  await expect(archiveGuide).toBeVisible();
  await archiveGuide.getByRole('button', { name: '我知道了' }).click();
  await expect(page.getByTestId('archive-page-guide-trigger')).toBeVisible();
  await page.getByTestId('tab-home').click();
  await page.getByTestId('tab-archive').click();
  await expect(page.getByTestId('archive-page-guide-trigger')).toBeVisible();
  await page.getByTestId('archive-page-guide-trigger').click();
  await expect(archiveGuide).toBeVisible();

  await page.getByTestId('tab-ads').click();
  const adsGuide = page.getByTestId('ads-page-guide');
  await expect(adsGuide).toBeVisible();
  await adsGuide.getByRole('button', { name: '我知道了' }).click();
  await expect(page.getByTestId('ads-page-guide-trigger')).toBeVisible();
  await page.getByTestId('tab-home').click();
  await page.getByTestId('tab-ads').click();
  await expect(page.getByTestId('ads-page-guide-trigger')).toBeVisible();
  await page.getByTestId('ads-page-guide-trigger').click();
  await expect(adsGuide).toBeVisible();
});
