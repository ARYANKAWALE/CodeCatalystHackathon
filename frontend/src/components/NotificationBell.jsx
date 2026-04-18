import { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import { getErrorMessage } from '../utils/errorMessage';
import { NotificationLinkedList, createAsyncQueue } from '../utils/notificationList';

function notificationTypeClass(kind) {
  const k = String(kind || 'general').toLowerCase();
  if (k.includes('internship')) return 'notification-type--internship';
  if (k.includes('placement')) return 'notification-type--placement';
  if (k.includes('appeal')) return 'notification-type--appeal';
  return 'notification-type--general';
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
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export default function NotificationBell({ className = '' }) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [bannerError, setBannerError] = useState('');
  const rootRef = useRef(null);
  const listRef = useRef(new NotificationLinkedList());
  const opQueueRef = useRef(createAsyncQueue());

  const refreshCount = useCallback(async () => {
    try {
      const data = await api.get('/notifications/unread-count');
      setUnread(typeof data?.count === 'number' ? data.count : 0);
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
            {unread > 0 && (
              <button type="button" className="btn btn-link btn-sm p-0" onClick={markAllRead}>
                Mark all read
              </button>
            )}
          </div>
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
            {!loading && items.length === 0 && !bannerError && (
              <div className="notification-empty px-3 py-4 text-center small">
                <p className="text-muted mb-2 mb-md-3">No notifications yet.</p>
              </div>
            )}
            {!loading &&
              items.map((n) => (
                <button
                  key={n.id}
                  type="button"
                  className={`notification-item ${n.read ? 'is-read' : ''}`}
                  onClick={() => onItemClick(n)}
                >
                  <div
                    className={`notification-item-type ${notificationTypeClass(n.kind)}`}
                    title={n.kind_label || n.kind || 'Notification'}
                  >
                    {n.kind_label || n.kind || 'Notification'}
                  </div>
                  <div className="notification-item-title">{n.title}</div>
                  {n.body && <div className="notification-item-body">{n.body}</div>}
                  <div className="notification-item-meta">{formatWhen(n.created_at)}</div>
                </button>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
