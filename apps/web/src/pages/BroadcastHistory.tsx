import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Typography } from '@maxhub/max-ui';
import { fetchBroadcastHistory, type BroadcastHistoryItem } from '../lib/api';

const C = {
  accent: '#0077FF',
  text: '#1A1D21',
  textSec: '#6E7681',
  border: '#E6E9ED',
  card: '#FFFFFF',
  muted: '#F7F8FA',
  success: '#1E8E3E',
  successBg: '#E6F4EA',
  warn: '#B06000',
  warnBg: '#FEF7E0',
};

const styles = {
  root: { maxWidth: 920, margin: '0 auto', padding: '8px 4px 32px' },
  topBar: {
    position: 'sticky' as const,
    top: 0,
    background: 'rgba(255,255,255,0.95)',
    backdropFilter: 'blur(8px)',
    zIndex: 20,
    padding: '10px 12px',
    borderBottom: `1px solid ${C.border}`,
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    margin: '-8px -4px 0',
  },
  backButton: {
    background: 'none',
    border: 'none',
    fontSize: 15,
    color: C.accent,
    cursor: 'pointer',
    padding: '6px 10px',
    borderRadius: 8,
    fontWeight: 600,
  },
  card: {
    background: C.card,
    border: `1px solid ${C.border}`,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
  itemMeta: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 8,
    flexWrap: 'wrap' as const,
  },
  itemDate: { fontSize: 13, color: C.textSec },
  itemResult: { fontSize: 13, fontWeight: 600, color: C.text },
  itemText: {
    fontSize: 14,
    lineHeight: 1.5,
    color: C.text,
    whiteSpace: 'pre-wrap' as const,
    background: C.muted,
    border: `1px solid ${C.border}`,
    borderRadius: 10,
    padding: '10px 12px',
  },
  pill: (kind: 'ok' | 'warn' | 'err') => ({
    display: 'inline-block',
    fontSize: 11,
    fontWeight: 600,
    padding: '2px 8px',
    borderRadius: 999,
    background:
      kind === 'ok' ? C.successBg : kind === 'warn' ? C.warnBg : '#FDECEA',
    color:
      kind === 'ok' ? C.success : kind === 'warn' ? C.warn : '#D93025',
    marginLeft: 6,
  }),
  empty: {
    padding: 24,
    textAlign: 'center' as const,
    color: C.textSec,
    fontSize: 14,
    border: `1px dashed ${C.border}`,
    borderRadius: 12,
    background: C.card,
  },
};

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function BroadcastHistory() {
  const { id } = useParams();
  const navigate = useNavigate();
  const eventId = Number(id);

  const [items, setItems] = useState<BroadcastHistoryItem[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!Number.isFinite(eventId) || eventId <= 0) {
      navigate('/', { replace: true });
      return;
    }
    let cancelled = false;
    setLoading(true);
    fetchBroadcastHistory(eventId)
      .then((res) => {
        if (!cancelled) setItems(res.items);
      })
      .catch((err: any) => {
        if (!cancelled) setError(err.message || 'Не удалось загрузить историю');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [eventId, navigate]);

  return (
    <div style={styles.root}>
      <div style={styles.topBar}>
        <button
          type="button"
          style={styles.backButton}
          onClick={() => {
            if (sessionStorage.getItem('opened_via_deeplink')) {
              sessionStorage.removeItem('opened_via_deeplink');
              navigate('/');
            } else {
              navigate(-1);
            }
          }}
        >
          ← Назад
        </button>
      </div>

      <div style={{ padding: '12px 4px' }}>
        <Typography.Headline variant="large-strong" style={{ marginBottom: 12 }}>
          История рассылок
        </Typography.Headline>

        {loading && <div style={styles.empty}>Загрузка…</div>}

        {error && <div style={styles.empty}>{error}</div>}

        {!loading && !error && items && items.length === 0 && (
          <div style={styles.empty}>
            Рассылок пока не было. Отправьте первую из раздела «Заявки волонтёров»
            на странице мероприятия.
          </div>
        )}

        {!loading && !error && items && items.length > 0 &&
          items.map((b) => {
            const allSent = b.sentCount === b.totalCount;
            const kind = b.sentCount === 0 ? 'err' : allSent ? 'ok' : 'warn';
            const label =
              b.sentCount === 0
                ? 'Не доставлено'
                : allSent
                  ? 'Все доставлены'
                  : 'Доставлено не всем';
            return (
              <div key={b.id} style={styles.card}>
                <div style={styles.itemMeta}>
                  <span style={styles.itemDate}>{formatDateTime(b.createdAt)}</span>
                  <span style={styles.itemResult}>
                    {b.sentCount} из {b.totalCount}
                    <span style={styles.pill(kind)}>{label}</span>
                  </span>
                </div>
                <div style={styles.itemText}>{b.text}</div>
              </div>
            );
          })}
      </div>
    </div>
  );
}

export default BroadcastHistory;