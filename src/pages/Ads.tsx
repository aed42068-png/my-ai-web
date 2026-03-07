import { useEffect, useMemo, useState } from 'react';
import {
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Edit3,
  Megaphone,
  Plus,
  Square,
  Wallet,
  X,
} from 'lucide-react';
import AccountEditorModal from '../components/AccountEditorModal';
import { images } from '../data/mockData';
import { uploadAsset } from '../lib/api';
import { getAccountCover, getDefaultAccountImage } from '../lib/defaults';
import type {
  Account,
  AccountInput,
  AdRecord,
  AdRecordInput,
  AdRecordPatch,
  AdRecordType,
  IncomeSettlement,
} from '../types';

interface AdsProps {
  showToast: (message: string) => void;
  accounts: Account[];
  records: AdRecord[];
  isLoadingRecords?: boolean;
  recordsErrorMessage?: string;
  onRetryLoadRecords?: () => Promise<void>;
  onCreateAccount: (input: AccountInput) => Promise<Account>;
  onUpdateAccount: (id: string, input: Partial<AccountInput>) => Promise<Account>;
  onCreateRecord: (input: AdRecordInput) => Promise<AdRecord>;
  onUpdateRecord: (id: string, input: AdRecordPatch) => Promise<AdRecord>;
  onDeleteRecord: (id: string) => Promise<void>;
}

const today = new Date();
const currentYear = today.getFullYear();
const currentMonth = today.getMonth() + 1;
const currentDateISO = today.toISOString().split('T')[0];

const monthLabel = (month: number) => `${month}月`;

const formatCurrency = (amount: number) =>
  amount.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const formatRecordAmount = (amount: number, type: AdRecordType) =>
  `${type === 'income' ? '+' : '-'}¥ ${amount.toLocaleString('zh-CN')}`;

const formatDateLabel = (date: Date) => {
  const weekday = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
  return `${date.getMonth() + 1}月${date.getDate()}日 ${weekday[date.getDay()]}`;
};

const createRecordDraft = (type: AdRecordType, record?: AdRecord) => ({
  title: record?.title ?? '',
  date: record?.date ?? currentDateISO,
  note: record?.note ?? '',
  type: record?.type ?? type,
  amount: record ? String(record.amount) : '',
  settlementStatus: record?.settlementStatus ?? ('unsettled' as IncomeSettlement),
});

