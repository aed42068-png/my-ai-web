import { useEffect, useEffectEvent, useRef, useState } from 'react';
import Layout from './components/Layout';
import Archive from './pages/Archive';
import Ads from './pages/Ads';
import Home from './pages/Home';
import { api } from './lib/api';
import type {
  Account,
  AccountInput,
  AdRecord,
  AdRecordInput,
  AdRecordPatch,
  Task,
  TaskInput,
  TaskPatch,
  TaskReviewInput,
} from './types';

type ActiveTab = 'home' | 'archive' | 'ads';
type BootstrapCache = {
  version: number;
  accounts: Account[];
  tasks: Task[];
  records: AdRecord[];
  updatedAt: string;
};

type BootstrapCacheState = {
  cache: BootstrapCache | null;
  status: 'hit' | 'miss' | 'expired' | 'invalid';
};

const BOOTSTRAP_CACHE_VERSION = 2;
const BOOTSTRAP_CACHE_TTL_MS = 15 * 60 * 1000;
const BOOTSTRAP_CACHE_KEY = `my-ai-web:bootstrap:v${BOOTSTRAP_CACHE_VERSION}`;
const AUTO_REFRESH_INTERVAL_MS = 60_000;
const AUTO_REFRESH_MIN_GAP_MS = 5_000;

const sortAccounts = (items: Account[]) =>
  [...items].sort((left, right) => left.sortOrder - right.sortOrder || left.createdAt.localeCompare(right.createdAt));

const sortTasks = (items: Task[]) =>
  [...items].sort((left, right) => {
    if (left.date !== right.date) {
      return right.date.localeCompare(left.date);
    }

    if (left.status !== right.status) {
      const order = ['待拍', '已拍', '已发'];
      return order.indexOf(left.status) - order.indexOf(right.status);
    }

    if (left.sortOrder !== right.sortOrder) {
      return left.sortOrder - right.sortOrder;
    }

    return left.createdAt.localeCompare(right.createdAt);
  });

const sortRecords = (items: AdRecord[]) =>
  [...items].sort((left, right) => {
    if (left.date !== right.date) {
      return right.date.localeCompare(left.date);
    }

    return right.createdAt.localeCompare(left.createdAt);
  });

