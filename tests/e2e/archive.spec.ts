import { expect, test } from '@playwright/test';
import { expectToast, gotoHome, uniqueName } from './helpers';

test('archive flow: search, create task, edit task, delete task, persist display settings', async ({ page }) => {
  const taskName = uniqueName('归档任务');
  const editedTaskName = `${taskName}-已改`;
  const editedLocation = '归档测试地点';

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
  await page.getByTestId('archive-task-location-input').fill('归档地点');
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
