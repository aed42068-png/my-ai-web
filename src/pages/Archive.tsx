import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { ChevronLeft, ChevronRight, Edit3, GripVertical, Palette, Plus, Search, Star, Trash2, X } from 'lucide-react';
import { Reorder } from 'motion/react';
import PageGuide from '../components/PageGuide';
import { SwipeableTask } from '../components/SwipeableTask';
import type { Account, Task, TaskInput, TaskPatch, TaskStatus } from '../types';

interface ArchiveProps {
  showToast: (message: string) => void;
  setActiveTab: (tab: 'home' | 'archive' | 'ads') => void;
  accounts: Account[];
  tasks: Task[];
  onCreateTask: (input: TaskInput) => Promise<Task>;
  onUpdateTask: (id: string, input: TaskPatch) => Promise<Task>;
  onDeleteTask: (id: string) => Promise<void>;
  onPersistTaskOrder: (tasks: Task[]) => Promise<void>;
}

const PRESET_COLORS = ['#ef4444', '#f97316', '#f59e0b', '#10b981', '#14b8a6', '#06b6d4', '#3b82f6', '#6366f1'];
const TASK_STATUSES: TaskStatus[] = ['待拍', '已拍', '已发'];
const ARCHIVE_GUIDE_STORAGE_KEY = 'my-ai-web:guide:archive:v1';
const TASK_FIELD_CLASS =
  'h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-slate-900 outline-none transition-all focus:border-transparent focus:ring-2 focus:ring-primary';
const TASK_STATUS_BUTTON_BASE_CLASS = 'h-11 rounded-xl text-sm font-medium transition-all';

const getTodayDate = () => new Date().toISOString().split('T')[0];