export default function App() {
  const [bootstrapCacheState] = useState<BootstrapCacheState>(() => readBootstrapCache());
  const bootstrapCache = bootstrapCacheState.cache;
  const [activeTab, setActiveTab] = useState<ActiveTab>('home');
  const [toastMessage, setToastMessage] = useState('');
  const [accounts, setAccounts] = useState<Account[]>(() => sortAccounts(bootstrapCache?.accounts ?? []));
  const [tasks, setTasks] = useState<Task[]>(() => sortTasks(bootstrapCache?.tasks ?? []));
  const [records, setRecords] = useState<AdRecord[]>(() => sortRecords(bootstrapCache?.records ?? []));
  const [recordsStatus, setRecordsStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>(() =>
    bootstrapCache?.records ? 'ready' : 'idle'
  );
  const [recordsErrorMessage, setRecordsErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(!bootstrapCache);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [syncIssue, setSyncIssue] = useState('');
  const [lastSyncAt, setLastSyncAt] = useState(bootstrapCache?.updatedAt ?? '');
  const [errorMessage, setErrorMessage] = useState('');
  const toastTimerRef = useRef<number | null>(null);
  const didLoadInitialDataRef = useRef(false);
  const didRequestAdRecordsRef = useRef(false);
  const bootstrapRefreshInFlightRef = useRef(false);
  const lastBootstrapRefreshAtRef = useRef(0);
  const recordsRefreshInFlightRef = useRef(false);
  const lastRecordsRefreshAtRef = useRef(0);

  const showToast = (message: string) => {
    setToastMessage(message);
    if (toastTimerRef.current) {
      window.clearTimeout(toastTimerRef.current);
    }

    toastTimerRef.current = window.setTimeout(() => {
      setToastMessage('');
      toastTimerRef.current = null;
    }, 2200);
  };

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) {
        window.clearTimeout(toastTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!lastSyncAt) {
      return;
    }

    writeBootstrapCache({
      version: BOOTSTRAP_CACHE_VERSION,
      accounts,
      tasks,
      records,
      updatedAt: lastSyncAt,
    });
  }, [accounts, tasks, records, lastSyncAt]);

  const loadInitialData = async ({
    background = false,
    force = false,
  }: {
    background?: boolean;
    force?: boolean;
  } = {}) => {
    if (background) {
      const now = Date.now();
      if (bootstrapRefreshInFlightRef.current) {
        return;
      }

      if (!force && now - lastBootstrapRefreshAtRef.current < AUTO_REFRESH_MIN_GAP_MS) {
        return;
      }

      bootstrapRefreshInFlightRef.current = true;
      lastBootstrapRefreshAtRef.current = now;
    }

    if (background) {
      setIsRefreshing(true);
      setSyncIssue('');
    } else {
      setIsLoading(true);
      setErrorMessage('');
    }

    try {
      const [nextAccounts, nextTasks] = await Promise.all([api.getAccounts(), api.getTasks()]);

      setAccounts(sortAccounts(nextAccounts));
      setTasks(sortTasks(nextTasks));
      setLastSyncAt(new Date().toISOString());
      setSyncIssue('');
    } catch (error) {
      const message = error instanceof Error ? error.message : '加载数据失败';
      if (background) {
        setSyncIssue(message);
      } else {
        setErrorMessage(message);
      }
    } finally {
      if (background) {
        bootstrapRefreshInFlightRef.current = false;
        setIsRefreshing(false);
      } else {
        setIsLoading(false);
      }
    }
  };

  useEffect(() => {
    if (didLoadInitialDataRef.current) {
      return;
    }

    didLoadInitialDataRef.current = true;
    void loadInitialData({ background: Boolean(bootstrapCache), force: Boolean(bootstrapCache) });
  }, [bootstrapCache]);

  const triggerBootstrapRefresh = useEffectEvent(() => {
    if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
      return;
    }

    if (isLoading) {
      return;
    }

    void loadInitialData({ background: true });
  });

  const triggerRecordsRefresh = useEffectEvent(({ force = false }: { force?: boolean } = {}) => {
    if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
      return;
    }

    if (activeTab !== 'ads' || !didRequestAdRecordsRef.current) {
      return;
    }

    void loadAdRecords({ background: true, force });
  });

  useEffect(() => {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      return;
    }

    const handleFocus = () => {
      triggerBootstrapRefresh();
      triggerRecordsRefresh({ force: true });
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        triggerBootstrapRefresh();
        triggerRecordsRefresh({ force: true });
      }
    };

    const intervalId = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        triggerBootstrapRefresh();
        triggerRecordsRefresh();
      }
    }, AUTO_REFRESH_INTERVAL_MS);

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.clearInterval(intervalId);
    };
  }, []);

  const loadAdRecords = async ({
    background = false,
    force = false,
  }: {
    background?: boolean;
    force?: boolean;
  } = {}) => {
    if (background) {
      const now = Date.now();
      if (recordsRefreshInFlightRef.current) {
        return;
      }

      if (!force && now - lastRecordsRefreshAtRef.current < AUTO_REFRESH_MIN_GAP_MS) {
        return;
      }

      recordsRefreshInFlightRef.current = true;
      lastRecordsRefreshAtRef.current = now;
    }

    setRecordsStatus('loading');
    if (!background) {
      setRecordsErrorMessage('');
    }

    try {
      const nextRecords = await api.getAdRecords();
      setRecords(sortRecords(nextRecords));
      setRecordsStatus('ready');
      setRecordsErrorMessage('');
      setLastSyncAt(new Date().toISOString());
    } catch (error) {
      setRecordsErrorMessage(error instanceof Error ? error.message : '加载收益记录失败');
      setRecordsStatus('error');
    } finally {
      if (background) {
        recordsRefreshInFlightRef.current = false;
      }
    }
  };

  useEffect(() => {
    if (activeTab !== 'ads' || didRequestAdRecordsRef.current) {
      return;
    }

    didRequestAdRecordsRef.current = true;
    void loadAdRecords({ background: records.length > 0 });
  }, [activeTab, records.length]);

  const markCacheFresh = () => {
    setLastSyncAt(new Date().toISOString());
  };

  const createAccount = async (input: AccountInput) => {
    const created = await api.createAccount(input);
    setAccounts((prev) => sortAccounts([...prev, created]));
    markCacheFresh();
    return created;
  };

  const updateAccount = async (id: string, input: Partial<AccountInput>) => {
    const updated = await api.updateAccount(id, input);
    setAccounts((prev) => sortAccounts(prev.map((account) => (account.id === id ? updated : account))));
    markCacheFresh();
    return updated;
  };

  const persistAccountOrder = async (orderedAccounts: Account[]) => {
    const normalized = orderedAccounts.map((account, index) => ({
      ...account,
      sortOrder: index,
    }));

    setAccounts(sortAccounts(normalized));
    markCacheFresh();

    try {
      await Promise.all(
        normalized.map((account) =>
          api.updateAccount(account.id, {
            sortOrder: account.sortOrder,
          })
        )
      );
    } catch (error) {
      await loadInitialData();
      throw error;
    }
  };

  const createTask = async (input: TaskInput) => {
    const created = await api.createTask(input);
    setTasks((prev) => sortTasks([...prev, created]));
    markCacheFresh();
    return created;
  };

  const updateTask = async (id: string, input: TaskPatch) => {
    const updated = await api.updateTask(id, input);
    setTasks((prev) => sortTasks(prev.map((task) => (task.id === id ? updated : task))));
    markCacheFresh();
    return updated;
  };

  const deleteTask = async (id: string) => {
    await api.deleteTask(id);
    setTasks((prev) => prev.filter((task) => task.id !== id));
    markCacheFresh();
  };

  const saveTaskReview = async (id: string, input: TaskReviewInput) => {
    const updated = await api.saveTaskReview(id, input);
    setTasks((prev) => sortTasks(prev.map((task) => (task.id === id ? updated : task))));
    markCacheFresh();
    return updated;
  };

  const persistTaskOrder = async (orderedTasks: Task[]) => {
    const normalized = orderedTasks.map((task, index) => ({
      ...task,
      sortOrder: index,
    }));
    const nextById = new Map(normalized.map((task) => [task.id, task]));

    setTasks((prev) => sortTasks(prev.map((task) => nextById.get(task.id) ?? task)));
    markCacheFresh();

    try {
      await Promise.all(
        normalized.map((task) =>
          api.updateTask(task.id, {
            sortOrder: task.sortOrder,
          })
        )
      );
    } catch (error) {
      await loadInitialData();
      throw error;
    }
  };

  const createAdRecord = async (input: AdRecordInput) => {
    const created = await api.createAdRecord(input);
    setRecords((prev) => sortRecords([created, ...prev]));
    setRecordsStatus('ready');
    setRecordsErrorMessage('');
    markCacheFresh();
    return created;
  };

  const updateAdRecord = async (id: string, input: AdRecordPatch) => {
    const updated = await api.updateAdRecord(id, input);
    setRecords((prev) => sortRecords(prev.map((record) => (record.id === id ? updated : record))));
    setRecordsStatus('ready');
    setRecordsErrorMessage('');
    markCacheFresh();
    return updated;
  };

  const deleteAdRecord = async (id: string) => {
    await api.deleteAdRecord(id);
    setRecords((prev) => prev.filter((record) => record.id !== id));
    setRecordsStatus('ready');
    setRecordsErrorMessage('');
    markCacheFresh();
  };

  return (
    <Layout activeTab={activeTab} setActiveTab={setActiveTab}>
      {isLoading ? (
        <BootSkeleton />
      ) : errorMessage ? (
        <div className="flex h-full items-center justify-center bg-slate-50 px-6">
          <div className="max-w-sm rounded-3xl bg-white p-6 text-center shadow-sm ring-1 ring-slate-200">
            <h2 className="text-lg font-semibold text-slate-900">加载失败</h2>
            <p className="mt-2 text-sm text-slate-500">{errorMessage}</p>
            <button
              onClick={() => void loadInitialData()}
              className="mt-5 rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-600"
            >
              重试
            </button>
          </div>
        </div>
      ) : (
        <>
          {activeTab === 'home' && (
            <Home
              showToast={showToast}
              accounts={accounts}
              tasks={tasks}
              onCreateAccount={createAccount}
              onUpdateAccount={updateAccount}
              onPersistAccountOrder={persistAccountOrder}
              onCreateTask={createTask}
              onUpdateTask={updateTask}
              onDeleteTask={deleteTask}
              onSaveTaskReview={saveTaskReview}
              onPersistTaskOrder={persistTaskOrder}
            />
          )}

          {activeTab === 'archive' && (
            <Archive
              showToast={showToast}
              setActiveTab={setActiveTab}
              accounts={accounts}
              tasks={tasks}
              onCreateTask={createTask}
              onUpdateTask={updateTask}
              onDeleteTask={deleteTask}
              onPersistTaskOrder={persistTaskOrder}
            />
          )}

          {activeTab === 'ads' && (
            <Ads
              showToast={showToast}
              accounts={accounts}
              records={records}
              isLoadingRecords={!records.length && (recordsStatus === 'loading' || recordsStatus === 'idle')}
              recordsErrorMessage={recordsStatus === 'error' ? recordsErrorMessage : ''}
              onRetryLoadRecords={() => loadAdRecords()}
              onCreateAccount={createAccount}
              onUpdateAccount={updateAccount}
              onCreateRecord={createAdRecord}
              onUpdateRecord={updateAdRecord}
              onDeleteRecord={deleteAdRecord}
            />
          )}
        </>
      )}

      {!isLoading && (isRefreshing || syncIssue) ? (
        <div className="pointer-events-none fixed left-1/2 top-4 z-40 -translate-x-1/2">
          <div
            className={`rounded-full px-3 py-1.5 text-xs font-medium shadow-sm backdrop-blur-sm ${
              syncIssue ? 'bg-amber-100/95 text-amber-700' : 'bg-slate-900/82 text-white'
            }`}
          >
            {syncIssue ? '同步失败，当前显示的是上次缓存' : '正在同步最新数据'}
          </div>
        </div>
      ) : null}

      {toastMessage ? (
        <div className="fixed left-1/2 top-20 z-50 -translate-x-1/2 rounded-full bg-black/80 px-5 py-2.5 text-sm font-medium text-white shadow-lg backdrop-blur-sm">
          {toastMessage}
        </div>
      ) : null}
    </Layout>
  );
}

