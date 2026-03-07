import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Camera,
  CheckCircle2,
  Edit3,
  Eye,
  GripVertical,
  ListFilter,
  Plus,
  Send,
  Star,
  Trash2,
  Video,
  X,
} from 'lucide-react';
import { Reorder } from 'motion/react';
import AccountEditorModal from '../components/AccountEditorModal';
import { SwipeableTask } from '../components/SwipeableTask';
import { images } from '../data/mockData';
import { uploadAsset } from '../lib/api';
import { getAccountCover, getDefaultAccountImage } from '../lib/defaults';
import type {
  Account,
  AccountInput,
  Task,
  TaskInput,
  TaskPatch,
  TaskReviewInput,
  TaskStatus,
} from '../types';

interface HomeProps {
  showToast: (message: string) => void;
  accounts: Account[];
  tasks: Task[];
  onCreateAccount: (input: AccountInput) => Promise<Account>;
  onUpdateAccount: (id: string, input: Partial<AccountInput>) => Promise<Account>;
  onPersistAccountOrder: (accounts: Account[]) => Promise<void>;
  onCreateTask: (input: TaskInput) => Promise<Task>;
  onUpdateTask: (id: string, input: TaskPatch) => Promise<Task>;
  onDeleteTask: (id: string) => Promise<void>;
  onSaveTaskReview: (id: string, input: TaskReviewInput) => Promise<Task>;
  onPersistTaskOrder: (tasks: Task[]) => Promise<void>;
}

interface TaskDraft {
  title: string;
  date: string;
  location: string;
  status: TaskStatus;
}

const TASK_STATUSES: TaskStatus[] = ['待拍', '已拍', '已发'];
const STATUS_TEST_IDS: Record<TaskStatus, string> = {
  待拍: 'todo',
  已拍: 'shot',
  已发: 'published',
};

const statusMeta: Record<
  TaskStatus,
  {
    title: string;
    icon: typeof Video;
    color: string;
    emptyLabel: string;
    countLabel: string;
  }
> = {
  待拍: {
    title: '今日待拍',
    icon: Video,
    color: 'bg-amber-500',
    emptyLabel: '今天没有待拍任务',
    countLabel: '待拍',
  },
  已拍: {
    title: '今日已拍',
    icon: CheckCircle2,
    color: 'bg-lime-400',
    emptyLabel: '今天还没有完成的拍摄',
    countLabel: '已拍',
  },
  已发: {
    title: '今日已发',
    icon: Send,
    color: 'bg-sky-500',
    emptyLabel: '今天还没有已发布内容',
    countLabel: '已发',
  },
};

const getTodayDate = () => new Date().toISOString().split('T')[0];

