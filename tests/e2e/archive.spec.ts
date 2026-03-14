import { expect, test } from '@playwright/test';
import { expectToast, gotoHome, uniqueName } from './helpers';

test('archive flow: search, create task, edit task, delete task, persist display settings', async ({ page }) => {
  const taskName = uniqueName('归档任务');
  const editedTaskName = `${taskName}-已改`;
  const editedLocation = '归档测试备注';

  await gotoHome(page);
  await page.getByTestId('tab-archive').click();
  await expect(page.getByRole('button', { name: '返回' })).toBeVisible();

  await page.getByTestId('archive-toggle-search').click();
  await page.getByTestId('archive-search-input').fill('咖啡制作流程');
  await expect(page.getByText('晨间日常：咖啡制作流程')).toBeVisible();
  await page.getByTestId('archive-search-input').fill('');

  await page.getByTestId('archive-open-task-modal').click();
  await expect(page.getByTestId('archive-task-modal')).toBeVisible();
  await page.getByTestId('archive-task-title-input').fill(taskName);
  await page.getByTestId('archive-task-location-input').fill('归档备注');
  await page.getByTestId('archive-task-submit').click();
  await expectToast(page, '任务已创建');

  await page.getByTestId('archive-search-input').fill(taskName);
  await expect(page.getByText(taskName)).toBeVisible();

  await page.getByTestId('archive-task-card').filter({ hasText: taskName }).getByTestId('archive-task-edit').click();
  await page.getByTestId('archive-task-title-input').fill(editedTaskName);
  await page.getByTestId('archive-task-location-input').fill(editedLocation);
  await page.getByTestId('archive-task-submit').click();
  await expectToast(page, '任务已更新');
  await page.getByTestId('archive-search-input').fill(editedTaskName);
  await expect(page.getByText(editedTaskName)).toBeVisible();
  await expect(page.getByText(editedLocation)).toBeVisible();

  await page.getByTestId('archive-open-color-settings').click();
  await expect(page.getByTestId('archive-color-modal')).toBeVisible();
  await page.getByTestId('archive-color-toggle-published').click();
  await page.getByTestId('archive-color-submit').click();
  await expectToast(page, '归档显示设置已保存');

  await page.reload();
  await page.getByTestId('tab-archive').click();
  await page.getByTestId('archive-open-color-settings').click();
  await expect(page.getByTestId('archive-color-toggle-published')).toHaveAttribute('aria-checked', 'false');
  await page.getByTestId('archive-color-submit').click();

  await page.getByTestId('archive-toggle-search').click();
  await page.getByTestId('archive-search-input').fill(editedTaskName);
  await page.getByTestId('archive-task-card').filter({ hasText: editedTaskName }).getByTestId('archive-task-delete').click();
  await expectToast(page, '任务已删除');
  await expect(page.getByText(editedTaskName)).toHaveCount(0);
});

test('archive flow: explicit sort mode reorders same-status tasks and persists after reload', async ({ page }) => {
  const firstTaskName = uniqueName('归档排序A');
  const secondTaskName = uniqueName('归档排序B');

  await gotoHome(page);
  await page.getByTestId('tab-archive').click();
  await expect(page.getByRole('button', { name: '返回' })).toBeVisible();

  await page.getByTestId('archive-open-task-modal').click();
  await page.getByTestId('archive-task-title-input').fill(firstTaskName);
  await page.getByTestId('archive-task-location-input').fill('归档排序备注');
  await page.getByTestId('archive-task-submit').click();
  await expectToast(page, '任务已创建');

  await page.getByTestId('archive-open-task-modal').click();
  await page.getByTestId('archive-task-title-input').fill(secondTaskName);
  await page.getByTestId('archive-task-location-input').fill('归档排序备注');
  await page.getByTestId('archive-task-submit').click();
  await expectToast(page, '任务已创建');

  await page.getByTestId('archive-task-sort-toggle').click();
  await expect(page.getByTestId('archive-task-sort-mode')).toBeVisible();

  const rows = page.getByTestId('archive-sort-task-row');
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
    throw new Error('Unable to resolve archive sort row positions');
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

  await page.getByTestId('archive-task-sort-toggle').click();
  await expect(page.getByTestId('archive-task-sort-mode')).toHaveCount(0);

  await page.reload();
  await page.getByTestId('tab-archive').click();
  await page.getByTestId('archive-task-sort-toggle').click();
  await expect(page.getByTestId('archive-task-sort-mode')).toBeVisible();

  const orderAfterReload = await page.getByTestId('archive-sort-task-row').allTextContents();
  expect(orderAfterReload.findIndex((text) => text.includes(secondTaskName))).toBeLessThan(
    orderAfterReload.findIndex((text) => text.includes(firstTaskName))
  );
});