function BootSkeleton() {
  return (
    <div className="flex h-full flex-col overflow-hidden bg-slate-50" aria-label="页面加载中">
      <div className="border-b border-slate-200 bg-white/90 px-5 pb-4 pt-12 backdrop-blur-md">
        <div className="h-3 w-28 animate-pulse rounded-full bg-slate-200" />
        <div className="mt-3 h-8 w-44 animate-pulse rounded-full bg-slate-200" />
      </div>

      <div className="flex-1 overflow-hidden px-5 pb-6 pt-4">
        <div className="animate-pulse rounded-[28px] bg-white p-4 shadow-sm ring-1 ring-slate-100">
          <div className="flex items-center justify-between">
            <div className="h-3 w-20 rounded-full bg-slate-200" />
            <div className="h-3 w-16 rounded-full bg-slate-200" />
          </div>
          <div className="mt-4 grid grid-cols-3 gap-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="rounded-2xl bg-slate-100 p-3">
                <div className="h-3 w-10 rounded-full bg-slate-200" />
                <div className="mt-3 h-7 w-8 rounded-full bg-slate-200" />
                <div className="mt-2 h-3 w-12 rounded-full bg-slate-200" />
              </div>
            ))}
          </div>
        </div>

        <div className="mt-5 flex gap-4 overflow-hidden">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="h-44 min-w-[72%] animate-pulse rounded-3xl bg-slate-200" />
          ))}
        </div>

        <div className="mt-6 space-y-4">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="h-4 w-24 animate-pulse rounded-full bg-slate-200" />
                <div className="h-4 w-10 animate-pulse rounded-full bg-slate-200" />
              </div>
              <div className="mt-3 space-y-2">
                <div className="h-14 animate-pulse rounded-2xl bg-slate-100" />
                <div className="h-14 animate-pulse rounded-2xl bg-slate-100" />
              </div>
            </div>
          ))}
        </div>

        <div className="mt-5 text-center text-sm text-slate-400">正在同步账号、任务和投放数据...</div>
      </div>
    </div>
  );
}

