import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import { getErrorMessage } from '../utils/errorMessage';
import { NotificationLinkedList, createAsyncQueue } from '../utils/notificationList';

/** Map kind → Bootstrap icon + CSS modifier class */
const KIND_CONFIG = {
  appeal_submitted: { icon: 'bi-chat-square-text', cls: 'notification-type--appeal' },
  appeal_accepted: { icon: 'bi-check-circle', cls: 'notification-type--appeal' },
  appeal_rejected: { icon: 'bi-x-circle', cls: 'notification-type--appeal' },
  internship_created: { icon: 'bi-briefcase', cls: 'notification-type--internship' },
  internship_status: { icon: 'bi-briefcase', cls: 'notification-type--internship' },
  placement_created: { icon: 'bi-trophy', cls: 'notification-type--placement' },
  placement_status: { icon: 'bi-trophy', cls: 'notification-type--placement' },
  general: { icon: 'bi-bell', cls: 'notification-type--general' },
};

function kindCfg(kind) {
  return KIND_CONFIG[(kind || '').toLowerCase()] || KIND_CONFIG.general;
}

function formatWhen(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const now = Date.now();
  const diff = Math.floor((now - d.getTime()) / 1000);
  if (diff < 60) return 'Just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 172800) return 'Yesterday';
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

/** Human-friendly group label */
const GROUP_LABELS = {
  appeal_submitted: 'Appeals',
  appeal_accepted: 'Appeals',
  appeal_rejected: 'Appeals',
  internship_created: 'Internships',
  internship_status: 'Internships',
  placement_created: 'Placements',
  placement_status: 'Placements',
  general: 'General',
};

function groupLabel(kind) {
  return GROUP_LABELS[kind] || 'Other';
}

export default function NotificationBell({ className = '' }) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [bannerError, setBannerError] = useState('');
  const [filter, setFilter] = useState('all'); // 'all' | 'unread'
  const rootRef = useRef(null);
  const listRef = useRef(new NotificationLinkedList());
  const opQueueRef = useRef(createAsyncQueue());
  const prevUnreadRef = useRef(0);

  const refreshCount = useCallback(async () => {
    try {
      const data = await api.get('/notifications/unread-count');
      const count = typeof data?.count === 'number' ? data.count : 0;
      // Subtle visual pulse when new notifications arrive
      if (count > prevUnreadRef.current && prevUnreadRef.current >= 0) {
        const btn = rootRef.current?.querySelector('.notification-bell-btn');
        if (btn) {
          btn.classList.add('notification-bell-bounce');
          setTimeout(() => btn.classList.remove('notification-bell-bounce'), 600);
        }
      }
      prevUnreadRef.current = count;
      setUnread(count);
    } catch {
      /* ignore */
    }
  }, []);

  const loadList = useCallback(async () => {
    setLoading(true);
    setBannerError('');
    try {
      const data = await api.get('/notifications?limit=30');
      const arr = Array.isArray(data?.items) ? data.items : [];
      listRef.current.fromServerList(arr);
      listRef.current.trim(30);
      setItems(listRef.current.toArray());
    } catch (e) {
      listRef.current.clear();
      setItems([]);
      setBannerError(getErrorMessage(e, 'Could not load notifications'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshCount();
    const t = setInterval(refreshCount, 60000);
    return () => clearInterval(t);
  }, [refreshCount]);

  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === 'visible') refreshCount();
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [refreshCount]);

  useEffect(() => {
    if (!open) return undefined;
    let cancelled = false;
    (async () => {
      try {
        await api.post('/notifications/acknowledge', {});
        if (!cancelled) await refreshCount();
      } catch {
        /* ignore */
      }
    })();
    loadList();
    const onDoc = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => {
      cancelled = true;
      document.removeEventListener('mousedown', onDoc);
    };
  }, [open, loadList, refreshCount]);

  // Grouped summary of unread notifications (uses linked list groupByKind)
  const groupedSummary = useMemo(() => {
    const groups = listRef.current.groupByKind(true);
    const merged = {};
    for (const [k, count] of Object.entries(groups)) {
      const label = groupLabel(k);
      merged[label] = (merged[label] || 0) + count;
    }
    return Object.entries(merged).filter(([, c]) => c > 0);
  }, [items]); // re-derive when items change

  const displayItems = useMemo(() => {
    if (filter === 'unread') return listRef.current.filterUnread();
    return items;
  }, [items, filter]);

  const markAllRead = () => {
    opQueueRef.current(async () => {
      try {
        setBannerError('');
        await api.post('/notifications/read-all', {});
        listRef.current.markAllRead();
        setItems(listRef.current.toArray());
        await refreshCount();
      } catch (e) {
        setBannerError(getErrorMessage(e, 'Could not mark all as read'));
      }
    });
  };

  const dismissItem = (n, e) => {
    e.stopPropagation();
    // Remove from linked list (O(1) via Map lookup) — no API call needed
    listRef.current.removeById(n.id);
    setItems(listRef.current.toArray());
  };

  const onItemClick = (n) => {
    opQueueRef.current(async () => {
      try {
        setBannerError('');
        if (!n.read) {
          await api.patch(`/notifications/${n.id}/read`, {});
          listRef.current.updateById(n.id, { read: true });
          setItems(listRef.current.toArray());
          await refreshCount();
        }
      } catch (e) {
        setBannerError(getErrorMessage(e, 'Could not update notification'));
        return;
      }
      setOpen(false);
      if (n.link) navigate(n.link);
    });
  };

  const llUnread = listRef.current.unreadCount;

  return (
    <div className={`notification-bell-wrap ${className}`.trim()} ref={rootRef}>
      <button
        type="button"
        className="notification-bell-btn"
        aria-label={unread > 0 ? `${unread} unread notifications` : 'Notifications'}
        aria-expanded={open}
        aria-haspopup="true"
        onClick={() => setOpen((o) => !o)}
      >
        <i className="bi bi-bell fs-5" aria-hidden />
        {unread > 0 && (
          <span className="notification-bell-badge">
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>
      {open && (
        <div className="notification-dropdown shadow-lg" role="dialog" aria-label="Notifications">
          <div className="notification-dropdown-head">
            <span className="fw-semibold">Notifications</span>
            <div className="d-flex align-items-center gap-2">
              {/* Filter toggle */}
              <div className="notification-filter-tabs">
                <button
                  type="button"
                  className={`notification-filter-tab ${filter === 'all' ? 'active' : ''}`}
                  onClick={() => setFilter('all')}
                >All</button>
                <button
                  type="button"
                  className={`notification-filter-tab ${filter === 'unread' ? 'active' : ''}`}
                  onClick={() => setFilter('unread')}
                >Unread{llUnread > 0 ? ` (${llUnread})` : ''}</button>
              </div>
              {unread > 0 && (
                <button type="button" className="btn btn-link btn-sm p-0" onClick={markAllRead}>
                  Mark all read
                </button>
              )}
            </div>
          </div>

          {/* Grouped summary bar */}
          {groupedSummary.length > 0 && (
            <div className="notification-group-header">
              {groupedSummary.map(([label, count]) => (
                <span key={label} className="notification-group-chip">
                  {count} {label}
                </span>
              ))}
            </div>
          )}

          <div className="notification-dropdown-body">
            {bannerError && (
              <div className="px-3 py-2 small text-danger border-bottom" role="alert">
                {bannerError}
              </div>
            )}
            {loading && (
              <div className="text-center text-muted py-4 small">
                <span className="spinner-border spinner-border-sm me-2" role="status" />
                Loading…
              </div>
            )}
            {!loading && displayItems.length === 0 && !bannerError && (
              <div className="notification-empty px-3 py-4 text-center">
                <div className="notification-empty-icon">
                  <i className="bi bi-bell-slash" aria-hidden />
                </div>
                <p className="text-muted mb-0 small">
                  {filter === 'unread' ? 'All caught up!' : 'No notifications yet.'}
                </p>
              </div>
            )}
            {!loading &&
              displayItems.map((n) => {
                const cfg = kindCfg(n.kind);
                return (
                  <div key={n.id} className={`notification-item-wrap ${n.read ? 'is-read' : ''}`}>
                    <button
                      type="button"
                      className="notification-item"
                      onClick={() => onItemClick(n)}
                    >
                      <div className={`notification-item-icon ${cfg.cls}`}>
                        <i className={`bi ${cfg.icon}`} aria-hidden />
                      </div>
                      <div className="notification-item-content">
                        <div className="notification-item-title">{n.title}</div>
                        {n.body && <div className="notification-item-body">{n.body}</div>}
                        <div className="notification-item-meta">{formatWhen(n.created_at)}</div>
                      </div>
                      {!n.read && <span className="notification-unread-dot" />}
                    </button>
                    <button
                      type="button"
                      className="notification-dismiss"
                      aria-label="Dismiss"
                      onClick={(e) => dismissItem(n, e)}
                    >
                      <i className="bi bi-x" aria-hidden />
                    </button>
                  </div>
                );
              })}
          </div>
        </div>
      )}
    </div>
  );
}
