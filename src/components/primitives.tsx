import type { Status } from '../types';
import { slug } from '../lib/utils';

export function Badge({ status }: { status: Status }) {
  return (
    <span className={`badge s-${slug(status)}`}>
      <span className="dot" />
      {status}
    </span>
  );
}

export function TypeTag({ type }: { type: string }) {
  return <span className={`tag ${type.toLowerCase()}`}>{type}</span>;
}
