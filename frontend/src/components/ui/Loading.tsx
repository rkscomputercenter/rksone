import React, { useEffect, useState } from 'react';
import { RksOneMark } from '../brand/Logo';

/**
 * Loading states.
 *  - PageLoading: where a page's data will appear, drawn as the page it is about to become
 *    (a heading and a ledger of rows), so nothing jumps when the data arrives.
 *  - BootLoading: the whole window, while the app itself starts or a page's code is fetched.
 */

/** Placeholder for a page or panel whose data is on its way. `height` makes it fit a small panel. */
export function PageLoading({ rows = 6, height, label = 'Loading' }: { rows?: number; height?: number; label?: string }) {
  return (
    <div className="load-page" role="status" aria-live="polite" aria-busy="true" style={height ? { minHeight: height } : undefined}>
      <span className="sr-only">{label}</span>
      {!height && <div className="load-bar load-title" aria-hidden="true" />}
      <div className="load-slip" aria-hidden="true">
        {Array.from({ length: rows }, (_, i) => (
          <div className="load-row" key={i}>
            <span className="load-bar" style={{ width: `${62 - ((i * 13) % 28)}%` }} />
            <span className="load-bar load-amt" />
          </div>
        ))}
      </div>
    </div>
  );
}

/** Full-window loader on the brand's night colour: the mark with a ring running around it. */
export function BootLoading() {
  // A free server that has been idle can take a while to answer; say so instead of looking frozen
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setSlow(true), 6000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="load-boot" role="status" aria-live="polite" aria-busy="true">
      <div className="load-ring">
        <RksOneMark size={64} />
      </div>
      <p className="load-boot-text">{slow ? 'The server is waking up. This can take up to a minute.' : 'Getting your counter ready'}</p>
    </div>
  );
}
