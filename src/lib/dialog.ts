import { uid } from './utils';

export interface DialogRequest {
  id: string;
  title: string;
  body?: string;
  confirmLabel: string;
  cancelLabel: string;
  danger: boolean;
  resolve: (ok: boolean) => void;
}

type Listener = () => void;

let current: DialogRequest | null = null;
const listeners = new Set<Listener>();

function emit(): void {
  for (const fn of listeners) fn();
}

export const dialogStore = {
  subscribe(fn: Listener): () => void {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
  getSnapshot(): DialogRequest | null {
    return current;
  },
};

export interface ConfirmOptions {
  title: string;
  body?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
}

/**
 * Themed replacement for window.confirm — returns a promise so callers read
 * exactly the same as before, without the native dialog breaking the theme.
 */
export function confirmDialog(opts: ConfirmOptions): Promise<boolean> {
  return new Promise((resolve) => {
    current = {
      id: uid(),
      title: opts.title,
      body: opts.body,
      confirmLabel: opts.confirmLabel ?? 'Confirm',
      cancelLabel: opts.cancelLabel ?? 'Cancel',
      danger: opts.danger ?? false,
      resolve,
    };
    emit();
  });
}

export function settleDialog(ok: boolean): void {
  const c = current;
  current = null;
  emit();
  c?.resolve(ok);
}
