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

  await page.getByText(taskName).click();
  await expectToast(page, `已完成：${taskName}`);
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
});
