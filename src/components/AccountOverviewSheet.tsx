import { Check, GripVertical, X } from 'lucide-react';
import { Reorder } from 'motion/react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { getAccountCover } from '../lib/defaults';
import type { Account } from '../types';

interface AccountOverviewSheetProps {
  open: boolean;
  accounts: Account[];
  activeAccountId: string;
  taskCountByAccountId: Map<string, number>;
  onClose: () => void;
  onSelectAccount: (accountId: string) => void;
  onSaveOrder: (accounts: Account[]) => Promise<void>;
}

export default function AccountOverviewSheet({
  open,
  accounts,
  activeAccountId,
  taskCountByAccountId,
  onClose,
  onSelectAccount,
  onSaveOrder,
}: AccountOverviewSheetProps) {
  const [draftAccounts, setDraftAccounts] = useState(accounts);
  const [previewAccountId, setPreviewAccountId] = useState(activeAccountId);
  const [isSaving, setIsSaving] = useState(false);
  const previewAccountIdRef = useRef(previewAccountId);

  useEffect(() => {
    if (!open) {
      return;
    }

    setDraftAccounts(accounts);
    setPreviewAccountId(activeAccountId || accounts[0]?.id || '');
    previewAccountIdRef.current = activeAccountId || accounts[0]?.id || '';
    setIsSaving(false);
  }, [accounts, activeAccountId, open]);

  const orderChanged = useMemo(
    () => accounts.some((account, index) => draftAccounts[index]?.id !== account.id),
    [accounts, draftAccounts]
  );

  const previewAccount =
    draftAccounts.find((account) => account.id === previewAccountId) ??
    draftAccounts[0] ??
    null;

  const handleSubmit = async () => {
    if (previewAccountIdRef.current) {
      onSelectAccount(previewAccountIdRef.current);
    }

    if (!orderChanged) {
      onClose();
      return;
    }

    setIsSaving(true);
    try {
      await onSaveOrder(draftAccounts);
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 backdrop-blur-sm sm:items-center sm:p-4">
      <div
        data-testid="home-account-overview"
        className="flex h-[78vh] w-full max-w-md flex-col rounded-t-3xl bg-white shadow-2xl sm:h-[680px] sm:rounded-3xl"
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div>
            <h3 className="text-xl font-bold text-slate-900">账号一览</h3>
            <p className="mt-1 text-sm text-slate-400">点账号切换内容，按住行拖动可调整顺序</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
            aria-label="关闭账号一览"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          <Reorder.Group axis="y" values={draftAccounts} onReorder={setDraftAccounts} className="space-y-3">
            {draftAccounts.map((account, index) => {
              const isActive = previewAccount?.id === account.id;
              return (
                <Reorder.Item key={account.id} value={account}>
                  <button
                    type="button"
                    data-testid="home-account-overview-item"
                    onClick={() => {
                      previewAccountIdRef.current = account.id;
                      setPreviewAccountId(account.id);
                    }}
                    className={`flex w-full items-center gap-3 rounded-2xl border px-4 py-3 text-left transition-colors ${
                      isActive ? 'border-primary bg-primary/5 shadow-sm' : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <img
                      src={getAccountCover(account, index)}
                      alt={account.name}
                      className="h-12 w-12 rounded-2xl object-cover shadow-sm"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-semibold text-slate-900">{account.name}</div>
                      <div className="mt-1 text-xs text-slate-500">
                        当前任务 {taskCountByAccountId.get(account.id) ?? 0}
                      </div>
                    </div>
                    {isActive ? (
                      <div className="rounded-full bg-primary/10 p-1.5 text-primary">
                        <Check className="h-4 w-4" />
                      </div>
                    ) : null}
                    <GripVertical className="h-4 w-4 shrink-0 text-slate-300" />
                  </button>
                </Reorder.Item>
              );
            })}
          </Reorder.Group>

          {previewAccount ? (
            <div className="mt-5 overflow-hidden rounded-[28px] border border-slate-200 bg-slate-100 shadow-sm">
              <div className="relative h-48">
                <div
                  className="absolute inset-0 bg-cover bg-no-repeat"
                  style={{
                    backgroundImage: `url('${getAccountCover(previewAccount, draftAccounts.findIndex((account) => account.id === previewAccount.id))}')`,
                    backgroundPosition: `center ${previewAccount.coverOffsetY}%`,
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                <div className="absolute bottom-4 left-4 right-4 text-white">
                  <div className="text-xs opacity-80">预览账号</div>
                  <div className="mt-1 text-xl font-semibold">{previewAccount.name}</div>
                  <div className="mt-2 text-xs opacity-80">
                    任务数 {taskCountByAccountId.get(previewAccount.id) ?? 0}
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </div>

        <div className="border-t border-slate-100 px-5 py-4">
          <button
            type="button"
            data-testid="home-account-overview-submit"
            onClick={() => void handleSubmit()}
            disabled={isSaving}
            className="w-full rounded-xl bg-primary py-3 text-sm font-semibold text-white shadow-lg shadow-primary/25 transition-colors hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isSaving ? '保存顺序中...' : orderChanged ? '保存顺序' : '完成'}
          </button>
        </div>
      </div>
    </div>
  );
}
