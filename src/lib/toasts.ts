import type { ToastKind } from '../types';
import { uid } from './utils';

export interface ToastAction {
  label: string;
  run: () => void;
}

export interface Toast {
  id: string;
  msg: string;
  kind: ToastKind;
  action?: ToastAction;
}

type Listener = () => void;

let toasts: Toast[] = [];
const listeners = new Set<Listener>();

function emit(): void {
  for (const fn of listeners) fn();
}

export const toastStore = {
  subscribe(fn: Listener): () => void {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
  getSnapshot(): Toast[] {
    return toasts;
  },
};

export function dismissToast(id: string): void {
  toasts = toasts.filter((t) => t.id !== id);
  emit();
}

export function toast(msg: string, kind: ToastKind = '', ms = 2600, action?: ToastAction): void {
  const t: Toast = { id: uid(), msg, kind, action };
  toasts = [...toasts, t];
  emit();
  setTimeout(() => dismissToast(t.id), ms);
}

/** a toast carrying an Undo button gets a longer life so it can actually be used */
export function toastUndo(msg: string, run: () => void, kind: ToastKind = 'warn'): void {
  toast(msg, kind, 7000, { label: 'Undo', run });
}