export default function Home({
  showToast,
  accounts,
  tasks,
  onCreateAccount,
  onUpdateAccount,
  onPersistAccountOrder,
  onCreateTask,
  onUpdateTask,
  onDeleteTask,
  onSaveTaskReview,
  onPersistTaskOrder,
}: HomeProps) {
  const [activeAccountId, setActiveAccountId] = useState('');
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [taskDraft, setTaskDraft] = useState<TaskDraft>({
    title: '',
    date: getTodayDate(),
    location: '未指定',
    status: '待拍',
  });
  const [reviewingTask, setReviewingTask] = useState<Task | null>(null);
  const [selectedStatusView, setSelectedStatusView] = useState<TaskStatus | null>(null);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [isSubmittingTask, setIsSubmittingTask] = useState(false);
  const accountCardElementsRef = useRef<Record<string, HTMLDivElement | null>>({});

  useEffect(() => {
    if (!accounts.length) {
      setActiveAccountId('');
      return;
    }

    if (!accounts.some((account) => account.id === activeAccountId)) {
      setActiveAccountId(accounts[0].id);
    }
  }, [accounts, activeAccountId]);

  const activeAccount = useMemo(
    () => accounts.find((account) => account.id === activeAccountId) ?? null,
    [accounts, activeAccountId]
  );

  useEffect(() => {
    const activeElement = accountCardElementsRef.current[activeAccountId];
    if (!activeElement) {
      return;
    }

    activeElement.scrollIntoView({
      block: 'nearest',
      inline: 'center',
      behavior: 'smooth',
    });
  }, [activeAccountId]);

  const accountTasks = useMemo(
    () => tasks.filter((task) => task.accountId === activeAccountId),
    [activeAccountId, tasks]
  );

  const groupedTasks = useMemo(
    () =>
      TASK_STATUSES.reduce<Record<TaskStatus, Task[]>>(
        (result, status) => ({
          ...result,
          [status]: accountTasks.filter((task) => task.status === status),
        }),
        {
          待拍: [],
          已拍: [],
          已发: [],
        }
      ),
    [accountTasks]
  );

  const openCreateTaskModal = (status: TaskStatus = '待拍') => {
    setEditingTask(null);
    setTaskDraft({
      title: '',
      date: getTodayDate(),
      location: '未指定',
      status,
    });
    setIsTaskModalOpen(true);
  };

  const openEditTaskModal = (task: Task) => {
    setEditingTask(task);
    setTaskDraft({
      title: task.title,
      date: task.date,
      location: task.location,
      status: task.status,
    });
    setIsTaskModalOpen(true);
  };

  const handleSaveTask = async () => {
    if (!activeAccountId) {
      showToast('请先创建账号');
      return;
    }

    if (!taskDraft.title.trim()) {
      showToast('请输入任务名称');
      return;
    }

    setIsSubmittingTask(true);
    try {
      if (editingTask) {
        await onUpdateTask(editingTask.id, {
          title: taskDraft.title.trim(),
          date: taskDraft.date,
          location: taskDraft.location.trim() || '未指定',
          status: taskDraft.status,
        });
        showToast('任务已更新');
      } else {
        await onCreateTask({
          accountId: activeAccountId,
          title: taskDraft.title.trim(),
          date: taskDraft.date,
          location: taskDraft.location.trim() || '未指定',
          status: taskDraft.status,
        });
        showToast('任务已创建');
      }

      setIsTaskModalOpen(false);
      setEditingTask(null);
    } catch (error) {
      showToast(error instanceof Error ? error.message : '保存任务失败');
    } finally {
      setIsSubmittingTask(false);
    }
  };

  const handleDeleteTask = async (task: Task) => {
    try {
      await onDeleteTask(task.id);
      showToast('任务已删除');
    } catch (error) {
      showToast(error instanceof Error ? error.message : '删除任务失败');
    }
  };

  const handleSaveReview = async () => {
    if (!reviewingTask) {
      return;
    }

    try {
      await onSaveTaskReview(reviewingTask.id, {
        hitStatus: reviewingTask.hitStatus,
        reviewData: reviewingTask.reviewData,
      });
      setReviewingTask(null);
      showToast('复盘记录已保存');
    } catch (error) {
      showToast(error instanceof Error ? error.message : '保存复盘失败');
    }
  };

  const handleCompleteTask = async (task: Task) => {
    try {
      await onUpdateTask(task.id, { status: '已拍' });
      showToast(`已完成：${task.title}`);
    } catch (error) {
      showToast(error instanceof Error ? error.message : '更新任务失败');
    }
  };

  const handleTaskReorder = async (status: TaskStatus, nextTasks: Task[]) => {
    try {
      await onPersistTaskOrder(nextTasks.map((task, index) => ({ ...task, sortOrder: index, status })));
    } catch (error) {
      showToast(error instanceof Error ? error.message : '保存排序失败');
    }
  };

  const handleAccountReorder = async (nextAccounts: Account[]) => {
    try {
      await onPersistAccountOrder(nextAccounts);
    } catch (error) {
      showToast(error instanceof Error ? error.message : '保存账号排序失败');
    }
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
        setActiveAccountId(created.id);
        showToast('账号已新增');
      }

      setIsAccountModalOpen(false);
      setEditingAccount(null);
    } catch (error) {
      showToast(error instanceof Error ? error.message : '保存账号失败');
      throw error;
    }
  };

  const openAccountModal = (account?: Account) => {
    setEditingAccount(account ?? null);
    setIsAccountModalOpen(true);
  };

  const summaryCards: Array<{ status: TaskStatus; color: string; label: string }> = [
    { status: '已拍', color: 'text-lime-500', label: '已拍' },
    { status: '待拍', color: 'text-amber-500', label: '待拍' },
    { status: '已发', color: 'text-sky-500', label: '已发' },
  ];

  return (
    <>
      <div className="sticky top-0 z-30 border-b border-gray-200 bg-white/80 px-5 pb-3 pt-12 backdrop-blur-xl">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Cloudflare Worker 驱动</span>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">账号与任务管理</h1>
          </div>
          <div className="relative h-10 w-10 overflow-hidden rounded-full border border-slate-200 shadow-sm">
            <img alt="User profile" className="h-full w-full object-cover" src={images.avatar} referrerPolicy="no-referrer" />
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pb-32">
        <section className="px-5 pt-4">
          <div className="rounded-[28px] bg-white p-4 shadow-sm ring-1 ring-slate-100">
            <div className="mb-4 flex items-center justify-between px-1">
              <span className="text-xs font-medium text-slate-500">发布概览</span>
              <span data-testid="home-active-account-name" className="text-xs font-medium text-primary">
                {activeAccount?.name || '未选择账号'}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {summaryCards.map(({ status, color, label }) => (
                <button
                  key={status}
                  data-testid={`home-status-chip-${STATUS_TEST_IDS[status]}`}
                  onClick={() => setSelectedStatusView(status)}
                  className="rounded-2xl bg-slate-50 p-3 text-left transition-colors hover:bg-slate-100"
                >
                  <div className={`text-xs font-semibold uppercase tracking-wide ${color}`}>{label}</div>
                  <div className="mt-2 text-2xl font-bold text-slate-900">{groupedTasks[status].length}</div>
                  <div className="mt-1 text-xs text-slate-500">当前账号</div>
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="mt-6">
          <div className="mb-3 flex items-center justify-between px-5">
            <h2 className="text-lg font-bold text-slate-900">账号管理</h2>
            <div className="flex items-center gap-2">
              <button
                onClick={() => activeAccount && openAccountModal(activeAccount)}
                data-testid="home-edit-current-account"
                disabled={!activeAccount}
                className="flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:border-slate-300 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Edit3 className="h-3.5 w-3.5" />
                编辑当前账号
              </button>
              <button
                onClick={() => showToast('拖拽账号标签即可调整顺序')}
                className="flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium text-primary transition-colors hover:bg-primary/10"
              >
                <ListFilter className="h-3.5 w-3.5" />
                排序
              </button>
              <button
                onClick={() => openAccountModal()}
                data-testid="home-add-account"
                className="flex items-center gap-1 rounded-full bg-primary px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-blue-600"
              >
                <Plus className="h-3.5 w-3.5" />
                添加账号
              </button>
            </div>
          </div>

          {accounts.length ? (
            <>
              <div className="overflow-x-auto px-5 pb-2 no-scrollbar">
                <Reorder.Group axis="x" values={accounts} onReorder={handleAccountReorder} className="flex min-w-max items-center gap-5">
                  {accounts.map((account, index) => (
                    <Reorder.Item key={account.id} value={account} className="shrink-0">
                      <button
                        onClick={() => setActiveAccountId(account.id)}
                        className={`flex items-center gap-2 border-b-2 pb-2 text-sm transition-colors ${
                          activeAccountId === account.id
                            ? 'border-slate-900 font-semibold text-slate-900'
                            : 'border-transparent font-medium text-slate-500 hover:text-slate-900'
                        }`}
                      >
                        <img
                          src={getAccountCover(account, index)}
                          alt={account.name}
                          className="h-6 w-6 rounded-full object-cover shadow-sm"
                        />
                        {account.name}
                      </button>
                    </Reorder.Item>
                  ))}
                </Reorder.Group>
              </div>

              <div className="mt-3 flex gap-4 overflow-x-auto px-5 pb-4 no-scrollbar snap-x snap-mandatory">
                {accounts.map((account, index) => (
                  <div
                    key={account.id}
                    ref={(element) => {
                      accountCardElementsRef.current[account.id] = element;
                    }}
                    onClick={() => setActiveAccountId(account.id)}
                    className={`relative h-48 w-[85vw] shrink-0 snap-center overflow-hidden rounded-3xl border shadow-lg transition-all ${
                      activeAccountId === account.id ? 'border-primary ring-2 ring-primary/50' : 'border-gray-200'
                    }`}
                  >
                    <div
                      className="absolute inset-0 bg-cover bg-no-repeat"
                      style={{
                        backgroundImage: `url('${getAccountCover(account, index)}')`,
                        backgroundPosition: `center ${account.coverOffsetY}%`,
                        filter: 'brightness(0.62)',
                      }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/25 to-transparent" />

                    <div className="absolute left-4 top-4 z-10 flex items-center gap-2">
                      <div className="h-9 w-9 rounded-full border border-white/60 bg-white/20 p-0.5">
                        <img src={getAccountCover(account, index)} alt={account.name} className="h-full w-full rounded-full object-cover" />
                      </div>
                      <span className="text-sm font-semibold text-white">{account.name}</span>
                    </div>

                    <button
                      onClick={(event) => {
                        event.stopPropagation();
                        openAccountModal(account);
                      }}
                      data-testid={activeAccountId === account.id ? 'home-edit-active-account' : undefined}
                      className="absolute right-4 top-4 z-10 rounded-full border border-white/20 bg-black/25 p-2 text-white transition-colors hover:bg-black/40"
                    >
                      <Edit3 className="h-4 w-4" />
                    </button>

                    <div className="absolute bottom-4 left-4 right-4 z-10 flex items-end justify-between text-white">
                      <div>
                        <div className="text-xs opacity-75">当前任务</div>
                        <div className="mt-1 text-2xl font-bold">
                          {tasks.filter((task) => task.accountId === account.id).length}
                        </div>
                      </div>
                      <button
                        onClick={(event) => {
                          event.stopPropagation();
                          showToast(`查看${account.name}主页`);
                        }}
                        className="rounded-full border border-white/15 bg-white/15 px-3 py-1.5 text-xs font-medium backdrop-blur-sm transition-colors hover:bg-white/25"
                      >
                        查看主页
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="px-5">
              <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
                还没有账号，先创建一个账号再开始管理任务。
              </div>
            </div>
          )}
        </section>

        <section className="space-y-6 px-5">
          {TASK_STATUSES.map((status) => {
            const items = groupedTasks[status];
            const meta = statusMeta[status];
            const Icon = meta.icon;

            return (
              <div key={status}>
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Icon className="h-5 w-5 text-slate-700" />
                    <h3 className="text-base font-semibold text-slate-800">{meta.title}</h3>
                  </div>
                  <button
                    onClick={() => openCreateTaskModal(status)}
                    data-testid={`home-create-task-${STATUS_TEST_IDS[status]}`}
                    className="text-xs font-medium text-primary transition-colors hover:text-slate-600"
                  >
                    新建
                  </button>
                </div>

                <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
                  {items.length ? (
                    <Reorder.Group axis="y" values={items} onReorder={(nextItems) => void handleTaskReorder(status, nextItems)}>
                      {items.map((task) => (
                        <Reorder.Item key={task.id} value={task}>
                          <SwipeableTask
                            task={task}
                            onEdit={openEditTaskModal}
                            onDelete={handleDeleteTask}
                            onClick={() => (status === '待拍' ? void handleCompleteTask(task) : setReviewingTask(task))}
                          >
                            <div className="flex w-full items-center gap-3 p-3.5 transition-colors hover:bg-slate-50">
                              <GripVertical className="h-4 w-4 shrink-0 text-slate-300" />
                              <div className={`h-8 w-1 shrink-0 rounded-full ${meta.color}`} />
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                  <p className="truncate text-sm font-medium text-slate-900">{task.title}</p>
                                  {task.hitStatus === '爆款' ? (
                                    <Star className="h-3.5 w-3.5 shrink-0 fill-orange-500 text-orange-500" />
                                  ) : task.hitStatus === '小爆款' ? (
                                    <Star className="h-3.5 w-3.5 shrink-0 fill-orange-400 text-orange-400" />
                                  ) : null}
                                </div>
                                <p className="mt-0.5 text-xs text-slate-500">
                                  {task.date} · {task.location}
                                </p>
                              </div>
                              {status === '待拍' ? (
                                <div className="flex h-5 w-5 items-center justify-center rounded-full border-2 border-slate-300">
                                  <CheckCircle2 className="h-3.5 w-3.5 text-primary opacity-0 transition-opacity group-hover:opacity-100" />
                                </div>
                              ) : (
                                <span className="text-xs font-medium text-slate-400">{meta.countLabel}</span>
                              )}
                            </div>
                          </SwipeableTask>
                        </Reorder.Item>
                      ))}
                    </Reorder.Group>
                  ) : (
                    <div className="p-6 text-center text-sm text-slate-400">{meta.emptyLabel}</div>
                  )}
                </div>
              </div>
            );
          })}
        </section>

        <div className="mt-8 flex justify-center pb-8">
          <button
            onClick={() => openCreateTaskModal('待拍')}
            data-testid="home-floating-create-task"
            className="group relative flex h-16 w-16 items-center justify-center rounded-full border border-white/30 bg-white/40 shadow-2xl transition-all duration-300 hover:scale-105 active:scale-95"
          >
            <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-primary/10 to-sky-500/10 opacity-0 transition-opacity group-hover:opacity-100" />
            <Plus className="h-8 w-8 text-primary" />
          </button>
        </div>
      </div>

      {isTaskModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div data-testid="home-task-modal" className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl">
            <div className="mb-6 flex items-center justify-between">
              <h3 className="text-xl font-bold text-slate-900">{editingTask ? '修改任务' : '新建任务'}</h3>
              <button onClick={() => setIsTaskModalOpen(false)} className="text-slate-400 transition-colors hover:text-slate-600">
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">任务名称</label>
                <input
                  type="text"
                  data-testid="home-task-title-input"
                  value={taskDraft.title}
                  onChange={(event) => setTaskDraft((prev) => ({ ...prev, title: event.target.value }))}
                  placeholder="例如：周末探店 Vlog"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition-all focus:border-transparent focus:ring-2 focus:ring-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">日期</label>
                  <input
                    type="date"
                    data-testid="home-task-date-input"
                    value={taskDraft.date}
                    onChange={(event) => setTaskDraft((prev) => ({ ...prev, date: event.target.value }))}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition-all focus:border-transparent focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">地点</label>
                  <input
                    type="text"
                    data-testid="home-task-location-input"
                    value={taskDraft.location}
                    onChange={(event) => setTaskDraft((prev) => ({ ...prev, location: event.target.value }))}
                    placeholder="未指定"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition-all focus:border-transparent focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">状态</label>
                <div className="grid grid-cols-3 gap-2">
                  {TASK_STATUSES.map((status) => (
                    <button
                      key={status}
                      data-testid={`home-task-status-${STATUS_TEST_IDS[status]}`}
                      onClick={() => setTaskDraft((prev) => ({ ...prev, status }))}
                      className={`rounded-xl py-2.5 text-sm font-medium transition-all ${
                        taskDraft.status === status ? 'bg-primary text-white shadow-md' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {status}
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={() => void handleSaveTask()}
                disabled={isSubmittingTask}
                data-testid="home-task-submit"
                className="mt-2 w-full rounded-xl bg-primary py-3.5 font-semibold text-white shadow-lg shadow-primary/30 transition-all hover:bg-blue-600 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isSubmittingTask ? '保存中...' : editingTask ? '保存修改' : '创建任务'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {reviewingTask ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div data-testid="home-review-modal" className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl">
            <div className="mb-6 flex items-center justify-between">
              <h3 className="text-xl font-bold text-slate-900">复盘记录</h3>
              <button onClick={() => setReviewingTask(null)} className="text-slate-400 transition-colors hover:text-slate-600">
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">标记爆款</label>
                <div className="flex gap-3">
                  {[
                    { label: '大爆款', value: '爆款' as const },
                    { label: '小爆款', value: '小爆款' as const },
                    { label: '无', value: null },
                  ].map((item) => (
                    <button
                      key={item.label}
                      data-testid={`home-review-hit-${item.value ?? 'none'}`}
                      onClick={() => setReviewingTask((prev) => (prev ? { ...prev, hitStatus: item.value } : prev))}
                      className={`flex-1 rounded-xl border py-2 text-sm font-medium transition-colors ${
                        reviewingTask.hitStatus === item.value
                          ? 'border-orange-400 bg-orange-400 text-white'
                          : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">复盘内容</label>
                <textarea
                  data-testid="home-review-textarea"
                  value={reviewingTask.reviewData}
                  onChange={(event) =>
                    setReviewingTask((prev) => (prev ? { ...prev, reviewData: event.target.value } : prev))
                  }
                  placeholder="例如：小红书播放量 10w+，封面标题更直接效果更好..."
                  className="h-32 w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition-all focus:border-transparent focus:ring-2 focus:ring-primary"
                />
              </div>

              <button
                onClick={() => void handleSaveReview()}
                data-testid="home-review-submit"
                className="mt-2 w-full rounded-xl bg-primary py-3.5 font-semibold text-white shadow-lg shadow-primary/30 transition-all hover:bg-blue-600 active:scale-[0.98]"
              >
                保存复盘
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {selectedStatusView ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 backdrop-blur-sm sm:items-center sm:p-4">
          <div className="flex h-[80vh] w-full max-w-md flex-col rounded-t-3xl bg-white shadow-2xl sm:h-[600px] sm:rounded-3xl">
            <div className="flex items-center justify-between border-b border-slate-100 p-5">
              <h3 className="text-xl font-bold text-slate-900">{statusMeta[selectedStatusView].title}</h3>
              <button onClick={() => setSelectedStatusView(null)} className="text-slate-400 transition-colors hover:text-slate-600">
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="flex-1 space-y-3 overflow-y-auto p-5">
              {groupedTasks[selectedStatusView].length ? (
                groupedTasks[selectedStatusView].map((task) => (
                  <div
                    key={task.id}
                    data-testid="home-status-task-card"
                    className="flex items-start gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-4"
                  >
                    {selectedStatusView === '待拍' ? (
                      <button
                        onClick={() => void handleCompleteTask(task)}
                        data-testid="home-status-task-complete"
                        aria-label={`完成任务 ${task.title}`}
                        className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 border-slate-300 transition-colors hover:border-primary"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5 text-primary opacity-0 transition-opacity hover:opacity-100" />
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          setReviewingTask(task);
                          setSelectedStatusView(null);
                        }}
                        data-testid="home-status-task-open-review"
                        aria-label={`查看复盘 ${task.title}`}
                        className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 border-slate-300 text-slate-400 transition-colors hover:border-primary hover:text-primary"
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </button>
                    )}

                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <h4 className="text-sm font-semibold text-slate-900">{task.title}</h4>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => {
                              openEditTaskModal(task);
                              setSelectedStatusView(null);
                            }}
                            data-testid="home-status-task-edit"
                            aria-label={`编辑任务 ${task.title}`}
                            className="rounded-full p-1.5 text-slate-400 transition-colors hover:bg-white hover:text-slate-700"
                          >
                            <Edit3 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => void handleDeleteTask(task)}
                            data-testid="home-status-task-delete"
                            aria-label={`删除任务 ${task.title}`}
                            className="rounded-full p-1.5 text-slate-400 transition-colors hover:bg-white hover:text-rose-500"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                        <span className="rounded-full bg-white px-2 py-1">{task.date}</span>
                        <span>{task.location}</span>
                      </div>
                      {task.reviewData ? (
                        <p className="mt-3 rounded-xl bg-white p-3 text-xs text-slate-500">{task.reviewData}</p>
                      ) : null}
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-10 text-center text-sm text-slate-400">暂无内容</div>
              )}
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
    </>
  );
}
