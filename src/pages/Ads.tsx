import { useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
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
import { images } from '../data/mockData';

type RecordType = 'income' | 'expense';
type RecordIcon = 'wallet' | 'square' | 'megaphone';
type IncomeSettlement = 'settled' | 'unsettled';

interface RevenueRecord {
  id: number;
  title: string;
  date: string;
  note: string;
  type: RecordType;
  amount: number;
  icon: RecordIcon;
  settlementStatus?: IncomeSettlement;
}

interface MonthlySummary {
  year: number;
  month: number;
  income: number;
  expense: number;
}

interface AdAccount {
  id: string;
  name: string;
  coverImage: string;
  coverOffsetY: number;
}

interface AccountDraft {
  id: string;
  name: string;
  coverImage: string;
  coverOffsetY: number;
}

const today = new Date();
const currentYear = today.getFullYear();
const currentMonth = today.getMonth() + 1;

const defaultAccountCovers = [images.travelVlogBg, images.archive2, images.archive3, images.archive1];
const getDefaultCover = (index: number) =>
  defaultAccountCovers[index % defaultAccountCovers.length] || images.travelVlogBg;

const initialAccounts: AdAccount[] = [
  { id: 'acc-1', name: '旅行主账号', coverImage: getDefaultCover(0), coverOffsetY: 42 },
  { id: 'acc-2', name: 'AI教程号', coverImage: getDefaultCover(1), coverOffsetY: 50 },
  { id: 'acc-3', name: '知识库号', coverImage: getDefaultCover(2), coverOffsetY: 52 },
  { id: 'acc-4', name: '生活号', coverImage: getDefaultCover(3), coverOffsetY: 48 },
];

const formatDateLabel = (date: Date) => {
  const weekday = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
  return `${date.getMonth() + 1}月${date.getDate()}日 ${weekday[date.getDay()]}`;
};

const formatCurrency = (amount: number) =>
  amount.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const formatRecordAmount = (amount: number, type: RecordType) =>
  `${type === 'income' ? '+' : '-'}¥ ${amount.toLocaleString('zh-CN')}`;

const initialMonthlySummaries: MonthlySummary[] = (() => {
  const arr = Array.from({ length: 12 }, (_, index) => ({
    year: currentYear,
    month: index + 1,
    income: 18000 + index * 1200,
    expense: 3600 + index * 480,
  }));
  arr[currentMonth - 1] = {
    ...arr[currentMonth - 1],
    income: 42850,
    expense: 8420,
  };
  return arr;
})();

const toDotDate = (isoDate: string) => isoDate.replace(/-/g, '.');
const monthName = (month: number) => `${month}月`;
const currentDateISO = new Date().toISOString().split('T')[0];

const parseDotDateToYearMonth = (date: string) => {
  const [yearRaw, monthRaw] = date.split('.');
  return {
    year: Number(yearRaw) || currentYear,
    month: Number(monthRaw) || currentMonth,
  };
};

const createEmptyAccountDraft = (index: number): AccountDraft => ({
  id: '',
  name: '',
  coverImage: getDefaultCover(index),
  coverOffsetY: 50,
});

function ImagePositioner({
  image,
  offsetY,
  onChange,
}: {
  image: string;
  offsetY: number;
  onChange: (offsetY: number) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const startY = useRef(0);
  const startOffsetY = useRef(0);

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    startY.current = event.clientY;
    startOffsetY.current = offsetY;
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.buttons !== 1) return;
    const dy = event.clientY - startY.current;
    if (!containerRef.current) return;
    const height = containerRef.current.clientHeight || 1;
    const nextOffset = Math.max(0, Math.min(100, startOffsetY.current - (dy / height) * 100));
    onChange(nextOffset);
  };

  return (
    <div
      ref={containerRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      className="relative mt-3 aspect-video w-full cursor-ns-resize overflow-hidden rounded-xl shadow-sm touch-none"
    >
      <div className="absolute inset-0 bg-cover bg-no-repeat" style={{ backgroundImage: `url('${image}')`, backgroundPosition: `center ${offsetY}%` }} />
      <div className="absolute inset-0 flex items-center justify-center bg-black/25 text-xs font-medium text-white">
        上下拖动调整封面位置
      </div>
    </div>
  );
}

export default function Ads({ showToast }: { showToast: (msg: string) => void }) {
  const [adAccounts, setAdAccounts] = useState<AdAccount[]>(initialAccounts);
  const [selectedAccountId, setSelectedAccountId] = useState(initialAccounts[0].id);
  const [activeType, setActiveType] = useState<RecordType>('income');
  const [incomeFilter, setIncomeFilter] = useState<'all' | IncomeSettlement>('all');

  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [accountModalMode, setAccountModalMode] = useState<'add' | 'edit'>('edit');

  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [monthlySummaries, setMonthlySummaries] = useState<MonthlySummary[]>(initialMonthlySummaries);

  const [records, setRecords] = useState<RevenueRecord[]>([
    {
      id: 1,
      title: '品牌合作: 户外品牌',
      date: `${currentYear}.${String(currentMonth).padStart(2, '0')}.22`,
      note: '某品牌季度合作结算',
      type: 'income',
      amount: 15000,
      icon: 'wallet',
      settlementStatus: 'settled',
    },
    {
      id: 2,
      title: '激励计划: 视频分成',
      date: `${currentYear}.${String(currentMonth).padStart(2, '0')}.20`,
      note: '平台流量激励收益',
      type: 'income',
      amount: 2450,
      icon: 'square',
      settlementStatus: 'unsettled',
    },
    {
      id: 3,
      title: '作品加热: 探店Vlog',
      date: `${currentYear}.${String(currentMonth).padStart(2, '0')}.18`,
      note: 'Dou+ 付费加热',
      type: 'expense',
      amount: 500,
      icon: 'megaphone',
    },
  ]);

  const [newRecord, setNewRecord] = useState({
    title: '',
    date: currentDateISO,
    note: '',
    type: 'income' as RecordType,
    amount: '',
    settlementStatus: 'unsettled' as IncomeSettlement,
  });

  const [accountDraft, setAccountDraft] = useState<AccountDraft>(createEmptyAccountDraft(initialAccounts.length));

  const currentDateLabel = useMemo(() => formatDateLabel(new Date()), []);

  const selectedAccount = useMemo(
    () => adAccounts.find(account => account.id === selectedAccountId) || adAccounts[0],
    [adAccounts, selectedAccountId]
  );

  const getMonthlySummary = (year: number, month: number) =>
    monthlySummaries.find(item => item.year === year && item.month === month) || {
      year,
      month,
      income: 0,
      expense: 0,
    };

  const selectedSummary = useMemo(
    () => getMonthlySummary(selectedYear, selectedMonth),
    [monthlySummaries, selectedYear, selectedMonth]
  );

  const monthRows = useMemo(
    () => Array.from({ length: 12 }, (_, index) => getMonthlySummary(selectedYear, index + 1)),
    [monthlySummaries, selectedYear]
  );

  const incomeSettlementSummary = useMemo(() => {
    let settled = 0;
    let unsettled = 0;
    records.forEach(record => {
      if (record.type !== 'income') return;
      const { year, month } = parseDotDateToYearMonth(record.date);
      if (year !== selectedYear || month !== selectedMonth) return;
      if (record.settlementStatus === 'settled') {
        settled += record.amount;
      } else {
        unsettled += record.amount;
      }
    });
    return { settled, unsettled };
  }, [records, selectedYear, selectedMonth]);

  const filteredRecords = useMemo(
    () =>
      records.filter(record => {
        if (record.type !== activeType) return false;
        const { year, month } = parseDotDateToYearMonth(record.date);
        if (year !== selectedYear || month !== selectedMonth) return false;
        if (activeType === 'income' && incomeFilter !== 'all') {
          return record.settlementStatus === incomeFilter;
        }
        return true;
      }),
    [records, activeType, incomeFilter, selectedYear, selectedMonth]
  );

  const updateMonthlySummary = (year: number, month: number, type: RecordType, amount: number) => {
    setMonthlySummaries(prev => {
      const index = prev.findIndex(item => item.year === year && item.month === month);
      if (index === -1) {
        return [
          ...prev,
          {
            year,
            month,
            income: type === 'income' ? amount : 0,
            expense: type === 'expense' ? amount : 0,
          },
        ];
      }
      return prev.map((item, itemIndex) => {
        if (itemIndex !== index) return item;
        return {
          ...item,
          income: item.income + (type === 'income' ? amount : 0),
          expense: item.expense + (type === 'expense' ? amount : 0),
        };
      });
    });
  };

  const openEditAccountModal = () => {
    if (!selectedAccount) return;
    setAccountModalMode('edit');
    setAccountDraft({
      id: selectedAccount.id,
      name: selectedAccount.name,
      coverImage: selectedAccount.coverImage,
      coverOffsetY: selectedAccount.coverOffsetY,
    });
    setIsAccountModalOpen(true);
  };

  const openAddAccountModal = () => {
    if (adAccounts.length >= 10) {
      showToast('最多只能添加10个账号');
      return;
    }
    setAccountModalMode('add');
    setAccountDraft(createEmptyAccountDraft(adAccounts.length));
    setIsAccountModalOpen(true);
  };

  const handleSaveAccount = () => {
    if (!accountDraft.name.trim()) {
      showToast('请输入账号名称');
      return;
    }

    if (accountModalMode === 'edit' && accountDraft.id) {
      setAdAccounts(prev =>
        prev.map(account =>
          account.id === accountDraft.id
            ? {
                ...account,
                name: accountDraft.name.trim(),
                coverImage: accountDraft.coverImage,
                coverOffsetY: accountDraft.coverOffsetY,
              }
            : account
        )
      );
      showToast('账号已更新');
    } else {
      const nextId = `acc-${Date.now()}`;
      const nextAccount: AdAccount = {
        id: nextId,
        name: accountDraft.name.trim(),
        coverImage: accountDraft.coverImage,
        coverOffsetY: accountDraft.coverOffsetY,
      };
      setAdAccounts(prev => [...prev, nextAccount]);
      setSelectedAccountId(nextId);
      showToast('账号已新增');
    }

    setIsAccountModalOpen(false);
  };

  const handleSaveRecord = () => {
    if (!newRecord.title.trim() || !newRecord.amount) {
      showToast('请填写完整记录');
      return;
    }

    const amount = Number(newRecord.amount);
    if (Number.isNaN(amount) || amount <= 0) {
      showToast('请输入有效金额');
      return;
    }

    const recordType = newRecord.type;
    const recordIcon: RecordIcon = recordType === 'income' ? 'wallet' : 'megaphone';
    const [yearRaw, monthRaw] = newRecord.date.split('-');
    const parsedYear = Number(yearRaw) || currentYear;
    const parsedMonth = Number(monthRaw) || currentMonth;

    const nextRecord: RevenueRecord = {
      id: Date.now(),
      title: newRecord.title.trim(),
      date: toDotDate(newRecord.date),
      note: newRecord.note.trim(),
      type: recordType,
      amount,
      icon: recordIcon,
      settlementStatus: recordType === 'income' ? newRecord.settlementStatus : undefined,
    };

    setRecords(prev => [nextRecord, ...prev]);
    updateMonthlySummary(parsedYear, parsedMonth, recordType, amount);
    setSelectedYear(parsedYear);
    setSelectedMonth(parsedMonth);
    setActiveType(recordType);

    setNewRecord({
      title: '',
      date: currentDateISO,
      note: '',
      type: recordType,
      amount: '',
      settlementStatus: 'unsettled',
    });
    setIsRecordModalOpen(false);
    showToast('记录已添加');
  };

  const renderRecordIcon = (record: RevenueRecord) => {
    const baseClass = `h-5 w-5 ${record.type === 'income' ? 'text-emerald-500' : 'text-rose-400'}`;
    if (record.icon === 'square') return <Square className={baseClass} />;
    if (record.icon === 'megaphone') return <Megaphone className={baseClass} />;
    return <Wallet className={baseClass} />;
  };

  return (
    <div className="relative flex h-full flex-col bg-[#f3f4f6]">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 ios-blur">
        <div className="flex items-center justify-between px-5 pt-11 pb-5">
          <div className="flex flex-col">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">{currentDateLabel}</span>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">收益管理</h1>
          </div>
          <button
            onClick={() => setIsCalendarOpen(true)}
            className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-800 transition-colors hover:bg-slate-200"
          >
            <CalendarDays className="h-6 w-6" />
          </button>
        </div>
      </header>

      <main className="flex-1 space-y-6 overflow-y-auto px-5 pb-36 pt-5">
        <section className="rounded-[34px] bg-gradient-to-r from-[#171922] via-[#0f1421] to-[#1b1e2a] px-6 py-6 text-white shadow-lg">
          <div className="mb-5 flex items-center justify-between">
            <span className="text-sm font-medium text-slate-300">{selectedYear}年{selectedMonth}月收支概览</span>
            <div className="flex items-center gap-2">
              <div className="relative">
                <select
                  value={selectedAccountId}
                  onChange={event => setSelectedAccountId(event.target.value)}
                  className="appearance-none bg-transparent pr-5 text-lg font-semibold text-blue-500 outline-none"
                >
                  {adAccounts.map(account => (
                    <option key={account.id} value={account.id} className="text-slate-900">
                      {account.name}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-0 top-1/2 h-4 w-4 -translate-y-1/2 text-blue-500" />
              </div>
              <button
                onClick={openAddAccountModal}
                className="flex h-7 w-7 items-center justify-center rounded-full border border-white/20 text-blue-400 transition-colors hover:bg-white/10"
                title="新增账号"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-5">
            <div>
              <div className="text-sm text-slate-400">总预估收入</div>
              <div className="mt-1 text-[41px] font-bold">¥ {formatCurrency(selectedSummary.income)}</div>
              <div className="mt-2 text-xs text-emerald-300">已结算 ¥ {incomeSettlementSummary.settled.toLocaleString('zh-CN')}</div>
              <div className="mt-0.5 text-xs text-amber-200">未结算 ¥ {incomeSettlementSummary.unsettled.toLocaleString('zh-CN')}</div>
            </div>
            <div className="text-right">
              <div className="text-sm text-slate-400">总投放支出</div>
              <div className="mt-1 text-[41px] font-bold text-red-500">¥ {formatCurrency(selectedSummary.expense)}</div>
            </div>
          </div>
        </section>

        <section className="relative h-56 overflow-hidden rounded-[30px] border border-white/40 shadow-md">
          <div
            className="absolute inset-0 bg-cover bg-no-repeat"
            style={{
              backgroundImage: `url('${selectedAccount?.coverImage || images.travelVlogBg}')`,
              backgroundPosition: `center ${selectedAccount?.coverOffsetY ?? 50}%`,
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-black/10" />

          <div className="absolute left-5 top-5 flex items-center gap-2">
            <div className="h-10 w-10 rounded-full border-2 border-white/90 bg-[#e9c8ad] p-0.5 shadow-md">
              <img alt="账号头像" className="h-full w-full rounded-full object-cover" src={selectedAccount?.coverImage || images.avatar} />
            </div>
            <div className="text-white drop-shadow-sm">
              <span className="text-lg font-semibold">{selectedAccount?.name || '未命名账号'}</span>
              <span className="ml-1 text-xs opacity-80">●</span>
            </div>
          </div>

          <button
            onClick={openEditAccountModal}
            className="absolute right-5 top-5 flex items-center gap-1 rounded-full border border-white/20 bg-black/25 px-3 py-1.5 text-xs font-medium text-white backdrop-blur-sm transition-colors hover:bg-black/40"
          >
            <Edit3 className="h-3.5 w-3.5" />
            编辑
          </button>

          <div className="absolute bottom-6 left-6 text-white">
            <div className="text-sm opacity-85">账号主页预览</div>
            <div className="mt-1 text-3xl font-bold">封面截图可自定义</div>
          </div>
          <div className="absolute bottom-6 right-6 rounded-full border border-white/20 bg-white/20 px-5 py-2 text-base font-semibold text-white backdrop-blur-md">
            活跃中
          </div>
        </section>

        <section className="rounded-2xl bg-slate-200/85 p-1">
          <div className="grid grid-cols-2 gap-1">
            <button
              onClick={() => setActiveType('income')}
              className={`rounded-xl py-3 text-lg font-semibold transition-all ${
                activeType === 'income' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              收入
            </button>
            <button
              onClick={() => setActiveType('expense')}
              className={`rounded-xl py-3 text-lg font-semibold transition-all ${
                activeType === 'expense' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              投放
            </button>
          </div>
        </section>

        {activeType === 'income' && (
          <section className="rounded-2xl border border-slate-200 bg-white p-3">
            <div className="mb-3 text-sm font-semibold text-slate-700">收入状态</div>
            <div className="grid grid-cols-3 gap-2">
              {[
                { key: 'all', label: '全部' },
                { key: 'settled', label: '已结算' },
                { key: 'unsettled', label: '未结算' },
              ].map(item => (
                <button
                  key={item.key}
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
        )}

        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-3xl font-bold tracking-tight text-slate-900">近期记录</h2>
            <span className="text-base font-medium text-slate-500">
              {selectedYear}年{selectedMonth}月
            </span>
          </div>
          <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
            {filteredRecords.length === 0 ? (
              <div className="px-5 py-10 text-center text-base text-slate-400">当前筛选下暂无记录</div>
            ) : (
              filteredRecords.map((record, index) => (
                <div
                  key={record.id}
                  className={`flex items-center gap-3 px-4 py-4 ${index !== filteredRecords.length - 1 ? 'border-b border-slate-100' : ''}`}
                >
                  <div
                    className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${
                      record.type === 'income' ? 'bg-emerald-50' : 'bg-rose-50'
                    }`}
                  >
                    {renderRecordIcon(record)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-xl font-bold text-slate-700">{record.title}</div>
                    <div className="mt-1 flex items-center gap-1.5 text-sm text-slate-400">
                      <CalendarDays className="h-4 w-4" />
                      <span>{record.date}</span>
                      <span>•</span>
                      <span>{record.note || '无备注'}</span>
                      {record.type === 'income' && record.settlementStatus && (
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs ${
                            record.settlementStatus === 'settled'
                              ? 'bg-emerald-50 text-emerald-600'
                              : 'bg-amber-50 text-amber-600'
                          }`}
                        >
                          {record.settlementStatus === 'settled' ? '已结算' : '未结算'}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className={`text-2xl font-bold ${record.type === 'income' ? 'text-emerald-500' : 'text-rose-400'}`}>
                    {formatRecordAmount(record.amount, record.type)}
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </main>

      <button
        onClick={() => {
          setNewRecord(prev => ({ ...prev, type: activeType }));
          setIsRecordModalOpen(true);
        }}
        className="absolute bottom-24 left-1/2 z-30 flex h-[72px] w-[72px] -translate-x-1/2 items-center justify-center rounded-full bg-primary text-white shadow-xl shadow-primary/30 transition-transform hover:scale-105 active:scale-95"
      >
        <Plus className="h-8 w-8" />
      </button>

      {isRecordModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl">
            <div className="mb-6 flex items-center justify-between">
              <h3 className="text-xl font-bold text-slate-900">新增记录</h3>
              <button onClick={() => setIsRecordModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">记录类型</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setNewRecord({ ...newRecord, type: 'income' })}
                    className={`rounded-xl py-2.5 text-sm font-medium ${
                      newRecord.type === 'income' ? 'bg-primary text-white' : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    收入
                  </button>
                  <button
                    onClick={() => setNewRecord({ ...newRecord, type: 'expense' })}
                    className={`rounded-xl py-2.5 text-sm font-medium ${
                      newRecord.type === 'expense' ? 'bg-primary text-white' : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    投放
                  </button>
                </div>
              </div>

              {newRecord.type === 'income' && (
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">收入状态</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setNewRecord({ ...newRecord, settlementStatus: 'settled' })}
                      className={`rounded-xl py-2.5 text-sm font-medium ${
                        newRecord.settlementStatus === 'settled' ? 'bg-primary text-white' : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      已结算
                    </button>
                    <button
                      onClick={() => setNewRecord({ ...newRecord, settlementStatus: 'unsettled' })}
                      className={`rounded-xl py-2.5 text-sm font-medium ${
                        newRecord.settlementStatus === 'unsettled' ? 'bg-primary text-white' : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      未结算
                    </button>
                  </div>
                </div>
              )}

              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">标题</label>
                <input
                  type="text"
                  value={newRecord.title}
                  onChange={event => setNewRecord({ ...newRecord, title: event.target.value })}
                  placeholder="例如：品牌合作 - 户外品牌"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition-all focus:border-transparent focus:ring-2 focus:ring-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">日期</label>
                  <input
                    type="date"
                    value={newRecord.date}
                    onChange={event => setNewRecord({ ...newRecord, date: event.target.value })}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition-all focus:border-transparent focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">金额 (¥)</label>
                  <input
                    type="number"
                    min="0"
                    value={newRecord.amount}
                    onChange={event => setNewRecord({ ...newRecord, amount: event.target.value })}
                    placeholder="0"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition-all focus:border-transparent focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">备注</label>
                <input
                  type="text"
                  value={newRecord.note}
                  onChange={event => setNewRecord({ ...newRecord, note: event.target.value })}
                  placeholder={newRecord.type === 'income' ? '例如：某品牌合作结算' : '例如：Dou+ 加热投放'}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition-all focus:border-transparent focus:ring-2 focus:ring-primary"
                />
                {newRecord.type === 'income' && (
                  <p className="mt-1 text-xs text-slate-400">提示：建议写清品牌或合作项目，后续查账更方便。</p>
                )}
              </div>

              <button
                onClick={handleSaveRecord}
                className="mt-2 w-full rounded-xl bg-primary py-3.5 font-semibold text-white shadow-lg shadow-primary/30 transition-all hover:bg-blue-600 active:scale-[0.98]"
              >
                保存记录
              </button>
            </div>
          </div>
        </div>
      )}

      {isAccountModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl">
            <div className="mb-6 flex items-center justify-between">
              <h3 className="text-xl font-bold text-slate-900">{accountModalMode === 'edit' ? '编辑账号封面' : '新增账号'}</h3>
              <button onClick={() => setIsAccountModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">账号名称</label>
                <input
                  type="text"
                  value={accountDraft.name}
                  onChange={event => setAccountDraft(prev => ({ ...prev, name: event.target.value }))}
                  placeholder="例如：旅行主账号"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition-all focus:border-transparent focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">封面截图</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={event => {
                    const file = event.target.files?.[0];
                    if (!file) return;
                    const url = URL.createObjectURL(file);
                    setAccountDraft(prev => ({ ...prev, coverImage: url, coverOffsetY: 50 }));
                  }}
                  className="w-full text-sm text-gray-500 file:mr-3 file:rounded-full file:border-0 file:bg-primary/10 file:px-3 file:py-2 file:text-sm file:font-medium file:text-primary hover:file:bg-primary/20"
                />
                <ImagePositioner
                  image={accountDraft.coverImage}
                  offsetY={accountDraft.coverOffsetY}
                  onChange={offsetY => setAccountDraft(prev => ({ ...prev, coverOffsetY: offsetY }))}
                />
              </div>

              <button
                onClick={handleSaveAccount}
                className="mt-2 w-full rounded-xl bg-primary py-3.5 font-semibold text-white shadow-lg shadow-primary/30 transition-all hover:bg-blue-600 active:scale-[0.98]"
              >
                {accountModalMode === 'edit' ? '保存修改' : '确认添加'}
              </button>
            </div>
          </div>
        </div>
      )}

      {isCalendarOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 p-0 backdrop-blur-sm sm:items-center sm:p-4">
          <div className="w-full max-w-md rounded-t-3xl bg-white p-5 shadow-2xl sm:rounded-3xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900">月度收支</h3>
              <button onClick={() => setIsCalendarOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="mb-4 flex items-center justify-center gap-3">
              <button
                onClick={() => setSelectedYear(prev => prev - 1)}
                className="rounded-full bg-slate-100 p-2 text-slate-600 hover:bg-slate-200"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-lg font-semibold text-slate-900">{selectedYear} 年</span>
              <button
                onClick={() => setSelectedYear(prev => prev + 1)}
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
              {monthRows.map(summary => {
                const isActive = summary.month === selectedMonth;
                return (
                  <button
                    key={`${summary.year}-${summary.month}`}
                    onClick={() => {
                      setSelectedMonth(summary.month);
                      setIsCalendarOpen(false);
                      showToast(`已切换到${summary.year}年${summary.month}月`);
                    }}
                    className={`grid w-full grid-cols-[72px_1fr_1fr] items-center rounded-xl px-3 py-3 text-sm transition-colors ${
                      isActive ? 'bg-primary/10' : 'hover:bg-slate-50'
                    }`}
                  >
                    <span className={`text-left font-semibold ${isActive ? 'text-primary' : 'text-slate-700'}`}>{monthName(summary.month)}</span>
                    <span className="text-right font-semibold text-emerald-600">+¥ {summary.income.toLocaleString('zh-CN')}</span>
                    <span className="text-right font-semibold text-rose-500">-¥ {summary.expense.toLocaleString('zh-CN')}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
