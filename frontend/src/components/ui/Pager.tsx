import React from 'react';

/** Previous / next for a paged list. Renders nothing when there is only one page. */
export default function Pager({ page, pages, onPage }: { page: number; pages: number; onPage: (page: number) => void }) {
  if (pages <= 1) return null;
  return (
    <nav className="pager" aria-label="Pages">
      <button className="btn btn-ghost btn-sm" disabled={page <= 1} onClick={() => onPage(page - 1)}>Previous</button>
      <span>Page {page} of {pages}</span>
      <button className="btn btn-ghost btn-sm" disabled={page >= pages} onClick={() => onPage(page + 1)}>Next</button>
    </nav>
  );
}
