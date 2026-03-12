import { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import ImagePositioner from './ImagePositioner';

interface AccountEditorDraft {
  name: string;
  coverAssetId?: string | null;
  coverImageUrl: string;
  coverOffsetY: number;
}

interface AccountEditorModalProps {
  open: boolean;
  title: string;
  submitLabel: string;
  initialDraft: AccountEditorDraft;
  fallbackImage: string;
  onClose: () => void;
  onSave: (
    draft: AccountEditorDraft & { file: File | null },
    controls: { setSavePhase: (phase: 'uploading' | 'saving') => void }
  ) => Promise<void>;
}

export default function AccountEditorModal({
  open,
  title,
  submitLabel,
  initialDraft,
  fallbackImage,
  onClose,
  onSave,
}: AccountEditorModalProps) {
  const [name, setName] = useState(initialDraft.name);
  const [coverAssetId, setCoverAssetId] = useState<string | null>(initialDraft.coverAssetId ?? null);
  const [coverImageUrl, setCoverImageUrl] = useState(initialDraft.coverImageUrl || fallbackImage);
  const [coverOffsetY, setCoverOffsetY] = useState(initialDraft.coverOffsetY);
  const [file, setFile] = useState<File | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [savePhase, setSavePhase] = useState<'uploading' | 'saving'>('saving');
  const [isCoverPositionConfirmed, setIsCoverPositionConfirmed] = useState(true);
  const previewUrlRef = useRef<string | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    setName(initialDraft.name);
    setCoverAssetId(initialDraft.coverAssetId ?? null);
    setCoverImageUrl(initialDraft.coverImageUrl || fallbackImage);
    setCoverOffsetY(initialDraft.coverOffsetY);
    setFile(null);
    setSavePhase('saving');
    setIsCoverPositionConfirmed(true);
  }, [fallbackImage, initialDraft, open]);

  useEffect(() => {
    return () => {
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
      }
    };
  }, []);

  if (!open) {
    return null;
  }

  const handleFileChange = (nextFile: File | null) => {
    if (!nextFile) {
      return;
    }

    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
    }

    const previewUrl = URL.createObjectURL(nextFile);
    previewUrlRef.current = previewUrl;
    setFile(nextFile);
    setCoverAssetId(null);
    setCoverImageUrl(previewUrl);
    setCoverOffsetY(50);
    setIsCoverPositionConfirmed(false);
  };

  const handleOffsetChange = (nextOffsetY: number) => {
    setCoverOffsetY(nextOffsetY);
    if (file) {
      setIsCoverPositionConfirmed(false);
    }
  };

  const requiresCoverConfirmation = Boolean(file) && !isCoverPositionConfirmed;

  const handleSubmit = async () => {
    if (requiresCoverConfirmation) {
      return;
    }

    setIsSaving(true);
    setSavePhase(file ? 'uploading' : 'saving');
    try {
      await onSave({
        name,
        coverAssetId,
        coverImageUrl,
        coverOffsetY,
        file,
      }, {
        setSavePhase,
      });

      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
        previewUrlRef.current = null;
      }
    } catch {
      return;
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div
        data-testid="account-editor-modal"
        className="max-h-[90vh] w-full max-w-sm overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl"
      >
        <div className="mb-6 flex items-center justify-between">
          <h3 className="text-xl font-bold text-slate-900">{title}</h3>
          <button
            onClick={onClose}
            disabled={isSaving}
            className="text-slate-400 transition-colors hover:text-slate-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="space-y-4">
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 shadow-sm">
            <div className="relative aspect-[16/10]">
              <div
                data-testid="account-editor-cover-preview"
                className="absolute inset-0 bg-cover bg-no-repeat"
                style={{ backgroundImage: `url('${coverImageUrl}')`, backgroundPosition: `center ${coverOffsetY}%` }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
              <div className="absolute left-4 top-4 rounded-full bg-white/85 px-2.5 py-1 text-[11px] font-semibold text-slate-700 backdrop-blur-sm">
                实时预览
              </div>
              <div className="absolute bottom-4 left-4 right-4">
                <div className="truncate text-lg font-semibold text-white">{name.trim() || '未命名账号'}</div>
                <div className="mt-1 text-xs text-white/80">保存后会同步更新到账号卡片和主页预览</div>
              </div>
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">账号名称</label>
            <input
              type="text"
              data-testid="account-editor-name-input"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="例如：旅行主账号"
              disabled={isSaving}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition-all focus:border-transparent focus:ring-2 focus:ring-primary"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">封面截图</label>
            <input
              type="file"
              data-testid="account-editor-file-input"
              accept="image/*"
              onChange={(event) => handleFileChange(event.target.files?.[0] ?? null)}
              disabled={isSaving}
              className="w-full text-sm text-slate-500 file:mr-3 file:rounded-full file:border-0 file:bg-primary/10 file:px-3 file:py-2 file:text-sm file:font-medium file:text-primary hover:file:bg-primary/20"
            />
            {coverImageUrl ? (
              <ImagePositioner image={coverImageUrl} offsetY={coverOffsetY} onChange={handleOffsetChange} />
            ) : null}
            {file ? (
              <div className="mt-3 space-y-2">
                <button
                  type="button"
                  data-testid="account-editor-confirm-cover"
                  onClick={() => setIsCoverPositionConfirmed(true)}
                  disabled={isSaving}
                  className={`w-full rounded-xl border px-4 py-2.5 text-sm font-semibold transition-colors ${
                    isCoverPositionConfirmed
                      ? 'border-emerald-200 bg-emerald-50 text-emerald-600'
                      : 'border-primary/20 bg-primary/10 text-primary hover:bg-primary/15'
                  } disabled:cursor-not-allowed disabled:opacity-70`}
                >
                  {isCoverPositionConfirmed ? '封面位置已确定' : '确定封面位置'}
                </button>
                <p className={`text-xs ${isCoverPositionConfirmed ? 'text-slate-500' : 'text-amber-600'}`}>
                  {isCoverPositionConfirmed ? '你可以继续保存账号信息。' : '拖动满意后，请先点击“确定封面位置”。'}
                </p>
              </div>
            ) : null}
          </div>

          <button
            onClick={handleSubmit}
            disabled={isSaving || requiresCoverConfirmation}
            data-testid="account-editor-submit"
            className="mt-2 w-full rounded-xl bg-primary py-3.5 font-semibold text-white shadow-lg shadow-primary/30 transition-all hover:bg-blue-600 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isSaving ? (savePhase === 'uploading' ? '上传封面中...' : '保存账号中...') : submitLabel}
          </button>

          {isSaving ? (
            <p data-testid="account-editor-saving-hint" className="text-center text-xs text-slate-500">
              {savePhase === 'uploading' ? '图片正在上传，请不要关闭页面' : '账号信息正在保存，请稍候'}
            </p>
          ) : requiresCoverConfirmation ? (
            <p data-testid="account-editor-saving-hint" className="text-center text-xs text-amber-600">
              请先确认封面位置，再完成保存。
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
