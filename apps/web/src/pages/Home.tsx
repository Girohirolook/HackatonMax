import { useEffect, useState, useCallback } from 'react';
import { useAutoRefresh } from '../lib/useAutoRefresh';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../context/ToastContext';
import {
  fetchVolunteerHome,
  fetchOrganizationHome,
  type VolunteerHomeResponse,
  type OrganizationHomeResponse,
  type EventCard,
  type RecommendationCard,
} from '../lib/api';
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
};

const styles = {
  root: { maxWidth: 920, margin: '0 auto', padding: '8px 4px 32px' },
  statsRow: { fontSize: 13, color: C.textSec, marginBottom: 18, lineHeight: 1.4 },
  sectionTitle: { fontSize: 15, fontWeight: 600, color: C.text, margin: '4px 0 10px' },
  swipe: {
    display: 'flex',
    gap: 10,
    overflowX: 'auto' as const,
    scrollSnapType: 'x mandatory' as any,
    WebkitOverflowScrolling: 'touch' as any,
    padding: '2px 2px 14px',
  },
  findEventBtn: {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    padding: '18px 20px',
    fontSize: 16,
    fontWeight: 700,
    color: '#fff',
    background: C.accent,
    border: 'none',
    borderRadius: 14,
    cursor: 'pointer',
    boxShadow: '0 6px 16px rgba(0, 119, 255, 0.35)',
  },
  swipeCard: {
    flex: '0 0 250px',
    scrollSnapAlign: 'start' as any,
    background: C.card,
    border: `1px solid ${C.border}`,
    borderRadius: 14,
    padding: 14,
    cursor: 'pointer',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 6,
    boxSizing: 'border-box' as const,
    minHeight: 150,
    minWidth: 0,
  },
  seeAllCard: {
    flex: '0 0 250px',
    scrollSnapAlign: 'start' as any,
    background: C.muted,
    border: `1px dashed ${C.border}`,
    borderRadius: 14,
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    cursor: 'pointer',
    minHeight: 150,
    boxSizing: 'border-box' as const,
    padding: 14,
    textAlign: 'center' as const,
  },
  name: {
    fontSize: 15,
    fontWeight: 600,
    color: C.text,
    lineHeight: 1.3,
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical' as any,
    overflow: 'hidden',
  },
  meta: {
    fontSize: 13,
    color: C.textSec,
    whiteSpace: 'nowrap' as const,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  orgLabel: {
    fontSize: 11,
    color: C.textSec,
    whiteSpace: 'nowrap' as const,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  footer: { marginTop: 'auto', fontSize: 12, color: C.textSec },
  pill: (kind: 'ok' | 'warn' | 'muted') => ({
    display: 'inline-block',
    alignSelf: 'flex-start' as const,
    fontSize: 11,
    fontWeight: 600,
    padding: '2px 8px',
    borderRadius: 999,
    background: kind === 'ok' ? C.successBg : kind === 'warn' ? C.warnBg : C.muted,
    color: kind === 'ok' ? C.success : kind === 'warn' ? C.warn : C.textSec,
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

// Стили главной организации
const orgStyles = {
  countersRow: { display: 'flex', gap: 10, marginBottom: 16 },
  counterCard: {
    flex: 1,
    background: C.card,
    border: `1px solid ${C.border}`,
    borderRadius: 14,
    padding: '16px 14px',
    textAlign: 'center' as const,
  },
  counterValue: { fontSize: 28, fontWeight: 700, color: C.accent, lineHeight: 1.1 },
  counterLabel: { fontSize: 13, color: C.textSec, marginTop: 4 },
  cta: {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    padding: '16px 18px',
    fontSize: 17,
    fontWeight: 700,
    color: '#fff',
    background: C.accent,
    border: 'none',
    borderRadius: 14,
    cursor: 'pointer',
    marginBottom: 20,
    boxShadow: '0 6px 16px rgba(0, 119, 255, 0.35)',
  },
  ctaIcon: { fontSize: 22, fontWeight: 700, lineHeight: 1 },
  eventCard: {
    background: C.card,
    border: `1px solid ${C.border}`,
    borderRadius: 12,
    padding: 14,
    cursor: 'pointer',
  },
  eventName: { fontSize: 16, fontWeight: 600, color: C.text, lineHeight: 1.3 },
  eventMeta: { fontSize: 13, color: C.textSec, marginTop: 4 },
  eventFooter: { fontSize: 13, color: C.textSec, marginTop: 8 },
  progressTrack: {
    height: 4,
    borderRadius: 2,
    background: '#EEF1F4',
    marginTop: 8,
    overflow: 'hidden',
  },
  progressFill: { height: '100%', background: C.accent, borderRadius: 2 },
  statsRow: { display: 'flex', gap: 10, flexWrap: 'wrap' as const },
  statCard: {
    flex: '1 1 140px',
    background: C.card,
    border: `1px solid ${C.border}`,
    borderRadius: 14,
    padding: '14px 12px',
    textAlign: 'center' as const,
  },
  statValue: { fontSize: 22, fontWeight: 700, color: C.text },
  statLabel: { fontSize: 12, color: C.textSec, marginTop: 4 },
    counterCardClickable: {
    cursor: 'pointer',
    borderColor: C.accent,
    background: '#F0F6FF',
  },
};

const REG_STATUS: Record<string, { text: string; kind: 'ok' | 'warn' | 'muted' }> = {
  pending: { text: 'На рассмотрении', kind: 'warn' },
  approved: { text: 'Вы записаны', kind: 'ok' },
  completed: { text: 'Завершено', kind: 'muted' },
};

function plural(n: number, one: string, few: string, many: string): string {
  const m10 = n % 10;
  const m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return one;
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few;
  return many;
}

function formatShortDate(iso: string): string {
  const d = new Date(iso);
  const date = d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
  const time = d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  return `${date}, ${time}`;
}

// ================= ВОЛОНТЁР =================

function EventSwipeCard({ ev }: { ev: EventCard }) {
  const navigate = useNavigate();
  const reg = ev.registrationStatus ? REG_STATUS[ev.registrationStatus] : null;
  return (
    <div style={styles.swipeCard} onClick={() => navigate(`/events/${ev.id}`)} role="button">
      {reg && <span style={styles.pill(reg.kind)}>{reg.text}</span>}
      <div style={styles.name}>{ev.name}</div>
      <div style={styles.meta}>{formatShortDate(ev.eventDate)}</div>
      <div style={styles.meta}>{ev.address ?? ev.city}</div>
    </div>
  );
}

function RecSwipeCard({ ev }: { ev: RecommendationCard }) {
  const navigate = useNavigate();
  const free = Math.max(0, ev.requiredVolunteersCount - ev.registeredCount);
  return (
    <div style={styles.swipeCard} onClick={() => navigate(`/events/${ev.id}`)} role="button">
      <div style={styles.orgLabel}>{ev.organizationName}</div>
      <div style={styles.name}>{ev.name}</div>
      <div style={styles.meta}>{formatShortDate(ev.eventDate)}</div>
      <div style={styles.meta}>{ev.address ?? ev.city}</div>
      <div style={styles.footer}>Свободно мест: {free}</div>
    </div>
  );
}

function SeeAllCard({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <div style={styles.seeAllCard} onClick={onClick} role="button">
      <span style={{ fontSize: 26, color: C.accent, lineHeight: 1 }}>→</span>
      <span style={{ fontSize: 14, fontWeight: 600, color: C.accent }}>{label}</span>
    </div>
  );
}

function VolunteerHome() {
  const navigate = useNavigate();
  const [data, setData] = useState<VolunteerHomeResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const { showError } = useToast();

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchVolunteerHome()
      .then((res) => {
        if (!cancelled) setData(res);
      })
      .catch((err: any) => {
        if (!cancelled) showError(err.message || 'Не удалось загрузить главную');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const refresh = useCallback(async () => {
    try {
      const res = await fetchVolunteerHome();
      setData(res);
    } catch {}
  }, []);
  useAutoRefresh(refresh, 20000);

  if (loading) return <div style={styles.empty}>Загрузка…</div>;
  // if (error) return <div style={styles.empty}>{error}</div>;
  if (!data) return null;

  const { daysSinceRegistration, participationsCount, myEvents, recommendations } = data;

  return (
    <div style={styles.root}>
      <style>{`
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>

      <div style={styles.statsRow}>
        Вы с нами {daysSinceRegistration}{' '}
        {plural(daysSinceRegistration, 'день', 'дня', 'дней')} · {participationsCount}{' '}
        {plural(participationsCount, 'участие', 'участия', 'участий')} в мероприятиях
      </div>

      <div style={styles.sectionTitle}>Мои ближайшие мероприятия</div>
      {myEvents.length === 0 ? (
        <button
          type="button"
          style={styles.findEventBtn}
          onClick={() => navigate('/activities/search')}
        >
          Найти мероприятие
        </button>
      ) : (
        <div className="hide-scrollbar" style={styles.swipe}>
          {myEvents.map((ev) => (
            <EventSwipeCard key={ev.id} ev={ev} />
          ))}
          <SeeAllCard label="Перейти к мероприятиям" onClick={() => navigate('/events/my')} />
        </div>
      )}

      {recommendations.length > 0 && (
        <>
          <div style={styles.sectionTitle}>Рекомендации для вас</div>
          <div className="hide-scrollbar" style={styles.swipe}>
            {recommendations.map((ev) => (
              <RecSwipeCard key={ev.id} ev={ev} />
            ))}
            <SeeAllCard label="Смотреть все" onClick={() => navigate('/activities/search')} />
          </div>
        </>
      )}
    </div>
  );
}

// ================= ОРГАНИЗАЦИЯ =================

function OrgEventRow({ ev }: { ev: EventCard }) {
  const navigate = useNavigate();
  const pct =
    ev.requiredVolunteersCount > 0
      ? (ev.registeredCount / ev.requiredVolunteersCount) * 100
      : 0;
  return (
    <div style={orgStyles.eventCard} onClick={() => navigate(`/events/${ev.id}`)} role="button">
      <div style={orgStyles.eventName}>{ev.name}</div>
      <div style={orgStyles.eventMeta}>
        {formatShortDate(ev.eventDate)} · {ev.address ?? ev.city}
      </div>
      <div style={orgStyles.eventFooter}>
        Волонтёры: {ev.registeredCount} из {ev.requiredVolunteersCount}
      </div>
      <div style={orgStyles.progressTrack}>
        <div style={{ ...orgStyles.progressFill, width: `${Math.min(100, pct)}%` }} />
      </div>
    </div>
  );
}

function OrganizationHome() {
  const navigate = useNavigate();
  const [data, setData] = useState<OrganizationHomeResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchOrganizationHome()
      .then((res) => {
        if (!cancelled) setData(res);
      })
      .catch((err: any) => {
        if (!cancelled) setError(err.message || 'Не удалось загрузить главную');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const refresh = useCallback(async () => {
    try {
      const res = await fetchOrganizationHome();
      setData(res);
    } catch {}
  }, []);
  useAutoRefresh(refresh, 20000);

  if (loading) return <div style={styles.empty}>Загрузка…</div>;
  if (error) return <div style={styles.empty}>{error}</div>;
  if (!data) return null;

  const { activeEventsCount, pendingApplicationsCount, activeEvents, stats } = data;

  return (
    <div style={styles.root}>
      {/* Счётчики в одну строку */}
      <div style={orgStyles.countersRow}>
        <div style={orgStyles.counterCard}>
          <div style={orgStyles.counterValue}>{activeEventsCount}</div>
          <div style={orgStyles.counterLabel}>Активных мероприятий</div>
        </div>
        <div
          style={{ ...orgStyles.counterCard, ...orgStyles.counterCardClickable }}
          onClick={() => navigate('/events/my')}
          role="button"
        >
          <div style={orgStyles.counterValue}>{pendingApplicationsCount}</div>
          <div style={orgStyles.counterLabel}>
            Ожидают одобрения{' '}
            <span style={{ color: C.accent, fontWeight: 700 }}>→</span>
          </div>
        </div>
      </div>

      {/* Главный CTA */}
      <button style={orgStyles.cta} onClick={() => navigate('/events/create')}>
        <span style={orgStyles.ctaIcon}>+</span>
        Создать мероприятие
      </button>

      {/* Наши активные мероприятия */}
      <div style={styles.sectionTitle}>Наши активные мероприятия</div>
      {activeEvents.length === 0 ? (
        <div style={styles.empty}>Активных мероприятий нет — создайте первое</div>
      ) : (
        <>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 10 }}>
            {activeEvents.map((ev) => (
              <OrgEventRow key={ev.id} ev={ev} />
            ))}
          </div>
          {activeEventsCount > activeEvents.length && (
            <button
              style={{
                width: '100%',
                padding: '12px 16px',
                fontSize: 14,
                fontWeight: 600,
                color: C.accent,
                background: C.muted,
                border: `1px dashed ${C.border}`,
                borderRadius: 12,
                cursor: 'pointer',
                marginBottom: 20,
              }}
              onClick={() => navigate('/events/my')}
            >
              Посмотреть все ({activeEventsCount})
            </button>
          )}
        </>
      )}

      {/* Статистика */}
      <div style={styles.sectionTitle}>Статистика</div>
      <div style={orgStyles.statsRow}>
        <div style={orgStyles.statCard}>
          <div style={orgStyles.statValue}>{stats.fillRate}%</div>
          <div style={orgStyles.statLabel}>Процент заполняемости</div>
        </div>
        <div style={orgStyles.statCard}>
          <div style={orgStyles.statValue}>
            {stats.avgFillDays === null ? '—' : `${stats.avgFillDays} дн.`}
          </div>
          <div style={orgStyles.statLabel}>Средний срок набора</div>
        </div>
        <div style={orgStyles.statCard}>
          <div style={orgStyles.statValue}>{stats.repeatVolunteersPercent}%</div>
          <div style={orgStyles.statLabel}>Повторные волонтёры</div>
        </div>
      </div>
    </div>
  );
}

// ================= РОУТИНГ ПО РОЛЯМ =================

function Home() {
  const { data } = useAuth();
  const role = data?.user?.role;

  if (role === 'volunteer') {
    return <VolunteerHome />;
  }
  if (role === 'organization_creator') {
    return <OrganizationHome />;
  }

  return (
    <div style={styles.root}>
      <div style={styles.empty}>Главная страница скоро появится</div>
    </div>
  );
}

export default Home;