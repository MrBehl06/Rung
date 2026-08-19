import { useRef, useSyncExternalStore } from 'react';
import { dialogStore, settleDialog } from '../lib/dialog';
import { useFocusTrap } from '../hooks/useFocusTrap';

export function ConfirmDialog() {
  const req = useSyncExternalStore(dialogStore.subscribe, dialogStore.getSnapshot);
  const ref = useRef<HTMLDivElement>(null);
  useFocusTrap(ref, () => settleDialog(false));

  if (!req) return null;

  return (
    <div className="ovl" onClick={(e) => e.target === e.currentTarget && settleDialog(false)}>
      <div
        ref={ref}
        className="modal dlg"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="dlg-t"
        tabIndex={-1}
      >
        <div className="body">
          <h3 id="dlg-t" className="dlg-t">
            {req.title}
          </h3>
          {req.body ? <p className="dlg-b">{req.body}</p> : null}
        </div>
        <footer>
          <button className="btn" onClick={() => settleDialog(false)}>
            {req.cancelLabel}
          </button>
          <button
            className={req.danger ? 'btn danger-solid' : 'btn primary'}
            onClick={() => settleDialog(true)}
          >
            {req.confirmLabel}
          </button>
        </footer>
      </div>
    </div>
  );
}
