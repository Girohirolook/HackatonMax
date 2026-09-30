import { useEffect, useState, useCallback } from 'react';
import { useAutoRefresh } from '../lib/useAutoRefresh';
import { useNavigate } from 'react-router-dom';
import { Button, Typography } from '@maxhub/max-ui';
import { fetchMyEvents, type EventCard, type MyEventsResponse } from '../lib/api';
import { useAuth } from '../context/AuthContext';

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
  danger: '#D93025',
  dangerBg: '#FDECEA',
};

const styles = {
  root: { maxWidth: 920, margin: '0 auto', padding: '8px 4px 32px' },
  headerRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 16,
    flexWrap: 'wrap' as const,
  },
  sectionTitle: { fontSize: 15, fontWeight: 600, color: C.text, margin: '20px 0 10px' },
  list: { display: 'flex', flexDirection: 'column' as const, gap: 10 },
  card: {
    display: 'flex',
    gap: 14,
    padding: 14,
    border: `1px solid ${C.border}`,
    borderRadius: 12,
    background: C.card,
  },
  thumb: {
    width: 108,
    height: 108,
    borderRadius: 10,
    overflow: 'hidden',
    flexShrink: 0,
    background: C.muted,
    position: 'relative' as const,
  },
  placeholder: {
    width: '100%',
    height: '100%',
    background: 'linear-gradient(135deg, #EEF1F4 0%, #E2E7EC 100%)',
  },
  photoCount: {
    position: 'absolute' as const,
    right: 6,
    bottom: 6,
    background: 'rgba(0,0,0,0.55)',
    color: '#fff',
    fontSize: 11,
    fontWeight: 600,
    borderRadius: 6,
    padding: '1px 6px',
  },
  name: { fontSize: 16, fontWeight: 600, color: C.text, lineHeight: 1.3 },
  meta: { fontSize: 13, color: C.textSec, marginTop: 2 },
  desc: { fontSize: 13, color: C.textSec, marginTop: 6, lineHeight: 1.45 },
  pill: (kind: 'active' | 'past' | 'warn' | 'ok' | 'err') => ({
    display: 'inline-block',
    fontSize: 11,
    fontWeight: 600,
    padding: '2px 8px',
    borderRadius: 999,
    border: `1px solid ${C.border}`,
    background:
      kind === 'active' ? C.successBg : kind === 'ok' ? C.successBg : kind === 'err' ? C.dangerBg : kind === 'warn' ? C.warnBg : C.muted,
    color:
      kind === 'active' ? C.success : kind === 'ok' ? C.success : kind === 'err' ? C.danger : kind === 'warn' ? C.warn : C.textSec,
    flexShrink: 0,
  }),
  progressTrack: {
    height: 4,
    borderRadius: 2,
    background: '#EEF1F4',
    marginTop: 8,
    overflow: 'hidden',
  },
  progressFill: (pct: number) => ({
    height: '100%',
    width: `${Math.min(100, pct)}%`,
    background: C.accent,
    borderRadius: 2,
  }),
  footer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 8,
    fontSize: 13,
    color: C.textSec,
  },
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

function formatEventDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function excerpt(text: string | null, len = 110): string | null {
  if (!text) return null;
  const t = text.trim();
  return t.length <= len ? t : t.slice(0, len).trimEnd() + '…';
}

const REG_STATUS: Record<string, { text: string; kind: 'warn' | 'ok' | 'err' | 'past' }> = {
  pending: { text: 'На рассмотрении', kind: 'warn' },
  approved: { text: 'Вы приняты', kind: 'ok' },
  rejected: { text: 'Отклонено', kind: 'err' },
  completed: { text: 'Завершено', kind: 'past' },
};

function EventRow({ ev, isOrg }: { ev: EventCard; isOrg: boolean }) {
  const navigate = useNavigate();
  const pct = ev.requiredVolunteersCount
    ? (ev.registeredCount / ev.requiredVolunteersCount) * 100
    : 0;
  const reg = ev.registrationStatus ? REG_STATUS[ev.registrationStatus] : null;

  return (
    <div
      style={{ ...styles.card, cursor: 'pointer' }}
      onClick={() => navigate(`/events/${ev.id}`)}
      role="button"
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={styles.name}>{ev.name}</div>
          <span style={styles.pill(ev.status !== 'completed' ? 'active' : 'past')}>
            {ev.status === 'upcoming' ? 'Предстоит' 
              : ev.status === 'ongoing' ? 'Идёт' 
              : 'Завершено'}
          </span>
          {(ev.pendingCount ?? 0) > 0 && (
            <span style={styles.pill('warn')}>
              Ожидают одобрения: {ev.pendingCount}
            </span>
          )}
        </div>
        <div style={styles.meta}>
          {formatEventDate(ev.eventDate)} · {ev.city}
        </div>
        {excerpt(ev.description) && <div style={styles.desc}>{excerpt(ev.description)}</div>}

        <div style={styles.footer}>
          {isOrg ? (
            <div style={{ flex: 1 }}>
              <span>
                Волонтёры: {ev.registeredCount} из {ev.requiredVolunteersCount}
              </span>
              <div style={styles.progressTrack}>
                <div style={styles.progressFill(pct)} />
              </div>
            </div>
          ) : reg ? (
            <span style={styles.pill(reg.kind)}>{reg.text}</span>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function MyEvents() {
  const { data } = useAuth();
  const navigate = useNavigate();
  const isOrg = data?.user?.role === 'organization_creator';

  const [events, setEvents] = useState<MyEventsResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchMyEvents()
      .then((res) => !cancelled && setEvents(res))
      .catch((err) => console.error('MyEvents load failed:', err))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, []);

  const refresh = useCallback(async () => {
    try {
      const res = await fetchMyEvents();
      setEvents(res);
    } catch {}
  }, []);
  useAutoRefresh(refresh, 20000);

  return (
    <div style={styles.root}>
      <div style={styles.headerRow}>
        <Typography.Headline variant="large-strong">Мои мероприятия</Typography.Headline>
        {isOrg && (
          <Button variant="primary" size="small" onClick={() => navigate('/events/create')}>
            Создать мероприятие
          </Button>
        )}
      </div>

      {loading && <div style={styles.empty}>Загрузка…</div>}

      {!loading && events && (
        <>
          <div style={styles.sectionTitle}>Активные</div>
          {events.active.length === 0 ? (
            <div style={styles.empty}>
              {isOrg
                ? 'Активных мероприятий нет. Создайте первое — кнопка сверху.'
                : 'Вы ещё не записаны на активные мероприятия.'}
            </div>
          ) : (
            <div style={styles.list}>
              {events.active.map((ev) => (
                <EventRow key={ev.id} ev={ev} isOrg={!!isOrg} />
              ))}
            </div>
          )}

          <div style={styles.sectionTitle}>Прошедшие</div>
          {events.past.length === 0 ? (
            <div style={styles.empty}>Прошедших мероприятий пока нет</div>
          ) : (
            <div style={styles.list}>
              {events.past.map((ev) => (
                <EventRow key={ev.id} ev={ev} isOrg={!!isOrg} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default MyEvents;