function readBootstrapCache(): BootstrapCacheState {
  if (typeof window === 'undefined') {
    return {
      cache: null,
      status: 'miss',
    };
  }

  try {
    const raw = window.localStorage.getItem(BOOTSTRAP_CACHE_KEY);
    if (!raw) {
      return {
        cache: null,
        status: 'miss',
      };
    }

    const parsed = JSON.parse(raw) as Partial<BootstrapCache>;
    const isExpired =
      typeof parsed.updatedAt !== 'string' ||
      Date.now() - new Date(parsed.updatedAt).getTime() > BOOTSTRAP_CACHE_TTL_MS;
    if (parsed.version !== BOOTSTRAP_CACHE_VERSION || !Array.isArray(parsed.accounts) || !Array.isArray(parsed.tasks) || !Array.isArray(parsed.records)) {
      removeBootstrapCache();
      return {
        cache: null,
        status: 'invalid',
      };
    }

    if (isExpired) {
      removeBootstrapCache();
      return {
        cache: null,
        status: 'expired',
      };
    }

    return {
      cache: {
        version: BOOTSTRAP_CACHE_VERSION,
        accounts: sortAccounts(parsed.accounts),
        tasks: sortTasks(parsed.tasks),
        records: sortRecords(parsed.records),
        updatedAt: parsed.updatedAt,
      },
      status: 'hit',
    };
  } catch {
    removeBootstrapCache();
    return {
      cache: null,
      status: 'invalid',
    };
  }
}

function writeBootstrapCache(cache: BootstrapCache): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.setItem(BOOTSTRAP_CACHE_KEY, JSON.stringify(cache));
  } catch {
    // Ignore quota and serialization errors in bootstrap cache writes.
  }
}

function removeBootstrapCache(): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.removeItem(BOOTSTRAP_CACHE_KEY);
  } catch {
    // Ignore cache removal errors in development tooling.
  }
}
