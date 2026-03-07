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
  onSave: (draft: AccountEditorDraft & { file: File | null }) => Promise<void>;
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
  };

  const handleSubmit = async () => {
    setIsSaving(true);
    try {
      await onSave({
        name,
        coverAssetId,
        coverImageUrl,
        coverOffsetY,
        file,
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
      <div data-testid="account-editor-modal" className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl">
        <div className="mb-6 flex items-center justify-between">
          <h3 className="text-xl font-bold text-slate-900">{title}</h3>
          <button onClick={onClose} className="text-slate-400 transition-colors hover:text-slate-600">
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">账号名称</label>
            <input
              type="text"
              data-testid="account-editor-name-input"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="例如：旅行主账号"
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
              className="w-full text-sm text-slate-500 file:mr-3 file:rounded-full file:border-0 file:bg-primary/10 file:px-3 file:py-2 file:text-sm file:font-medium file:text-primary hover:file:bg-primary/20"
            />
            {coverImageUrl ? (
              <ImagePositioner image={coverImageUrl} offsetY={coverOffsetY} onChange={setCoverOffsetY} />
            ) : null}
          </div>

          <button
            onClick={handleSubmit}
            disabled={isSaving}
            data-testid="account-editor-submit"
            className="mt-2 w-full rounded-xl bg-primary py-3.5 font-semibold text-white shadow-lg shadow-primary/30 transition-all hover:bg-blue-600 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isSaving ? '保存中...' : submitLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
