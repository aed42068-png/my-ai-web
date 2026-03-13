import { expect, test } from '@playwright/test';
import { expectToast, gotoHome, uniqueName } from './helpers';

test('home flow: switch account, create account, edit account, create task, complete task, save review', async ({
  page,
}) => {
  const accountName = uniqueName('E2E账号');
  const updatedAccountName = `${accountName}-已改`;
  const taskName = uniqueName('E2E任务');
  const updatedLocation = 'E2E 工位';
  const reviewText = uniqueName('E2E复盘');

  await gotoHome(page);

  await page.getByRole('button', { name: /AI教程号/ }).first().click();
  await expect(page.getByTestId('home-active-account-name')).toHaveText('AI教程号');

  await page.getByTestId('home-add-account').click();
  await expect(page.getByTestId('account-editor-modal')).toBeVisible();
  await page.getByTestId('account-editor-name-input').fill(accountName);
  await page.getByTestId('account-editor-submit').click();
  await expectToast(page, '账号已新增');
  await expect(page.getByTestId('home-active-account-name')).toHaveText(accountName);

  await page.getByTestId('home-edit-active-account').click();
  await page.getByTestId('account-editor-name-input').fill(updatedAccountName);
  await page.getByTestId('account-editor-submit').click();
  await expectToast(page, '账号已更新');
  await expect(page.getByTestId('home-active-account-name')).toHaveText(updatedAccountName);

  await page.getByTestId('home-create-task-todo').click();
  await expect(page.getByTestId('home-task-modal')).toBeVisible();
  await page.getByTestId('home-task-title-input').fill(taskName);
  await page.getByTestId('home-task-location-input').fill('初始地点');
  await page.getByTestId('home-task-submit').click();
  await expectToast(page, '任务已创建');
  await expect(page.getByText(taskName)).toBeVisible();

  await page.getByTestId('home-status-chip-todo').click();
  await page
    .getByTestId('home-status-task-card')
    .filter({ hasText: taskName })
    .getByTestId('home-status-task-edit')
    .click();
  await page.getByTestId('home-task-location-input').fill(updatedLocation);
  await page.getByTestId('home-task-submit').click();
  await expectToast(page, '任务已更新');
  await expect(page.getByText(updatedLocation)).toBeVisible();

  await page
    .getByTestId('home-task-row')
    .filter({ hasText: taskName })
    .getByTestId('home-task-status-progress')
    .click();
  await expect(page.getByTestId('home-status-chip-shot')).toContainText('1');

  await page.getByTestId('home-status-chip-shot').click();
  await page
    .getByTestId('home-status-task-card')
    .filter({ hasText: taskName })
    .getByTestId('home-status-task-open-review')
    .click();
  await page.getByTestId('home-review-hit-爆款').click();
  await page.getByTestId('home-review-textarea').fill(reviewText);
  await page.getByTestId('home-review-submit').click();
  await expectToast(page, '复盘记录已保存');

  await page.getByTestId('home-status-chip-shot').click();
  await expect(page.getByText(reviewText)).toBeVisible();
  await page.getByTestId('home-status-view-close').click();

  await page.getByTestId('home-account-overview-open').click();
  await expect(page.getByTestId('home-account-overview')).toBeVisible();
  await page.getByTestId('home-account-overview-item').filter({ hasText: 'AI教程号' }).click();
  await page.getByTestId('home-account-overview-submit').click();
  await expect(page.getByTestId('home-active-account-name')).toHaveText('AI教程号');
});

