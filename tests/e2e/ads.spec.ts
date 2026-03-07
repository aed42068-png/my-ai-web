import { expect, test } from '@playwright/test';
import { expectToast, gotoHome, uniqueName } from './helpers';

test('ads flow: create income, filter, create expense, switch month', async ({ page }) => {
  const incomeTitle = uniqueName('收入记录');
  const expenseTitle = uniqueName('投放记录');
  const updatedIncomeNote = 'E2E 已更新结算收入';

  await gotoHome(page);
  await page.getByTestId('tab-ads').click();
  await expect(page.getByRole('heading', { name: '收益管理' })).toBeVisible();

  await page.getByTestId('ads-open-record-modal').click();
  await expect(page.getByTestId('ads-record-modal')).toBeVisible();
  await page.getByTestId('ads-record-type-income').click();
  await page.getByTestId('ads-record-settlement-unsettled').click();
  await page.getByTestId('ads-record-title-input').fill(incomeTitle);
  await page.getByTestId('ads-record-amount-input').fill('321');
  await page.getByTestId('ads-record-note-input').fill('E2E 未结算收入');
  await page.getByTestId('ads-record-submit').click();
  await expectToast(page, '记录已添加');
  await expect(page.getByText(incomeTitle)).toBeVisible();

  await page.getByTestId('ads-filter-unsettled').click();
  await expect(page.getByText(incomeTitle)).toBeVisible();
  const incomeRecord = page.getByTestId('ads-record-item').filter({ hasText: incomeTitle });
  await incomeRecord.getByTestId('ads-record-settlement-toggle').click();
  await expectToast(page, '已标记为已结算');
  await expect(page.getByText(incomeTitle)).toHaveCount(0);
  await page.getByTestId('ads-filter-settled').click();
  await expect(page.getByText(incomeTitle)).toBeVisible();
  await page.getByTestId('ads-record-item').filter({ hasText: incomeTitle }).click();
  await expect(page.getByTestId('ads-record-modal')).toBeVisible();
  await page.getByTestId('ads-record-note-input').fill(updatedIncomeNote);
  await page.getByTestId('ads-record-submit').click();
  await expectToast(page, '记录已更新');
  await expect(page.getByText(updatedIncomeNote)).toBeVisible();
  await page.getByTestId('ads-filter-all').click();
  await expect(page.getByText(incomeTitle)).toBeVisible();

  await page.getByTestId('ads-type-expense').click();
  await page.getByTestId('ads-open-record-modal').click();
  await page.getByTestId('ads-record-type-expense').click();
  await page.getByTestId('ads-record-title-input').fill(expenseTitle);
  await page.getByTestId('ads-record-amount-input').fill('123');
  await page.getByTestId('ads-record-note-input').fill('E2E 投放支出');
  await page.getByTestId('ads-record-submit').click();
  await expectToast(page, '记录已添加');
  await expect(page.getByText(expenseTitle)).toBeVisible();
  page.once('dialog', (dialog) => dialog.accept());
  await page.getByTestId('ads-record-item').filter({ hasText: expenseTitle }).click();
  await expect(page.getByTestId('ads-record-modal')).toBeVisible();
  await page.getByTestId('ads-record-delete').click();
  await expectToast(page, '记录已删除');
  await expect(page.getByText(expenseTitle)).toHaveCount(0);

  const currentMonth = new Date().getMonth() + 1;
  const alternateMonth = currentMonth === 1 ? 2 : 1;
  await page.getByTestId('ads-open-calendar').click();
  await expect(page.getByTestId('ads-calendar-modal')).toBeVisible();
  await page.getByTestId(`ads-month-row-${alternateMonth}`).click();
  await expectToast(page, `已切换到${new Date().getFullYear()}年${alternateMonth}月`);
  await expect(page.getByText('当前筛选下暂无记录')).toBeVisible();

  await page.getByTestId('ads-open-calendar').click();
  await page.getByTestId(`ads-month-row-${currentMonth}`).click();
  await page.getByTestId('ads-type-income').click();
  await page.getByTestId('ads-filter-all').click();
  await expect(page.getByText(incomeTitle)).toBeVisible();
});
