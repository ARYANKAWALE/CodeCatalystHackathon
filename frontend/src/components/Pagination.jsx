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
    <nav className="mt-3 d-flex justify-content-between align-items-center flex-wrap gap-2">
      <p className="text-muted small mb-0">Page {page} of {pages}</p>
      <ul className="pagination pagination-sm mb-0 flex-wrap">
        <li className={`page-item ${page <= 1 ? 'disabled' : ''}`}>
          <button className="page-link" onClick={() => onPageChange(page - 1)}>Previous</button>
        </li>
        {items.map((item, idx) =>
          item === '...' ? (
            <li className="page-item disabled" key={`e${idx}`}><span className="page-link">&hellip;</span></li>
          ) : (
            <li className={`page-item ${item === page ? 'active' : ''}`} key={item}>
              <button className="page-link" onClick={() => onPageChange(item)}>{item}</button>
            </li>
          )
        )}
        <li className={`page-item ${page >= pages ? 'disabled' : ''}`}>
          <button className="page-link" onClick={() => onPageChange(page + 1)}>Next</button>
        </li>
      </ul>
    </nav>
  );
}
