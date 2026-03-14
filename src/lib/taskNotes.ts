export const TASK_NOTE_FALLBACK = '暂无备注';

const LEGACY_TASK_LOCATION_FALLBACK = '未指定';

export function formatTaskNote(value: string | null | undefined): string {
  const normalized = String(value ?? '').trim();
  if (!normalized || normalized === LEGACY_TASK_LOCATION_FALLBACK) {
    return TASK_NOTE_FALLBACK;
  }

  return normalized;
}

export function normalizeTaskNoteInput(value: string | null | undefined): string {
  const normalized = String(value ?? '').trim();
  if (!normalized || normalized === LEGACY_TASK_LOCATION_FALLBACK || normalized === TASK_NOTE_FALLBACK) {
    return '';
  }

  return normalized;
}

export function persistTaskNote(value: string | null | undefined): string {
  const normalized = String(value ?? '').trim();
  return normalized || TASK_NOTE_FALLBACK;
}