test('home flow: account tabs and card carousel stay in sync', async ({ page }) => {
  await gotoHome(page);

  const accountTabs = page.getByTestId('home-account-tab');
  const accountNames = (await accountTabs.allTextContents()).map((text) => text.trim()).filter(Boolean);
  expect(accountNames.length).toBeGreaterThanOrEqual(3);

  const secondAccountName = accountNames[1];
  const thirdAccountName = accountNames[2];

  await accountTabs.nth(1).click();
  await expect(page.getByTestId('home-active-account-name')).toHaveText(secondAccountName);
  await expect(page.locator('[data-testid="home-account-card"][data-active="true"]').first()).toContainText(secondAccountName);

  await page.getByTestId('home-account-card').nth(2).evaluate((card) => {
    const scroller = card.parentElement;
    if (!(scroller instanceof HTMLElement) || !(card instanceof HTMLElement)) {
      return;
    }

    const targetLeft = card.offsetLeft - (scroller.clientWidth - card.offsetWidth) / 2;
    scroller.scrollTo({ left: targetLeft, behavior: 'instant' });
  });

  await page.waitForTimeout(250);
  await expect(page.getByTestId('home-active-account-name')).toHaveText(thirdAccountName);
  await expect(accountTabs.nth(2)).toHaveClass(/border-slate-900/);
  await expect(page.locator('[data-testid="home-account-card"][data-active="true"]').first()).toContainText(thirdAccountName);
});

test('home flow: explicit sort mode reorders tasks for the active account', async ({ page }) => {
  const accountName = uniqueName('排序账号');
  const firstTaskName = uniqueName('排序任务A');
  const secondTaskName = uniqueName('排序任务B');

  await gotoHome(page);

  await page.getByTestId('home-add-account').click();
  await page.getByTestId('account-editor-name-input').fill(accountName);
  await page.getByTestId('account-editor-submit').click();
  await expectToast(page, '账号已新增');
  await expect(page.getByTestId('home-active-account-name')).toHaveText(accountName);

  await page.getByTestId('home-create-task-todo').click();
  await page.getByTestId('home-task-title-input').fill(firstTaskName);
  await page.getByTestId('home-task-location-input').fill('排序区');
  await page.getByTestId('home-task-submit').click();
  await expectToast(page, '任务已创建');

  await page.getByTestId('home-create-task-todo').click();
  await page.getByTestId('home-task-title-input').fill(secondTaskName);
  await page.getByTestId('home-task-location-input').fill('排序区');
  await page.getByTestId('home-task-submit').click();
  await expectToast(page, '任务已创建');

  await page.getByTestId('home-task-sort-toggle').click();
  await expect(page.getByTestId('home-task-sort-mode')).toBeVisible();

  const rows = page.getByTestId('home-sort-task-row');
  const orderBefore = await rows.allTextContents();
  expect(orderBefore.findIndex((text) => text.includes(firstTaskName))).toBeLessThan(
    orderBefore.findIndex((text) => text.includes(secondTaskName))
  );

  const source = rows.filter({ hasText: secondTaskName }).first();
  const target = rows.filter({ hasText: firstTaskName }).first();
  await source.scrollIntoViewIfNeeded();
  await target.scrollIntoViewIfNeeded();
  const sourceBox = await source.boundingBox();
  const targetBox = await target.boundingBox();

  if (!sourceBox || !targetBox) {
    throw new Error('Unable to resolve sort row positions');
  }

  await page.mouse.move(sourceBox.x + sourceBox.width / 2, sourceBox.y + sourceBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(targetBox.x + targetBox.width / 2, targetBox.y - sourceBox.height / 2, { steps: 16 });
  await page.mouse.up();
  await page.waitForTimeout(400);

  const orderAfter = await rows.allTextContents();
  expect(orderAfter.findIndex((text) => text.includes(secondTaskName))).toBeLessThan(
    orderAfter.findIndex((text) => text.includes(firstTaskName))
  );

  await page.getByTestId('home-task-sort-toggle').click();
  await expect(page.getByTestId('home-task-sort-mode')).toHaveCount(0);

  await page.reload();
  await page.getByTestId('home-account-overview-open').click();
  await page.getByTestId('home-account-overview-item').filter({ hasText: accountName }).click();
  await page.getByTestId('home-account-overview-submit').click();
  await expect(page.getByTestId('home-active-account-name')).toHaveText(accountName);
  await page.getByTestId('home-task-sort-toggle').click();
  await expect(page.getByTestId('home-task-sort-mode')).toBeVisible();
  const orderAfterReload = await page.getByTestId('home-sort-task-row').allTextContents();
  expect(orderAfterReload.findIndex((text) => text.includes(secondTaskName))).toBeLessThan(
    orderAfterReload.findIndex((text) => text.includes(firstTaskName))
  );
});
