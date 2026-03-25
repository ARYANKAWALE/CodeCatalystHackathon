export default function Pagination({ page, pages, onPageChange }) {
  if (pages <= 1) return null;
  const items = [];
  for (let i = 1; i <= pages; i++) {
    if (i === 1 || i === pages || (i >= page - 2 && i <= page + 2)) {
      items.push(i);
    } else if (items[items.length - 1] !== '...') {
      items.push('...');
    }
  }
  return (
    <nav className="pagination-nav mt-3 d-flex justify-content-between align-items-center flex-wrap gap-2">
      <p className="pagination-summary text-muted small mb-0">Page {page} of {pages}</p>
      <ul className="pagination pagination-placetrack pagination-sm mb-0 flex-wrap">
        <li className={`page-item ${page <= 1 ? 'disabled' : ''}`}>
          <button type="button" className="page-link" onClick={() => onPageChange(page - 1)} aria-label="Previous page">
            Previous
          </button>
        </li>
        {items.map((item, idx) =>
          item === '...' ? (
            <li className="page-item page-item-ellipsis disabled" key={`e${idx}`}>
              <span className="page-link">&hellip;</span>
            </li>
          ) : (
            <li className={`page-item ${item === page ? 'active' : ''}`} key={item}>
              <button type="button" className="page-link" onClick={() => onPageChange(item)} aria-label={`Page ${item}`} aria-current={item === page ? 'page' : undefined}>
                {item}
              </button>
            </li>
          )
        )}
        <li className={`page-item ${page >= pages ? 'disabled' : ''}`}>
          <button type="button" className="page-link" onClick={() => onPageChange(page + 1)} aria-label="Next page">
            Next
          </button>
        </li>
      </ul>
    </nav>
  );
}