export default function Ads({
  showToast,
  accounts,
  records,
  isLoadingRecords = false,
  recordsErrorMessage = '',
  onRetryLoadRecords,
  onCreateAccount,
  onUpdateAccount,
  onCreateRecord,
  onUpdateRecord,
  onDeleteRecord,
}: AdsProps) {
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [activeType, setActiveType] = useState<AdRecordType>('income');
  const [incomeFilter, setIncomeFilter] = useState<'all' | IncomeSettlement>('all');
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [editingRecord, setEditingRecord] = useState<AdRecord | null>(null);
  const [recordDraft, setRecordDraft] = useState(() => createRecordDraft('income'));

  useEffect(() => {
    if (!accounts.length) {
      setSelectedAccountId('');
      return;
    }

    if (!accounts.some((account) => account.id === selectedAccountId)) {
      setSelectedAccountId(accounts[0].id);
    }
  }, [accounts, selectedAccountId]);

  const selectedAccount = useMemo(
    () => accounts.find((account) => account.id === selectedAccountId) ?? null,
    [accounts, selectedAccountId]
  );

  const accountRecords = useMemo(
    () => records.filter((record) => record.accountId === selectedAccountId),
    [records, selectedAccountId]
  );

  const selectedSummary = useMemo(() => {
    return accountRecords.reduce(
      (result, record) => {
        const [yearRaw, monthRaw] = record.date.split('-');
        if (Number(yearRaw) !== selectedYear || Number(monthRaw) !== selectedMonth) {
          return result;
        }

        if (record.type === 'income') {
          result.income += record.amount;
          if (record.settlementStatus === 'settled') {
            result.settled += record.amount;
          } else {
            result.unsettled += record.amount;
          }
        } else {
          result.expense += record.amount;
        }

        return result;
      },
      { income: 0, expense: 0, settled: 0, unsettled: 0 }
    );
  }, [accountRecords, selectedMonth, selectedYear]);

  const monthRows = useMemo(
    () =>
      Array.from({ length: 12 }, (_, index) => {
        const month = index + 1;
        const summary = accountRecords.reduce(
          (result, record) => {
            const [yearRaw, monthRaw] = record.date.split('-');
            if (Number(yearRaw) !== selectedYear || Number(monthRaw) !== month) {
              return result;
            }

            if (record.type === 'income') {
              result.income += record.amount;
            } else {
              result.expense += record.amount;
            }

            return result;
          },
          { month, income: 0, expense: 0 }
        );

        return summary;
      }),
    [accountRecords, selectedYear]
  );

  const filteredRecords = useMemo(
    () =>
      accountRecords.filter((record) => {
        const [yearRaw, monthRaw] = record.date.split('-');
        if (Number(yearRaw) !== selectedYear || Number(monthRaw) !== selectedMonth) {
          return false;
        }

        if (record.type !== activeType) {
          return false;
        }

        if (activeType === 'income' && incomeFilter !== 'all') {
          return record.settlementStatus === incomeFilter;
        }

        return true;
      }),
    [accountRecords, activeType, incomeFilter, selectedMonth, selectedYear]
  );

  const currentDateLabel = useMemo(() => formatDateLabel(new Date()), []);

  const closeRecordModal = () => {
    setIsRecordModalOpen(false);
    setEditingRecord(null);
    setRecordDraft(createRecordDraft(activeType));
  };

  const openCreateRecordModal = () => {
    setEditingRecord(null);
    setRecordDraft(createRecordDraft(activeType));
    setIsRecordModalOpen(true);
  };

  const openEditRecordModal = (record: AdRecord) => {
    setEditingRecord(record);
    setRecordDraft(createRecordDraft(record.type, record));
    setIsRecordModalOpen(true);
  };

  const handleSaveAccount = async ({
    name,
    coverAssetId,
    coverImageUrl,
    coverOffsetY,
    file,
  }: {
    name: string;
    coverAssetId?: string | null;
    coverImageUrl: string;
    coverOffsetY: number;
    file: File | null;
  }) => {
    if (!name.trim()) {
      showToast('请输入账号名称');
      return;
    }

    try {
      let nextCoverAssetId = coverAssetId ?? null;
      let nextCoverImageUrl = coverImageUrl;

      if (file) {
        const asset = await uploadAsset(file, 'account-cover');
        nextCoverAssetId = asset.id;
        nextCoverImageUrl = asset.url;
      }

      if (editingAccount) {
        await onUpdateAccount(editingAccount.id, {
          name: name.trim(),
          coverAssetId: nextCoverAssetId,
          coverImageUrl: nextCoverImageUrl,
          coverOffsetY,
        });
        showToast('账号已更新');
      } else {
        const created = await onCreateAccount({
          name: name.trim(),
          coverAssetId: nextCoverAssetId,
          coverImageUrl: nextCoverImageUrl || getDefaultAccountImage(accounts.length),
          coverOffsetY,
          sortOrder: accounts.length,
        });
        setSelectedAccountId(created.id);
        showToast('账号已新增');
      }

      setIsAccountModalOpen(false);
      setEditingAccount(null);
    } catch (error) {
      showToast(error instanceof Error ? error.message : '保存账号失败');
      throw error;
    }
  };

  const handleSaveRecord = async () => {
    if (!selectedAccountId) {
      showToast('请先创建账号');
      return;
    }

    if (!recordDraft.title.trim() || !recordDraft.amount) {
      showToast('请填写完整记录');
      return;
    }

    const amount = Number(recordDraft.amount);
    if (Number.isNaN(amount) || amount <= 0) {
      showToast('请输入有效金额');
      return;
    }

    try {
      const payload = {
        accountId: selectedAccountId,
        title: recordDraft.title.trim(),
        date: recordDraft.date,
        note: recordDraft.note.trim(),
        type: recordDraft.type,
        amount,
        settlementStatus: recordDraft.type === 'income' ? recordDraft.settlementStatus : null,
      };

      if (editingRecord) {
        await onUpdateRecord(editingRecord.id, payload);
        showToast('记录已更新');
      } else {
        await onCreateRecord(payload);
        showToast('记录已添加');
      }

      closeRecordModal();
    } catch (error) {
      showToast(error instanceof Error ? error.message : editingRecord ? '更新记录失败' : '保存记录失败');
    }
  };

  const handleDeleteRecord = async () => {
    if (!editingRecord) {
      return;
    }

    const confirmed = window.confirm(`确认删除「${editingRecord.title}」吗？`);
    if (!confirmed) {
      return;
    }

    try {
      await onDeleteRecord(editingRecord.id);
      closeRecordModal();
      showToast('记录已删除');
    } catch (error) {
      showToast(error instanceof Error ? error.message : '删除记录失败');
    }
  };

  const handleToggleSettlement = async (record: AdRecord) => {
    if (record.type !== 'income') {
      return;
    }

    const nextSettlement = record.settlementStatus === 'settled' ? 'unsettled' : 'settled';
    try {
      await onUpdateRecord(record.id, { settlementStatus: nextSettlement });
      showToast(nextSettlement === 'settled' ? '已标记为已结算' : '已标记为未结算');
    } catch (error) {
      showToast(error instanceof Error ? error.message : '更新结算状态失败');
    }
  };

  const renderRecordIcon = (record: AdRecord) => {
    const baseClass = `h-5 w-5 ${record.type === 'income' ? 'text-emerald-500' : 'text-rose-400'}`;
    if (record.title.includes('分成')) return <Square className={baseClass} />;
    if (record.type === 'expense') return <Megaphone className={baseClass} />;
    return <Wallet className={baseClass} />;
  };

  return (
    <div className="relative flex h-full flex-col bg-[#f3f4f6]">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur-md">
        <div className="flex items-center justify-between px-5 pb-5 pt-11">
          <div className="flex flex-col">
            <span className="text-[11px] font-medium tracking-[0.12em] text-slate-500">{currentDateLabel}</span>
            <h1 className="mt-1 text-[28px] font-bold tracking-tight text-slate-900">收益管理</h1>
          </div>
          <button
            data-testid="ads-open-calendar"
            onClick={() => setIsCalendarOpen(true)}
            className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-800 transition-colors hover:bg-slate-200"
          >
            <CalendarDays className="h-6 w-6" />
          </button>
        </div>
      </header>

      <main className="flex-1 space-y-6 overflow-y-auto px-5 pb-24 pt-5">
        <section className="rounded-[34px] bg-gradient-to-r from-[#171922] via-[#0f1421] to-[#1b1e2a] px-5 py-5 text-white shadow-lg">
          <div className="mb-5 flex items-start justify-between gap-3">
            <span className="pt-1 text-[13px] font-medium text-slate-300">
              {selectedYear}年{selectedMonth}月收支概览
            </span>
            <div className="flex min-w-0 items-center gap-2">
              <div className="relative min-w-0">
                <select
                  data-testid="ads-account-select"
                  value={selectedAccountId}
                  onChange={(event) => setSelectedAccountId(event.target.value)}
                  className="max-w-[140px] appearance-none truncate bg-transparent pr-5 text-base font-semibold text-blue-300 outline-none"
                >
                  {accounts.map((account) => (
                    <option key={account.id} value={account.id} className="text-slate-900">
                      {account.name}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-0 top-1/2 h-4 w-4 -translate-y-1/2 text-blue-400" />
              </div>
              <button
                onClick={() => {
                  setEditingAccount(null);
                  setIsAccountModalOpen(true);
                }}
                data-testid="ads-add-account"
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/20 text-blue-300 transition-colors hover:bg-white/10"
                title="新增账号"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-[13px] text-slate-400">总预估收入</div>
              {isLoadingRecords ? (
                <>
                  <div className="mt-2 h-10 w-32 animate-pulse rounded-full bg-white/10" />
                  <div className="mt-3 h-3 w-24 animate-pulse rounded-full bg-white/10" />
                  <div className="mt-2 h-3 w-24 animate-pulse rounded-full bg-white/10" />
                </>
              ) : (
                <>
                  <div className="mt-1 text-[34px] font-bold leading-none tracking-tight">¥ {formatCurrency(selectedSummary.income)}</div>
                  <div className="mt-3 text-[11px] text-emerald-300">已结算 ¥ {selectedSummary.settled.toLocaleString('zh-CN')}</div>
                  <div className="mt-1 text-[11px] text-amber-200">未结算 ¥ {selectedSummary.unsettled.toLocaleString('zh-CN')}</div>
                </>
              )}
            </div>
            <div className="text-right">
              <div className="text-[13px] text-slate-400">总投放支出</div>
              {isLoadingRecords ? (
                <div className="ml-auto mt-2 h-10 w-28 animate-pulse rounded-full bg-white/10" />
              ) : (
                <div className="mt-1 text-[34px] font-bold leading-none tracking-tight text-rose-500">¥ {formatCurrency(selectedSummary.expense)}</div>
              )}
            </div>
          </div>
        </section>

        <section className="relative h-56 overflow-hidden rounded-[30px] border border-white/40 shadow-md">
          <div
            className="absolute inset-0 bg-cover bg-no-repeat"
            style={{
              backgroundImage: `url('${selectedAccount ? getAccountCover(selectedAccount) : images.travelVlogBg}')`,
              backgroundPosition: `center ${selectedAccount?.coverOffsetY ?? 50}%`,
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-black/10" />

          <div className="absolute left-5 top-5 flex items-center gap-2">
            <div className="h-10 w-10 rounded-full border-2 border-white/90 bg-[#e9c8ad] p-0.5 shadow-md">
              <img
                alt="账号头像"
                className="h-full w-full rounded-full object-cover"
                src={selectedAccount ? getAccountCover(selectedAccount) : images.avatar}
              />
            </div>
            <div className="text-white drop-shadow-sm">
              <span className="text-base font-semibold">{selectedAccount?.name || '未命名账号'}</span>
              <span className="ml-1 text-xs opacity-80">●</span>
            </div>
          </div>

          <button
            onClick={() => {
              setEditingAccount(selectedAccount);
              setIsAccountModalOpen(true);
            }}
            data-testid="ads-edit-account"
            className="absolute right-5 top-5 flex items-center gap-1 rounded-full border border-white/20 bg-black/25 px-3 py-1.5 text-[11px] font-medium text-white backdrop-blur-sm transition-colors hover:bg-black/40"
          >
            <Edit3 className="h-3.5 w-3.5" />
            编辑
          </button>

          <div className="absolute bottom-6 left-6 max-w-[62%] text-white">
            <div className="text-[13px] opacity-85">账号主页预览</div>
            <div className="mt-1 text-[24px] font-bold leading-tight tracking-tight">封面截图来自 R2 上传</div>
          </div>
          <div className="absolute bottom-6 right-6 rounded-full border border-white/20 bg-white/20 px-4 py-1.5 text-sm font-semibold text-white backdrop-blur-md">
            活跃中
          </div>
        </section>

        <section className="rounded-2xl bg-slate-200/85 p-1">
          <div className="grid grid-cols-2 gap-1">
            <button
              data-testid="ads-type-income"
              onClick={() => {
                setActiveType('income');
                setRecordDraft((prev) => ({ ...prev, type: 'income' }));
              }}
              className={`rounded-xl py-2.5 text-base font-semibold transition-all ${
                activeType === 'income' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              收入
            </button>
            <button
              data-testid="ads-type-expense"
              onClick={() => {
                setActiveType('expense');
                setRecordDraft((prev) => ({ ...prev, type: 'expense' }));
              }}
              className={`rounded-xl py-2.5 text-base font-semibold transition-all ${
                activeType === 'expense' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              投放
            </button>
          </div>
        </section>

        {activeType === 'income' ? (
          <section className="rounded-2xl border border-slate-200 bg-white p-3">
            <div className="mb-3 text-sm font-semibold text-slate-700">收入状态</div>
            <div className="grid grid-cols-3 gap-2">
              {[
                { key: 'all', label: '全部' },
                { key: 'settled', label: '已结算' },
                { key: 'unsettled', label: '未结算' },
              ].map((item) => (
                <button
                  key={item.key}
                  data-testid={`ads-filter-${item.key}`}
                  onClick={() => setIncomeFilter(item.key as 'all' | IncomeSettlement)}
                  className={`rounded-xl py-2 text-sm font-medium transition-colors ${
                    incomeFilter === item.key ? 'bg-primary text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </section>
        ) : null}

        <section>
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <h2 className="text-[26px] font-bold tracking-tight text-slate-900">近期记录</h2>
              <p className="mt-1 text-xs text-slate-400">点记录可编辑，点结算状态可快速切换</p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-500">
                {selectedYear}年{selectedMonth}月
              </span>
              <button
                onClick={openCreateRecordModal}
                data-testid="ads-open-record-modal"
                className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white shadow-md shadow-primary/25 transition-colors hover:bg-blue-600"
              >
                <Plus className="h-4 w-4" />
                新增
              </button>
            </div>
          </div>
          <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
            {recordsErrorMessage ? (
              <div className="px-5 py-10 text-center">
                <div className="text-base font-medium text-slate-700">收益记录加载失败</div>
                <div className="mt-2 text-sm text-slate-500">{recordsErrorMessage}</div>
                <button
                  onClick={() => void onRetryLoadRecords?.()}
                  className="mt-5 rounded-full bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-600"
                >
                  重试
                </button>
              </div>
            ) : isLoadingRecords ? (
              <div className="space-y-4 px-4 py-4">
                {Array.from({ length: 3 }).map((_, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <div className="h-12 w-12 animate-pulse rounded-full bg-slate-100" />
                    <div className="min-w-0 flex-1">
                      <div className="h-5 w-40 animate-pulse rounded-full bg-slate-100" />
                      <div className="mt-2 h-4 w-48 animate-pulse rounded-full bg-slate-100" />
                    </div>
                    <div className="h-6 w-20 animate-pulse rounded-full bg-slate-100" />
                  </div>
                ))}
              </div>
            ) : filteredRecords.length ? (
              filteredRecords.map((record, index) => (
                <div
                  key={record.id}
                  data-testid="ads-record-item"
                  role="button"
                  tabIndex={0}
                  onClick={() => openEditRecordModal(record)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      openEditRecordModal(record);
                    }
                  }}
                  className={`group flex cursor-pointer items-start gap-3 px-4 py-4 transition-colors hover:bg-slate-50 focus:outline-none focus-visible:bg-slate-50 ${
                    index !== filteredRecords.length - 1 ? 'border-b border-slate-100' : ''
                  }`}
                >
                  <div
                    className={`mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${
                      record.type === 'income' ? 'bg-emerald-50' : 'bg-rose-50'
                    }`}
                  >
                    {renderRecordIcon(record)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[17px] font-semibold leading-snug text-slate-800">{record.title}</div>
                    <div className="mt-1.5 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs text-slate-400">
                      <CalendarDays className="h-4 w-4" />
                      <span>{record.date}</span>
                      <span>•</span>
                      <span>{record.note || '无备注'}</span>
                    </div>
                    {record.type === 'income' && record.settlementStatus ? (
                      <div className="mt-3">
                        <button
                          type="button"
                          data-testid="ads-record-settlement-toggle"
                          onClick={(event) => {
                            event.stopPropagation();
                            void handleToggleSettlement(record);
                          }}
                          className={`rounded-full px-2.5 py-1 text-xs font-semibold transition-colors ${
                            record.settlementStatus === 'settled'
                              ? 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'
                              : 'bg-amber-50 text-amber-600 hover:bg-amber-100'
                          }`}
                        >
                          {record.settlementStatus === 'settled' ? '已结算' : '未结算'}
                        </button>
                      </div>
                    ) : null}
                  </div>
                  <div className="shrink-0 pl-2 text-right">
                    <div
                      className={`text-[18px] font-bold leading-tight ${
                        record.type === 'income' ? 'text-emerald-500' : 'text-rose-400'
                      }`}
                    >
                      {formatRecordAmount(record.amount, record.type)}
                    </div>
                    <div className="mt-2 flex items-center justify-end gap-0.5 text-[11px] font-medium text-slate-400">
                      <span>编辑</span>
                      <ChevronRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="px-5 py-10 text-center text-base text-slate-400">当前筛选下暂无记录</div>
            )}
          </div>
        </section>
      </main>

      {isRecordModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div data-testid="ads-record-modal" className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold text-slate-900">{editingRecord ? '编辑记录' : '新增记录'}</h3>
                <p className="mt-1 text-sm text-slate-400">当前账号：{selectedAccount?.name || '未命名账号'}</p>
              </div>
              <button onClick={closeRecordModal} className="text-slate-400 transition-colors hover:text-slate-600">
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">记录类型</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { value: 'income' as const, label: '收入' },
                    { value: 'expense' as const, label: '投放' },
                  ].map((item) => (
                    <button
                      key={item.value}
                      data-testid={`ads-record-type-${item.value}`}
                      onClick={() => setRecordDraft((prev) => ({ ...prev, type: item.value }))}
                      className={`rounded-xl py-2.5 text-sm font-medium ${
                        recordDraft.type === item.value ? 'bg-primary text-white' : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              {recordDraft.type === 'income' ? (
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">收入状态</label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { value: 'settled' as const, label: '已结算' },
                      { value: 'unsettled' as const, label: '未结算' },
                    ].map((item) => (
                      <button
                        key={item.value}
                        data-testid={`ads-record-settlement-${item.value}`}
                        onClick={() => setRecordDraft((prev) => ({ ...prev, settlementStatus: item.value }))}
                        className={`rounded-xl py-2.5 text-sm font-medium ${
                          recordDraft.settlementStatus === item.value ? 'bg-primary text-white' : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}

              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">标题</label>
                <input
                  type="text"
                  data-testid="ads-record-title-input"
                  value={recordDraft.title}
                  onChange={(event) => setRecordDraft((prev) => ({ ...prev, title: event.target.value }))}
                  placeholder="例如：品牌合作 - 户外品牌"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition-all focus:border-transparent focus:ring-2 focus:ring-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">日期</label>
                  <input
                    type="date"
                    data-testid="ads-record-date-input"
                    value={recordDraft.date}
                    onChange={(event) => setRecordDraft((prev) => ({ ...prev, date: event.target.value }))}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition-all focus:border-transparent focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">金额 (¥)</label>
                  <input
                    type="number"
                    min="0"
                    data-testid="ads-record-amount-input"
                    value={recordDraft.amount}
                    onChange={(event) => setRecordDraft((prev) => ({ ...prev, amount: event.target.value }))}
                    placeholder="0"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition-all focus:border-transparent focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">备注</label>
                <input
                  type="text"
                  data-testid="ads-record-note-input"
                  value={recordDraft.note}
                  onChange={(event) => setRecordDraft((prev) => ({ ...prev, note: event.target.value }))}
                  placeholder={recordDraft.type === 'income' ? '例如：某品牌合作结算' : '例如：Dou+ 加热投放'}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition-all focus:border-transparent focus:ring-2 focus:ring-primary"
                />
              </div>

              <button
                onClick={() => void handleSaveRecord()}
                data-testid="ads-record-submit"
                className="mt-2 w-full rounded-xl bg-primary py-3.5 font-semibold text-white shadow-lg shadow-primary/30 transition-all hover:bg-blue-600 active:scale-[0.98]"
              >
                {editingRecord ? '保存修改' : '保存记录'}
              </button>

              {editingRecord ? (
                <button
                  onClick={() => void handleDeleteRecord()}
                  data-testid="ads-record-delete"
                  className="w-full rounded-xl border border-rose-200 py-3 text-sm font-semibold text-rose-500 transition-colors hover:bg-rose-50"
                >
                  删除记录
                </button>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      {isCalendarOpen ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 p-0 backdrop-blur-sm sm:items-center sm:p-4">
          <div data-testid="ads-calendar-modal" className="w-full max-w-md rounded-t-3xl bg-white p-5 shadow-2xl sm:rounded-3xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900">月度收支</h3>
              <button onClick={() => setIsCalendarOpen(false)} className="text-slate-400 transition-colors hover:text-slate-600">
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="mb-4 flex items-center justify-center gap-3">
              <button
                onClick={() => setSelectedYear((prev) => prev - 1)}
                className="rounded-full bg-slate-100 p-2 text-slate-600 hover:bg-slate-200"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-lg font-semibold text-slate-900">{selectedYear} 年</span>
              <button
                onClick={() => setSelectedYear((prev) => prev + 1)}
                className="rounded-full bg-slate-100 p-2 text-slate-600 hover:bg-slate-200"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            <div className="mb-2 grid grid-cols-[72px_1fr_1fr] px-3 text-xs font-medium text-slate-400">
              <span>月份</span>
              <span className="text-right">收入</span>
              <span className="text-right">投放</span>
            </div>

            <div className="max-h-[55vh] space-y-1 overflow-y-auto">
              {monthRows.map((summary) => {
                const isActive = summary.month === selectedMonth;
                return (
                  <button
                    key={summary.month}
                    data-testid={`ads-month-row-${summary.month}`}
                    onClick={() => {
                      setSelectedMonth(summary.month);
                      setIsCalendarOpen(false);
                      showToast(`已切换到${selectedYear}年${summary.month}月`);
                    }}
                    className={`grid w-full grid-cols-[72px_1fr_1fr] items-center rounded-xl px-3 py-3 text-sm transition-colors ${
                      isActive ? 'bg-primary/10' : 'hover:bg-slate-50'
                    }`}
                  >
                    <span className={`text-left font-semibold ${isActive ? 'text-primary' : 'text-slate-700'}`}>
                      {monthLabel(summary.month)}
                    </span>
                    <span className="text-right font-semibold text-emerald-600">+¥ {summary.income.toLocaleString('zh-CN')}</span>
                    <span className="text-right font-semibold text-rose-500">-¥ {summary.expense.toLocaleString('zh-CN')}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      ) : null}

      <AccountEditorModal
        open={isAccountModalOpen}
        title={editingAccount ? '编辑账号封面' : '新增账号'}
        submitLabel={editingAccount ? '保存修改' : '确认添加'}
        initialDraft={{
          name: editingAccount?.name ?? '',
          coverAssetId: editingAccount?.coverAssetId ?? null,
          coverImageUrl: editingAccount?.coverImageUrl ?? getDefaultAccountImage(accounts.length),
          coverOffsetY: editingAccount?.coverOffsetY ?? 50,
        }}
        fallbackImage={getDefaultAccountImage(editingAccount ? accounts.findIndex((account) => account.id === editingAccount.id) : accounts.length)}
        onClose={() => {
          setIsAccountModalOpen(false);
          setEditingAccount(null);
        }}
        onSave={handleSaveAccount}
      />
    </div>
  );
}