export default function Archive({
  showToast,
  setActiveTab,
  accounts,
  tasks,
  onCreateTask,
  onUpdateTask,
  onDeleteTask,
  onPersistTaskOrder,
}: ArchiveProps) {
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth() + 1);
  const [selectedDate, setSelectedDate] = useState(today.getDate());
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isColorModalOpen, setIsColorModalOpen] = useState(false);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [isTaskSortMode, setIsTaskSortMode] = useState(false);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const [taskDraft, setTaskDraft] = useState({
    title: '',
    date: getTodayDate(),
    location: '未指定',
    status: '待拍' as TaskStatus,
    accountId: '',
  });

  const [completedColor, setCompletedColor] = useState(() => localStorage.getItem('archive_completed_color') || '#10b981');
  const [todoColor, setTodoColor] = useState(() => localStorage.getItem('archive_todo_color') || '#f59e0b');
  const [publishedColor, setPublishedColor] = useState(() => localStorage.getItem('archive_published_color') || '#3b82f6');
  const [showCompleted, setShowCompleted] = useState(() => localStorage.getItem('archive_show_completed') !== 'false');
  const [showTodo, setShowTodo] = useState(() => localStorage.getItem('archive_show_todo') !== 'false');
  const [showPublished, setShowPublished] = useState(() => localStorage.getItem('archive_show_published') !== 'false');

  useEffect(() => {
    if (searchQuery.trim() && isTaskSortMode) {
      setIsTaskSortMode(false);
    }
  }, [isTaskSortMode, searchQuery]);

  const accountNameById = useMemo(
    () => new Map(accounts.map((account) => [account.id, account.name])),
    [accounts]
  );

  const selectedDateString = `${viewYear}-${String(viewMonth).padStart(2, '0')}-${String(selectedDate).padStart(2, '0')}`;
  const daysInMonth = new Date(viewYear, viewMonth, 0).getDate();
  const firstDay = new Date(viewYear, viewMonth - 1, 1).getDay();
  const blanks = Array.from({ length: firstDay }, (_, index) => index);
  const days = Array.from({ length: daysInMonth }, (_, index) => index + 1);

  const filteredTasks = useMemo(() => {
    if (searchQuery.trim()) {
      const lowerQuery = searchQuery.trim().toLowerCase();
      return tasks.filter(
        (task) =>
          task.title.toLowerCase().includes(lowerQuery) ||
          task.reviewData.toLowerCase().includes(lowerQuery) ||
          (accountNameById.get(task.accountId) || '').toLowerCase().includes(lowerQuery)
      );
    }

    return tasks.filter((task) => task.date === selectedDateString);
  }, [accountNameById, searchQuery, selectedDateString, tasks]);

  const getTasksForDate = (day: number) => {
    const dateString = `${viewYear}-${String(viewMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return tasks.filter((task) => task.date === dateString);
  };

  const handlePrevMonth = () => {
    const previous = new Date(viewYear, viewMonth - 2, 1);
    setViewYear(previous.getFullYear());
    setViewMonth(previous.getMonth() + 1);
    setSelectedDate(1);
  };

  const handleNextMonth = () => {
    const next = new Date(viewYear, viewMonth, 1);
    setViewYear(next.getFullYear());
    setViewMonth(next.getMonth() + 1);
    setSelectedDate(1);
  };

  const openTaskModal = (task?: Task) => {
    if (task) {
      setEditingTask(task);
      setTaskDraft({
        title: task.title,
        date: task.date,
        location: task.location,
        status: task.status,
        accountId: task.accountId,
      });
    } else {
      setEditingTask(null);
      setTaskDraft({
        title: '',
        date: selectedDateString,
        location: '未指定',
        status: '待拍',
        accountId: accounts[0]?.id ?? '',
      });
    }
    setIsTaskModalOpen(true);
  };

  const handleSaveTask = async () => {
    if (!taskDraft.title.trim()) {
      showToast('请输入任务名称');
      return;
    }

    if (!taskDraft.accountId) {
      showToast('请先选择账号');
      return;
    }

    try {
      if (editingTask) {
        await onUpdateTask(editingTask.id, {
          title: taskDraft.title.trim(),
          date: taskDraft.date,
          location: taskDraft.location.trim() || '未指定',
          status: taskDraft.status,
          accountId: taskDraft.accountId,
        });
        showToast('任务已更新');
      } else {
        await onCreateTask({
          title: taskDraft.title.trim(),
          date: taskDraft.date,
          location: taskDraft.location.trim() || '未指定',
          status: taskDraft.status,
          accountId: taskDraft.accountId,
        });
        showToast('任务已创建');
      }

      setIsTaskModalOpen(false);
      setEditingTask(null);
    } catch (error) {
      showToast(error instanceof Error ? error.message : '保存任务失败');
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

  const handleReorder = async (status: TaskStatus, nextTasks: Task[]) => {
    try {
      await onPersistTaskOrder(nextTasks.map((task, index) => ({ ...task, sortOrder: index, status })));
    } catch (error) {
      showToast(error instanceof Error ? error.message : '保存排序失败');
    }
  };

  const statusColor = (status: TaskStatus) => {
    if (status === '已拍') return completedColor;
    if (status === '待拍') return todoColor;
    return publishedColor;
  };

  const saveColorPreferences = () => {
    localStorage.setItem('archive_completed_color', completedColor);
    localStorage.setItem('archive_todo_color', todoColor);
    localStorage.setItem('archive_published_color', publishedColor);
    localStorage.setItem('archive_show_completed', String(showCompleted));
    localStorage.setItem('archive_show_todo', String(showTodo));
    localStorage.setItem('archive_show_published', String(showPublished));
    setIsColorModalOpen(false);
    showToast('归档显示设置已保存');
  };

  const handleSearchSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSearchQuery((current) => current.trim());
    searchInputRef.current?.blur();
  };

  return (
    <div className="flex h-full flex-col bg-gray-50">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur-md">
        <div className="flex items-center justify-between px-4 pb-2.5 pt-[calc(env(safe-area-inset-top,0px)+0.875rem)]">
          <button data-testid="archive-back-home" onClick={() => setActiveTab('home')} className="flex items-center text-primary transition-colors hover:text-slate-600">
            <ChevronLeft className="h-5 w-5" />
            <span className="ml-1 text-[15px] font-normal">返回</span>
          </button>
          <div className="flex items-center gap-3">
            <button data-testid="archive-open-color-settings" onClick={() => setIsColorModalOpen(true)} className="text-primary transition-colors hover:text-slate-600">
              <Palette className="h-5 w-5" />
            </button>
            <button data-testid="archive-open-task-modal" onClick={() => openTaskModal()} className="text-primary transition-colors hover:text-slate-600">
              <Plus className="h-5 w-5" />
            </button>
            <button
              data-testid="archive-toggle-search"
              onClick={() => setIsSearchOpen((current) => !current)}
              className={`transition-colors ${isSearchOpen ? 'text-slate-600' : 'text-primary hover:text-slate-600'}`}
            >
              <Search className="h-5 w-5" />
            </button>
          </div>
        </div>

        {isSearchOpen ? (
          <div className="px-4 pb-3">
            <form onSubmit={handleSearchSubmit} className="flex items-center gap-2">
              <input
                ref={searchInputRef}
                type="text"
                data-testid="archive-search-input"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="搜索任务、复盘或账号..."
                className="w-full rounded-xl bg-slate-100 px-4 py-2 text-sm outline-none ring-primary transition-all focus:ring-2"
              />
              <button
                type="submit"
                data-testid="archive-search-submit"
                className="shrink-0 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-600"
              >
                确定
              </button>
            </form>
          </div>
        ) : null}
      </header>

      <main className="flex-1 overflow-y-auto pb-24">
        <section className="px-4 pt-3">
          <PageGuide
            storageKey={ARCHIVE_GUIDE_STORAGE_KEY}
            testId="archive-page-guide"
            title="按日期查看任务，也可以直接全局搜索"
            items={[
              '点日历中的日期可以查看当天任务，左右箭头切换月份。',
              '右上角搜索支持按任务标题、复盘内容和账号名称查找。',
              '列表里的任务向左滑可删除；要调整顺序时先点“排序任务”，再拖动卡片。',
            ]}
          />
        </section>

        <section className="border-b border-slate-200 bg-white/70 px-4 pb-3 pt-2.5 backdrop-blur-sm">
          <div className="mb-4 flex items-center justify-between">
            <button className="text-[24px] font-bold tracking-tight text-slate-900">
              {viewYear}年 {viewMonth}月
            </button>
            <div className="flex gap-4 text-primary">
              <button data-testid="archive-prev-month" onClick={handlePrevMonth} className="transition-colors hover:text-slate-600" aria-label="上个月">
                <ChevronLeft className="h-6 w-6" />
              </button>
              <button data-testid="archive-next-month" onClick={handleNextMonth} className="transition-colors hover:text-slate-600" aria-label="下个月">
                <ChevronRight className="h-6 w-6" />
              </button>
            </div>
          </div>

          <div className="mb-2 grid grid-cols-7 text-center">
            {['日', '一', '二', '三', '四', '五', '六'].map((day) => (
              <span key={day} className="text-[11px] font-semibold uppercase text-slate-400">
                {day}
              </span>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-y-3 text-center">
            {blanks.map((blank) => (
              <div key={`blank-${blank}`} className="py-2" />
            ))}

            {days.map((day) => {
              const dayTasks = getTasksForDate(day);
              const completedCount = dayTasks.filter((task) => task.status === '已拍').length;
              const todoCount = dayTasks.filter((task) => task.status === '待拍').length;
              const publishedCount = dayTasks.filter((task) => task.status === '已发').length;
              const hasBigHit = dayTasks.some((task) => task.hitStatus === '爆款');
              const hasSmallHit = dayTasks.some((task) => task.hitStatus === '小爆款');
              const isSelected = !searchQuery && day === selectedDate;

              return (
                <div
                  key={day}
                  onClick={() => {
                    setSelectedDate(day);
                    setSearchQuery('');
                    setIsSearchOpen(false);
                  }}
                  className="relative flex h-14 cursor-pointer flex-col items-center"
                >
                  <div
                    className={`flex h-8 w-8 items-center justify-center rounded-full text-[19px] font-normal transition-colors ${
                      isSelected ? 'bg-primary font-semibold text-white shadow-md' : 'text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    {day}
                  </div>
                  <div className="mt-0.5 flex gap-1">
                    {showCompleted && completedCount > 0 ? <CountBadge color={completedColor} count={completedCount} /> : null}
                    {showTodo && todoCount > 0 ? <CountBadge color={todoColor} count={todoCount} /> : null}
                    {showPublished && publishedCount > 0 ? <CountBadge color={publishedColor} count={publishedCount} /> : null}
                  </div>
                  {hasBigHit ? (
                    <Star className="absolute right-1 top-0 h-2.5 w-2.5 fill-orange-500 text-orange-500" />
                  ) : hasSmallHit ? (
                    <Star className="absolute right-1 top-0 h-2.5 w-2.5 fill-orange-400 text-orange-400" />
                  ) : null}
                </div>
              );
            })}
          </div>
        </section>

        <div className="sticky top-0 z-10 border-b border-slate-200 bg-gray-ios/95 px-4 py-4 backdrop-blur-sm">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
              {searchQuery ? '搜索结果' : `${viewYear}年${viewMonth}月${selectedDate}日`}
            </h2>
            <button
              type="button"
              data-testid="archive-task-sort-toggle"
              onClick={() => setIsTaskSortMode((current) => !current)}
              disabled={Boolean(searchQuery.trim())}
              className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                searchQuery.trim()
                  ? 'cursor-not-allowed bg-slate-100 text-slate-400'
                  : isTaskSortMode
                    ? 'bg-slate-900 text-white hover:bg-slate-700'
                    : 'border border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900'
              }`}
            >
              {isTaskSortMode ? '完成排序' : '排序任务'}
            </button>
          </div>
          {isTaskSortMode && !searchQuery.trim() ? (
            <p
              data-testid="archive-task-sort-mode"
              className="mt-2 text-xs leading-5 text-slate-500"
            >
              拖动同一状态内的任务即可调整顺序，排序会自动保存。
            </p>
          ) : null}
        </div>

        <div className="space-y-6 px-5 pt-4">
          {filteredTasks.length ? (
            TASK_STATUSES.map((status) => {
              const items = filteredTasks.filter((task) => task.status === status);
              if (!items.length) {
                return null;
              }

              return (
                <div key={status} className="space-y-3">
                  <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: statusColor(status) }} />
                    {status}
                  </h3>
                  <div className="overflow-hidden rounded-xl border border-slate-100 bg-white shadow-sm">
                    {searchQuery ? (
                      items.map((task) => (
                        <div key={task.id}>
                          <TaskCard
                            task={task}
                            accountName={accountNameById.get(task.accountId)}
                            color={statusColor(status)}
                            onEdit={() => openTaskModal(task)}
                            onDelete={() => void handleDeleteTask(task)}
                          />
                        </div>
                      ))
                    ) : isTaskSortMode ? (
                      <Reorder.Group axis="y" values={items} onReorder={(nextItems) => void handleReorder(status, nextItems)}>
                        {items.map((task) => (
                          <Reorder.Item key={task.id} value={task}>
                            <TaskCard
                              task={task}
                              accountName={accountNameById.get(task.accountId)}
                              color={statusColor(status)}
                              onEdit={() => openTaskModal(task)}
                              onDelete={() => void handleDeleteTask(task)}
                              draggable
                            />
                          </Reorder.Item>
                        ))}
                      </Reorder.Group>
                    ) : (
                      items.map((task) => (
                        <div key={task.id}>
                          <SwipeableTask task={task} onEdit={openTaskModal} onDelete={handleDeleteTask}>
                            <TaskCard
                              task={task}
                              accountName={accountNameById.get(task.accountId)}
                              color={statusColor(status)}
                              onEdit={() => openTaskModal(task)}
                              onDelete={() => void handleDeleteTask(task)}
                            />
                          </SwipeableTask>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="py-12 text-center">
              {searchQuery ? (
                <div className="text-sm text-slate-400">没有找到相关记录</div>
              ) : tasks.length ? (
                <div className="text-sm text-slate-400">这一天没有记录</div>
              ) : (
                <div className="mx-auto max-w-sm rounded-3xl border border-dashed border-slate-300 bg-white p-6">
                  <div className="text-base font-semibold text-slate-900">归档还是空的</div>
                  <div className="mt-2 text-sm leading-6 text-slate-500">
                    先去主页创建第一个任务，归档页就会按日期自动展示出来。
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab('home')}
                    className="mt-4 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-600"
                  >
                    去主页创建任务
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {isTaskModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div data-testid="archive-task-modal" className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl">
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
                  data-testid="archive-task-title-input"
                  value={taskDraft.title}
                  onChange={(event) => setTaskDraft((prev) => ({ ...prev, title: event.target.value }))}
                  placeholder="例如：周末探店 Vlog"
                  className={TASK_FIELD_CLASS}
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">账号</label>
                <select
                  data-testid="archive-task-account-select"
                  value={taskDraft.accountId}
                  onChange={(event) => setTaskDraft((prev) => ({ ...prev, accountId: event.target.value }))}
                  className={TASK_FIELD_CLASS}
                >
                  {accounts.map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">日期</label>
                  <input
                    type="date"
                    data-testid="archive-task-date-input"
                    value={taskDraft.date}
                    onChange={(event) => setTaskDraft((prev) => ({ ...prev, date: event.target.value }))}
                    className={TASK_FIELD_CLASS}
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">地点</label>
                  <input
                    type="text"
                    data-testid="archive-task-location-input"
                    value={taskDraft.location}
                    onChange={(event) => setTaskDraft((prev) => ({ ...prev, location: event.target.value }))}
                    className={TASK_FIELD_CLASS}
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">状态</label>
                <div className="grid grid-cols-3 gap-2">
                  {TASK_STATUSES.map((status) => (
                    <button
                      type="button"
                      key={status}
                      data-testid={`archive-task-status-${status}`}
                      onClick={() => setTaskDraft((prev) => ({ ...prev, status }))}
                      className={`${TASK_STATUS_BUTTON_BASE_CLASS} ${
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
                data-testid="archive-task-submit"
                className="mt-2 w-full rounded-xl bg-primary py-3.5 font-semibold text-white shadow-lg shadow-primary/30 transition-all hover:bg-blue-600 active:scale-[0.98]"
              >
                {editingTask ? '保存修改' : '创建任务'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {isColorModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div data-testid="archive-color-modal" className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl">
            <div className="mb-6 flex items-center justify-between">
              <h3 className="text-xl font-bold text-slate-900">设置状态显示与颜色</h3>
              <button onClick={() => setIsColorModalOpen(false)} className="text-slate-400 transition-colors hover:text-slate-600">
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="space-y-6">
              <ColorSection title="已拍" testId="archive-color-toggle-completed" checked={showCompleted} onToggle={() => setShowCompleted((prev) => !prev)} value={completedColor} onSelect={setCompletedColor} />
              <ColorSection title="待拍" testId="archive-color-toggle-todo" checked={showTodo} onToggle={() => setShowTodo((prev) => !prev)} value={todoColor} onSelect={setTodoColor} />
              <ColorSection title="已发" testId="archive-color-toggle-published" checked={showPublished} onToggle={() => setShowPublished((prev) => !prev)} value={publishedColor} onSelect={setPublishedColor} />

              <button
                onClick={saveColorPreferences}
                data-testid="archive-color-submit"
                className="mt-4 w-full rounded-xl bg-primary py-3.5 font-semibold text-white shadow-lg shadow-primary/30 transition-all hover:bg-blue-600 active:scale-[0.98]"
              >
                完成
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function CountBadge({ color, count }: { color: string; count: number }) {
  return (
    <div className="flex items-center text-[9px] font-medium" style={{ color }}>
      <div className="mr-0.5 h-1.5 w-1.5 rounded-full" style={{ backgroundColor: color }} />
      {count}
    </div>
  );
}

function ColorSection({
  title,
  testId,
  checked,
  onToggle,
  value,
  onSelect,
}: {
  title: string;
  testId: string;
  checked: boolean;
  onToggle: () => void;
  value: string;
  onSelect: (value: string) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-slate-700">「{title}」状态</label>
        <button
          type="button"
          role="switch"
          aria-checked={checked}
          data-testid={testId}
          onClick={onToggle}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
            checked ? 'bg-primary' : 'bg-slate-200'
          }`}
        >
          <span
            className={`absolute left-[2px] top-[2px] h-5 w-5 rounded-full border bg-white transition-transform ${
              checked ? 'translate-x-full border-white' : 'border-slate-300'
            }`}
          />
        </button>
      </div>

      {checked ? (
        <div className="flex flex-wrap gap-2">
          {PRESET_COLORS.map((color) => (
            <button
              key={color}
              onClick={() => onSelect(color)}
              className={`h-8 w-8 rounded-full border-2 transition-transform ${
                value === color ? 'scale-110 border-slate-900' : 'border-transparent hover:scale-110'
              }`}
              style={{ backgroundColor: color }}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function TaskCard({
  task,
  accountName,
  color,
  onEdit,
  onDelete,
  draggable = false,
}: {
  task: Task;
  accountName?: string;
  color: string;
  onEdit: () => void;
  onDelete: () => void;
  draggable?: boolean;
}) {
  return (
    <div
      data-testid={draggable ? 'archive-sort-task-row' : 'archive-task-card'}
      className={`flex w-full items-center gap-3 p-3.5 transition-colors ${
        draggable ? 'cursor-grab active:cursor-grabbing' : 'hover:bg-slate-50'
      }`}
    >
      {draggable ? (
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500">
          <GripVertical className="h-4 w-4" />
        </div>
      ) : (
        <div className="h-8 w-8 shrink-0" />
      )}
      <div className="h-8 w-1 shrink-0 rounded-full" style={{ backgroundColor: color }} />
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
          {accountName ? <span className="mr-1">{accountName} ·</span> : null}
          {task.date} · {task.location}
        </p>
        {task.reviewData ? (
          <span className="mt-1 inline-block rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-500">有复盘</span>
        ) : null}
      </div>
      {draggable ? (
        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-500">拖动排序</span>
      ) : (
        <div className="flex items-center gap-1">
          <button
            onClick={onEdit}
            data-testid="archive-task-edit"
            aria-label={`编辑任务 ${task.title}`}
            className="rounded-full p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
          >
            <Edit3 className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={onDelete}
            data-testid="archive-task-delete"
            aria-label={`删除任务 ${task.title}`}
            className="rounded-full p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-rose-500"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}
