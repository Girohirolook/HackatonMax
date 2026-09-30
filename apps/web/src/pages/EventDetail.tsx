import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useParams } from 'react-router-dom';
import { approveAllApplications, deleteEvent } from '../lib/api';
import { useAutoRefresh } from '../lib/useAutoRefresh';
import { useAuth } from '../context/AuthContext';
import { Button } from '@maxhub/max-ui';
import { useToast } from '../context/ToastContext';
import {
  fetchEventDetails,
  registerForEvent,
  cancelRegistration,
  fetchApplications,
  applicationAction,
  broadcastToApproved,
  deleteApplication,
  type EventDetails,
  type ApplicationItem,
} from '../lib/api';

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
  root: { maxWidth: 920, margin: '0 auto', padding: '8px 4px 120px' },
  topBar: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '10px 0',
    marginBottom: 12,
  },
  appDeleteBtn: {
    background: 'none',
    border: 'none',
    fontSize: 16,
    color: C.danger,
    cursor: 'pointer',
    padding: '4px 6px',
    borderRadius: 6,
    lineHeight: 1,
    flexShrink: 0,
  },
  shareButton: {
    background: 'none',
    border: `1px solid ${C.border}`,
    fontSize: 13,
    color: C.accent,
    cursor: 'pointer',
    padding: '6px 12px',
    borderRadius: 8,
    fontWeight: 600,
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
  },
  historyButton: {
    background: 'none',
    border: `1px solid ${C.border}`,
    fontSize: 13,
    color: C.accent,
    cursor: 'pointer',
    padding: '6px 12px',
    borderRadius: 8,
    fontWeight: 600,
    marginLeft: 'auto',
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
  broadcastTrigger: {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '6px 12px',
    fontSize: 12,
    fontWeight: 600,
    color: C.accent,
    background: '#F0F6FF',
    border: `1px solid ${C.accent}`,
    borderRadius: 8,
    cursor: 'pointer',
    whiteSpace: 'nowrap' as const,
    flexShrink: 0,
  },
  tabsRow: {
    display: 'flex',
    gap: 6,
    marginBottom: 10,
    flexWrap: 'wrap' as const,
  },
  tab: (active: boolean) => ({
    padding: '6px 12px',
    fontSize: 13,
    fontWeight: 600,
    borderRadius: 999,
    border: `1px solid ${active ? C.accent : C.border}`,
    background: active ? '#F0F6FF' : '#fff',
    color: active ? C.accent : C.textSec,
    cursor: 'pointer',
    whiteSpace: 'nowrap' as const,
  }),
  appsScroll: {
    maxHeight: 340,
    overflowY: 'auto' as const,
  },
  appsScrollWrapper: { position: 'relative' as const },
  scrollFadeTop: {
    position: 'absolute' as const,
    top: 0,
    left: 0,
    right: 0,
    height: 28,
    background: 'linear-gradient(to bottom, rgba(255,255,255,0.95), rgba(255,255,255,0))',
    pointerEvents: 'none' as const,
    zIndex: 2,
  },
  scrollFadeBottom: {
    position: 'absolute' as const,
    bottom: 0,
    left: 0,
    right: 0,
    height: 28,
    background: 'linear-gradient(to top, rgba(255,255,255,0.95), rgba(255,255,255,0))',
    pointerEvents: 'none' as const,
    zIndex: 2,
  },
    addressLink: {
    fontSize: 14,
    color: C.accent,
    textDecoration: 'none',
    marginBottom: 4,
    display: 'inline-block',
  },
  orgCard: {
    background: C.card,
    border: `1px solid ${C.border}`,
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
    cursor: 'pointer',
    transition: 'border-color 0.2s, box-shadow 0.2s',
  },
  dangerButton: {
    flex: 1,
    padding: '12px 20px',
    fontSize: 15,
    fontWeight: 600,
    color: '#fff',
    background: C.danger,
    border: 'none',
    borderRadius: 10,
    cursor: 'pointer',
  },
  modalPrimaryBtn: {
    flex: 1,
    padding: '12px 20px',
    fontSize: 15,
    fontWeight: 600,
    color: '#fff',
    background: C.accent,
    border: 'none',
    borderRadius: 10,
    cursor: 'pointer',
  },
  modalSecondaryBtn: {
    padding: '12px 20px',
    fontSize: 15,
    fontWeight: 600,
    color: C.text,
    background: C.muted,
    border: `1px solid ${C.border}`,
    borderRadius: 10,
    cursor: 'pointer',
  },
  disabledBtn: {
    opacity: 0.5,
    cursor: 'not-allowed' as const,
  },
  card: {
    background: C.card,
    border: `1px solid ${C.border}`,
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
  },
  title: { fontSize: 20, fontWeight: 600, color: C.text, lineHeight: 1.3, marginBottom: 12 },
  progressSection: {
    marginBottom: 12,
  },
  progressLabel: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  progressLabelText: { fontSize: 14, color: C.textSec },
  progressLabelValue: { fontSize: 14, fontWeight: 600, color: C.text },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    background: '#EEF1F4',
    overflow: 'hidden',
  },
  progressFill: (pct: number) => ({
    height: '100%',
    width: `${Math.min(100, pct)}%`,
    background: C.accent,
    borderRadius: 3,
    transition: 'width 0.3s ease',
  }),
  metaRow: { fontSize: 14, color: C.textSec, marginBottom: 4 },
  sectionTitle: { fontSize: 15, fontWeight: 600, color: C.text, margin: '4px 0 8px' },
  sectionHead: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    margin: '4px 0 8px',
  },
  body: { fontSize: 14, lineHeight: 1.55, color: C.text, whiteSpace: 'pre-wrap' as const },
  orgRow: { 
    display: 'flex', 
    alignItems: 'center', 
    gap: 12,
  },
  orgChevron: {
    marginLeft: 'auto',
    fontSize: 18,
    color: C.textSec,
    fontWeight: 600,
  },
  orgAvatar: {
    width: 44,
    height: 44,
    borderRadius: '50%',
    background: C.accent,
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 16,
    fontWeight: 600,
    flexShrink: 0,
  },
  orgName: { fontSize: 15, fontWeight: 600, color: C.text },
  orgMeta: { fontSize: 13, color: C.textSec, marginTop: 2 },
  pill: (kind: 'active' | 'past' | 'warn' | 'ok' | 'err' | 'full') => ({
    display: 'inline-block',
    fontSize: 12,
    fontWeight: 600,
    padding: '3px 10px',
    borderRadius: 999,
    border: `1px solid ${C.border}`,
    background:
      kind === 'active' ? C.successBg
        : kind === 'ok' ? C.successBg
        : kind === 'err' ? C.dangerBg
        : kind === 'full' ? C.dangerBg
        : kind === 'warn' ? C.warnBg
        : C.muted,
    color:
      kind === 'active' ? C.success
        : kind === 'ok' ? C.success
        : kind === 'err' ? C.danger
        : kind === 'full' ? C.danger
        : kind === 'warn' ? C.warn
        : C.textSec,
    marginRight: 6,
    marginBottom: 4,
  }),
  bottomBar: {
    position: 'fixed' as const,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(255,255,255,0.98)',
    backdropFilter: 'blur(8px)',
    borderTop: `1px solid ${C.border}`,
    padding: '10px 12px',
    zIndex: 30,
    display: 'flex',
    gap: 8,
    alignItems: 'center',
  },
  bottomInfo: { flex: 1, fontSize: 13, color: C.textSec },
  empty: {
    padding: 24,
    textAlign: 'center' as const,
    color: C.textSec,
    fontSize: 14,
    border: `1px dashed ${C.border}`,
    borderRadius: 12,
    background: C.card,
  },
  appRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    padding: '10px 0',
    borderBottom: `1px solid ${C.border}`,
    flexWrap: 'wrap' as const,
  },
  appRowLast: { borderBottom: 'none' },
  appName: { fontSize: 14, fontWeight: 600, color: C.text },
  appMeta: { fontSize: 12, color: C.textSec, marginTop: 2 },
  appActions: { display: 'flex', gap: 6 },
  overlay: {
    position: 'fixed' as const,
    inset: 0,
    background: 'rgba(0,0,0,0.45)',
    zIndex: 100,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  modal: {
    width: '100%',
    maxWidth: 480,
    background: C.card,
    border: `1px solid ${C.border}`,
    borderRadius: 14,
    padding: 20,
    boxShadow: '0 12px 40px rgba(0,0,0,0.2)',
  },
  modalTitle: { fontSize: 16, fontWeight: 600, color: C.text, marginBottom: 4 },
  modalHint: { fontSize: 13, color: C.textSec, marginBottom: 12 },
  broadcastTextarea: {
    width: '100%',
    minHeight: 100,
    padding: '10px 12px',
    fontSize: 14,
    color: C.text,
    border: `1px solid ${C.border}`,
    borderRadius: 10,
    boxSizing: 'border-box' as const,
    resize: 'vertical' as const,
    outline: 'none',
    background: '#fff',
  },
  modalButtons: { display: 'flex', gap: 8, marginTop: 12 },
  toast: {
    position: 'fixed' as const,
    top: 12,
    left: '50%',
    transform: 'translateX(-50%)',
    zIndex: 200,
    background: C.danger,
    color: '#fff',
    fontSize: 14,
    fontWeight: 600,
    padding: '10px 18px',
    borderRadius: 10,
    boxShadow: '0 6px 20px rgba(0,0,0,0.25)',
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

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
}

function formatShortDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' });
}

function initialsOf(s: string): string {
  return s.trim().charAt(0).toUpperCase() || '?';
}

const APP_STATUS: Record<string, { text: string; kind: 'warn' | 'ok' | 'err' | 'past' }> = {
  pending: { text: 'На рассмотрении', kind: 'warn' },
  approved: { text: 'Одобрен', kind: 'ok' },
  rejected: { text: 'Отклонён', kind: 'err' },
  completed: { text: 'Завершено', kind: 'past' },
};

function EventDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const eventId = Number(id);
  const { data } = useAuth();
  const isOrg = data?.user?.role === 'organization_creator';

  const [event, setEvent] = useState<EventDetails | null>(null);
  const [apps, setApps] = useState<ApplicationItem[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionInProgress, setActionInProgress] = useState(false);

  const [deleteAppTarget, setDeleteAppTarget] = useState<ApplicationItem | null>(null);
  const [deleteAppInProgress, setDeleteAppInProgress] = useState(false);

  const [broadcastOpen, setBroadcastOpen] = useState(false);
  const [broadcastText, setBroadcastText] = useState('');
  const [broadcastSending, setBroadcastSending] = useState(false);

  const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [confirmApproveAll, setConfirmApproveAll] = useState(false);
  const [approveAllInProgress, setApproveAllInProgress] = useState(false);

  const appsScrollRef = useRef<HTMLDivElement | null>(null);
  const [scrollIndicators, setScrollIndicators] = useState({ top: false, bottom: false });

  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleteInProgress, setDeleteInProgress] = useState(false);

  const updateScrollIndicators = useCallback(() => {
    const el = appsScrollRef.current;
    if (!el) return;
    const top = el.scrollTop > 0;
    const bottom = el.scrollTop + el.clientHeight < el.scrollHeight - 1;
    setScrollIndicators((prev) =>
      prev.top === top && prev.bottom === bottom ? prev : { top, bottom },
    );
  }, []);

  const [toast, setToast] = useState<string | null>(null);
  const { showError } = useToast();
  const showToast = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2500);
  };

  const handleDeleteApplication = async () => {
    if (!deleteAppTarget) return;
    setDeleteAppInProgress(true);
    try {
      await deleteApplication(deleteAppTarget.id);
      setDeleteAppTarget(null);
      await loadApps();   // частичное обновление списка
    } catch (err: any) {
      showError(err.message || 'Не удалось удалить заявку');
      setDeleteAppTarget(null);
    } finally {
      setDeleteAppInProgress(false);
    }
  };

  const handleShare = () => {
    if (!event) return;
    const username = (window as any).__botUsername; // см. шаг 6
    // Формируем диплинк для шеринга (чтобы получатель тоже открыл мини-апп)
    const deepLink = username
      ? `https://max.ru/${username}?startapp=event_${event.id}`
      : `${window.location.origin}/events/${event.id}`;

    const text = [
      event.name,
      `${formatDateTime(event.eventDate)}`,
      `${event.address ?? event.city}`,
      '',
      deepLink,
    ].join('\n');

    const shareUrl = `https://max.ru/:share?text=${encodeURIComponent(text)}`;
    window.location.href = shareUrl;
  };


  const loadApps = async () => {
    try {
      const res = await fetchApplications(eventId);
      setApps(res.applications);
    } catch (e) {
      console.error('Applications load failed:', e);
      setApps([]);
    }
  };

  const handleDelete = async () => {
    setDeleteInProgress(true);
    try {
      await deleteEvent(eventId);
      navigate('/events/my');
    } catch (err: any) {
      showError(err.message || 'Не удалось удалить мероприятие');
      setConfirmDelete(false);
    } finally {
      setDeleteInProgress(false);
    }
  };


  const load = async () => {
    setLoading(true);
    try {
      const res = await fetchEventDetails(eventId);
      setEvent(res);
      if (res.isOwner) loadApps();
    } catch (err: any) {
      showError(err.message || 'Не удалось загрузить мероприятие');
    } finally {
      setLoading(false);
    }
  };

  const loadSilent = async () => {
    try {
      const res = await fetchEventDetails(eventId);
      setEvent(res);
      if (res.isOwner) {
        const appsRes = await fetchApplications(eventId);
        setApps(appsRes.applications);
      }
    } catch {
      // ошибки поллинга игнорируем — это фоновое обновление
    }
  };

  useAutoRefresh(loadSilent, 15000); // раз в 15 секунд + при возврате в приложение

  useEffect(() => {
    if (!Number.isFinite(eventId) || eventId <= 0) {
      navigate('/events/my', { replace: true });
      return;
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId]);

    // При смене таба возвращаем список к началу
  useEffect(() => {
    const el = appsScrollRef.current;
    if (el) el.scrollTop = 0;
  }, [activeTab]);

  // Пересчёт индикаторов при изменении контента/вкладок
  useEffect(() => {
    const raf = requestAnimationFrame(updateScrollIndicators);
    return () => cancelAnimationFrame(raf);
  }, [activeTab, apps, updateScrollIndicators]);

  const handleRegister = async () => {
    if (!event) return;
    setActionInProgress(true);
    try {
      await registerForEvent(event.id);
      await load();
    } catch (err: any) {
      showError(err.message || 'Не удалось записаться');
    } finally {
      setActionInProgress(false);
    }
  };

  const handleCancel = async () => {
    if (!event) return;
    setActionInProgress(true);
    try {
      await cancelRegistration(event.id);
      await load();
    } catch (err: any) {
      showError(err.message || 'Не удалось отменить запись');
    } finally {
      setActionInProgress(false);
    }
  };

  const handleApplicationAction = async (
    registrationId: number,
    action: 'approve' | 'reject',
  ) => {
    setActionInProgress(true);
    try {
      await applicationAction(registrationId, action);
      await load();
    } catch (err: any) {
      showError(err.message || 'Не удалось обработать заявку');
    } finally {
      setActionInProgress(false);
    }
  };

  const getMapsUrl = (address: string | null): string => {
    const query = encodeURIComponent([address].filter(Boolean).join(', '));
    return `https://yandex.ru/maps/?text=${query}`;
  };

  const pendingCount = apps?.filter((a) => a.status === 'pending').length ?? 0;
  const approvedCount = apps?.filter((a) => a.status === 'approved').length ?? 0;
  const rejectedCount = apps?.filter((a) => a.status === 'rejected').length ?? 0;

  const filteredApps =
    apps?.filter((a) => (activeTab === 'all' ? true : a.status === activeTab)) ?? [];

  const handleApproveAll = async () => {
    setApproveAllInProgress(true);
    try {
      await approveAllApplications(eventId);
      setConfirmApproveAll(false);
      await load();
    } catch (err: any) {
      showError(err.message || 'Не удалось одобрить заявки');
      setConfirmApproveAll(false);
    } finally {
      setApproveAllInProgress(false);
    }
  };

  const handleBroadcast = async () => {
    if (!broadcastText.trim()) return;
    setBroadcastSending(true);
    try {
      const res = await broadcastToApproved(eventId, broadcastText.trim());
      if (res.sent === 0) {
        showToast('Не удалось отправить сообщение');
      }
      setBroadcastOpen(false);
      setBroadcastText('');
    } catch (err: any) {
      showToast(err.message || 'Не удалось отправить сообщение');
    } finally {
      setBroadcastSending(false);
    }
  };

  if (loading) {
    return (
      <div style={styles.root}>
        <div style={styles.empty}>Загрузка…</div>
      </div>
    );
  }

  if (!event) return null;

  const isPast = event.status === 'completed';
  const isFull = event.freeSlots === 0 && !event.isOwner;
  const pct = event.requiredVolunteersCount > 0
    ? (event.registeredCount / event.requiredVolunteersCount) * 100
    : 0;

  const renderBottomBar = () => {
    if (event.isOwner) {
      return (
        <div style={styles.bottomBar}>
          <Button
            variant="secondary"
            size="small"
            onClick={() => navigate(`/events/edit/${event.id}`)}
          >
            Редактировать
          </Button>
          <Button
            variant="secondary"
            size="small"
            onClick={() => setConfirmDelete(true)}
            style={{ color: C.danger, borderColor: C.danger }}
          >
            Удалить
          </Button>
        </div>
      );
    }
    if (isOrg) {
      return null;
    }
    if (isPast) {
      return (
        <div style={styles.bottomBar}>
          <div style={styles.bottomInfo}>Мероприятие уже прошло</div>
        </div>
      );
    }
    const reg = event.registration;
    if (!reg) {
      return (
        <div style={styles.bottomBar}>
          <div style={styles.bottomInfo}>
            Свободно мест: <strong style={{ color: C.text }}>{event.freeSlots}</strong>
          </div>
          <Button variant="primary" onClick={handleRegister} disabled={actionInProgress || isFull}>
            {isFull ? 'Мест нет' : 'Записаться'}
          </Button>
        </div>
      );
    }
    if (reg.status === 'pending') {
      return (
        <div style={styles.bottomBar}>
          <div style={styles.bottomInfo}>Заявка на рассмотрении</div>
          <Button variant="secondary" onClick={handleCancel} disabled={actionInProgress}>
            Отменить
          </Button>
        </div>
      );
    }
    if (reg.status === 'approved') {
      return (
        <div style={styles.bottomBar}>
          <div style={{ ...styles.bottomInfo, color: C.success }}>Вы записаны</div>
          <Button variant="secondary" onClick={handleCancel} disabled={actionInProgress}>
            Отменить запись
          </Button>
        </div>
      );
    }
    if (reg.status === 'rejected') {
      return (
        <div style={styles.bottomBar}>
          <div style={{ ...styles.bottomInfo, color: C.danger }}>
            Заявка отклонена. Повторная подача невозможна
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div style={styles.root}>
      <div style={styles.topBar}>
        <button type="button" style={styles.backButton} onClick={() => navigate(-1)}>
          ← Назад
        </button>
        <button type="button" style={styles.shareButton} onClick={handleShare}>
          ↗ 
        </button>
        {event?.isOwner && (
          <button
            type="button"
            style={styles.historyButton}
            onClick={() => navigate(`/events/${eventId}/broadcasts`)}
          >
            История рассылок
          </button>
        )}
      </div>

      {/* Основной блок с информацией о мероприятии */}
      <div style={styles.card}>
        <div style={styles.title}>{event.name}</div>

        {/* Прогресс-бар с количеством волонтёров */}
        <div style={styles.progressSection}>
          <div style={styles.progressLabel}>
            <span style={styles.progressLabelText}>Волонтёры</span>
            <span style={styles.progressLabelValue}>
              {event.registeredCount}/{event.requiredVolunteersCount}
            </span>
          </div>
          <div style={styles.progressTrack}>
            <div style={styles.progressFill(pct)} />
          </div>
        </div>

        <a
          href={getMapsUrl(event.address)}
          target="_blank"
          rel="noopener noreferrer"
          style={styles.addressLink}
        >
          {event.address ?? event.city}
        </a>

        <div style={styles.metaRow}>
          {formatDateTime(event.eventDate)}
          {event.endTime && (
            <>
              {' — '}
              {formatTime(event.endTime)}
            </>
          )}
        </div>

        {/* Pills */}
        <div style={{ marginTop: 10 }}>
          <span style={styles.pill(
            event.status === 'completed' ? 'past' 
            : event.status === 'ongoing' ? 'warn' 
            : 'active'
          )}>
            {event.status === 'completed' ? 'Завершено' 
              : event.status === 'ongoing' ? 'Идёт сейчас' 
              : 'Предстоит'}
          </span>
          {event.status !== 'completed' && event.freeSlots > 0 && (
            <span style={styles.pill('ok')}>Свободно {event.freeSlots}</span>
          )}
          {event.status !== 'completed' && isFull && <span style={styles.pill('full')}>Мест нет</span>}
          {event.organization.isOfficial && (
            <span style={styles.pill('active')}>Официальная организация</span>
          )}
        </div>

        {/* Описание */}
        {event.description && (
          <div style={{ marginTop: 16 }}>
            <div style={styles.sectionTitle}>Описание</div>
            <div style={styles.body}>{event.description}</div>
          </div>
        )}

        {/* Критерии волонтёров */}
        {event.criteria && (
          <div style={{ marginTop: 16 }}>
            <div style={styles.sectionTitle}>Критерии волонтёров</div>
            <div style={styles.body}>{event.criteria}</div>
            {event.minAge && (
              <div style={{ ...styles.body, color: C.warn, fontWeight: 600, marginTop: 8 }}>
                Минимальный возраст: {event.minAge} лет
              </div>
            )}
          </div>
        )}
      </div>

      {/* Заявки: табы + скролл + одобрить всех + рассылка */}
      {event.isOwner && (
        <div style={styles.card}>
          <div style={styles.sectionHead}>
            <div style={{ ...styles.sectionTitle, margin: 0 }}>
              Заявки волонтёров ({apps?.length ?? 0})
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              {pendingCount > 0 && (
                <button
                  type="button"
                  style={styles.broadcastTrigger}
                  onClick={() => setConfirmApproveAll(true)}
                >
                  Одобрить всех ({pendingCount})
                </button>
              )}
              {approvedCount > 0 && (
                <button
                  type="button"
                  style={styles.broadcastTrigger}
                  onClick={() => setBroadcastOpen(true)}
                >
                  Рассылка
                </button>
              )}
            </div>
          </div>

          {/* Табы */}
          <div style={styles.tabsRow}>
            <button
              type="button"
              style={styles.tab(activeTab === 'all')}
              onClick={() => setActiveTab('all')}
            >
              Все ({apps?.length ?? 0})
            </button>
            <button
              type="button"
              style={styles.tab(activeTab === 'pending')}
              onClick={() => setActiveTab('pending')}
            >
              Ожидают ({pendingCount})
            </button>
            <button
              type="button"
              style={styles.tab(activeTab === 'approved')}
              onClick={() => setActiveTab('approved')}
            >
              Одобрены ({approvedCount})
            </button>
            <button
              type="button"
              style={styles.tab(activeTab === 'rejected')}
              onClick={() => setActiveTab('rejected')}
            >
              Отклонены ({rejectedCount})
            </button>
          </div>

          {/* Скроллируемый список */}
          {!apps && <div style={{ fontSize: 14, color: C.textSec }}>Загрузка…</div>}
          {apps && apps.length === 0 && (
            <div style={{ fontSize: 14, color: C.textSec }}>Заявок пока нет</div>
          )}
          {apps && apps.length > 0 && (
            <div style={styles.appsScrollWrapper}>
              <style>{`
                .apps-scrollbar::-webkit-scrollbar { width: 8px; }
                .apps-scrollbar::-webkit-scrollbar-track { background: #F1F3F5; border-radius: 4px; }
                .apps-scrollbar::-webkit-scrollbar-thumb { background: #C9D1DA; border-radius: 4px; }
                .apps-scrollbar::-webkit-scrollbar-thumb:hover { background: #A8B3BF; }
                .apps-scrollbar { scrollbar-width: thin; scrollbar-color: #C9D1DA #F1F3F5; }
              `}</style>

              {scrollIndicators.top && <div style={styles.scrollFadeTop} />}
              {scrollIndicators.bottom && <div style={styles.scrollFadeBottom} />}

              <div
                ref={appsScrollRef}
                className="apps-scrollbar"
                style={styles.appsScroll}
                onScroll={updateScrollIndicators}
              >
                {filteredApps.length === 0 ? (
                  <div style={{ fontSize: 13, color: C.textSec, padding: '8px 0' }}>
                    В этой категории заявок нет
                  </div>
                ) : (
                  filteredApps.map((a, i) => (
                    <div
                      key={a.id}
                      style={{
                        ...styles.appRow,
                        ...(i === filteredApps.length - 1 ? styles.appRowLast : {}),
                      }}
                    >
                      <div>
                        <div style={styles.appName}>
                          {a.volunteer.lastName} {a.volunteer.firstName}
                          {a.volunteer.phone && (
                            <span style={{ color: C.textSec, fontWeight: 400 }}>
                              {' '}· {a.volunteer.phone}
                            </span>
                          )}
                        </div>
                        <div style={styles.appMeta}>
                          {a.volunteer.address ?? a.volunteer.city} · заявка от{' '}
                          {formatShortDate(a.registeredAt)}
                          {a.volunteer.participationsCount > 0 && (
                            <>
                              {' · '}
                              <span style={{ color: C.success, fontWeight: 600 }}>
                                {a.volunteer.participationsCount}{' '}
                                {a.volunteer.participationsCount === 1
                                  ? 'участие'
                                  : a.volunteer.participationsCount < 5
                                    ? 'участия'
                                    : 'участий'}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                      <div style={styles.appActions}>
                        {a.status === 'pending' ? (
                          <>
                            <Button
                              variant="primary"
                              size="small"
                              disabled={actionInProgress}
                              onClick={() => handleApplicationAction(a.id, 'approve')}
                            >
                              Одобрить
                            </Button>
                            <Button
                              variant="secondary"
                              size="small"
                              disabled={actionInProgress}
                              onClick={() => handleApplicationAction(a.id, 'reject')}
                            >
                              Отклонить
                            </Button>
                          </>
                        ) : (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ ...styles.pill(APP_STATUS[a.status].kind), marginRight: 0, marginBottom: 0 }}>
                              {APP_STATUS[a.status].text}
                            </span>
                            <button
                              type="button"
                              style={styles.appDeleteBtn}
                              onClick={() => setDeleteAppTarget(a)}
                              title="Удалить заявку"
                            >
                              ✕
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Организатор */}
      <div
        style={styles.orgCard}
        onClick={() => navigate(`/organizations/${event.organization.id}`)}
        role="button"
      >
        <div style={styles.sectionTitle}>Организатор</div>
        <div style={styles.orgRow}>
          <div style={styles.orgAvatar}>{initialsOf(event.organization.name)}</div>
          <div>
            <div style={styles.orgName}>{event.organization.name}</div>
            <div style={styles.orgMeta}>
              {event.organization.isOfficial ? 'Официальная организация' : 'Организация'}
            </div>
          </div>
          <span style={styles.orgChevron}>→</span>
        </div>
      </div>

      {renderBottomBar()}

      {/* Подтверждение «Одобрить всех» */}
      {confirmApproveAll &&
        createPortal(
          <div
            style={styles.overlay}
            onClick={() => {
              if (!approveAllInProgress) setConfirmApproveAll(false);
            }}
          >
            <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
              <div style={styles.modalTitle}>
                Одобрить всех ожидающих ({pendingCount})?
              </div>
              <div style={styles.modalHint}>
                Каждому волонтёру придёт сообщение в MAX с названием, датой,
                оргмоментами и ссылкой на мероприятие.
              </div>
              <div style={styles.modalButtons}>
                <button
                  type="button"
                  style={{
                    ...styles.modalPrimaryBtn,
                    ...(approveAllInProgress ? styles.disabledBtn : {}),
                  }}
                  onClick={handleApproveAll}
                  disabled={approveAllInProgress}
                >
                  {approveAllInProgress ? 'Одобрение…' : 'Да, одобрить всех'}
                </button>
                <button
                  type="button"
                  style={{
                    ...styles.modalSecondaryBtn,
                    ...(approveAllInProgress ? styles.disabledBtn : {}),
                  }}
                  onClick={() => setConfirmApproveAll(false)}
                  disabled={approveAllInProgress}
                >
                  Отмена
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}
      
      {/* Подтверждение удаления */}
      {confirmDelete &&
        createPortal(
          <div
            style={styles.overlay}
            onClick={() => {
              if (!deleteInProgress) setConfirmDelete(false);
            }}
          >
            <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
              <div style={styles.modalTitle}>Удалить мероприятие?</div>
              <div style={styles.modalHint}>
                Это действие нельзя отменить. Все записи волонтёров и история
                рассылок будут удалены.
              </div>
              <div style={styles.modalButtons}>
                <button
                  type="button"
                  style={{
                    ...styles.dangerButton,
                    ...(deleteInProgress ? styles.disabledBtn : {}),
                  }}
                  onClick={handleDelete}
                  disabled={deleteInProgress}
                >
                  {deleteInProgress ? 'Удаление…' : 'Да, удалить'}
                </button>
                <button
                  type="button"
                  style={{
                    ...styles.modalSecondaryBtn,
                    ...(deleteInProgress ? styles.disabledBtn : {}),
                  }}
                  onClick={() => setConfirmDelete(false)}
                  disabled={deleteInProgress}
                >
                  Отмена
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}

      {/* Модалка рассылки */}
      {broadcastOpen &&
        createPortal(
          <div
            style={styles.overlay}
            onClick={() => {
              if (!broadcastSending) setBroadcastOpen(false);
            }}
          >
            <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
              <div style={styles.modalTitle}>Рассылка одобренным волонтёрам</div>
              <div style={styles.modalHint}>
                К сообщению автоматически добавятся название мероприятия, дата и ссылка.
              </div>
              <textarea
                style={styles.broadcastTextarea}
                value={broadcastText}
                onChange={(e) => setBroadcastText(e.target.value)}
                placeholder="Текст сообщения для волонтёров…"
                autoFocus
              />
              <div style={styles.modalButtons}>
                <button
                  type="button"
                  style={{
                    ...styles.modalPrimaryBtn,
                    ...(broadcastSending || !broadcastText.trim() ? styles.disabledBtn : {}),
                  }}
                  onClick={handleBroadcast}
                  disabled={broadcastSending || !broadcastText.trim()}
                >
                  {broadcastSending ? 'Отправка…' : `Отправить (${approvedCount})`}
                </button>
                <button
                  type="button"
                  style={{
                    ...styles.modalSecondaryBtn,
                    ...(broadcastSending ? styles.disabledBtn : {}),
                  }}
                  onClick={() => setBroadcastOpen(false)}
                  disabled={broadcastSending}
                >
                  Отмена
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}

      {/* Подтверждение удаления заявки */}
      {deleteAppTarget &&
        createPortal(
          <div
            style={styles.overlay}
            onClick={() => {
              if (!deleteAppInProgress) setDeleteAppTarget(null);
            }}
          >
            <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
              <div style={styles.modalTitle}>Удалить заявку волонтёра?</div>
              <div style={styles.modalHint}>
                {deleteAppTarget.volunteer.lastName} {deleteAppTarget.volunteer.firstName}{' '}
                будет удалён(а) из списка. Это действие нельзя отменить.
              </div>
              <div style={styles.modalButtons}>
                <button
                  type="button"
                  style={{
                    ...styles.dangerButton,
                    ...(deleteAppInProgress ? styles.disabledBtn : {}),
                  }}
                  onClick={handleDeleteApplication}
                  disabled={deleteAppInProgress}
                >
                  {deleteAppInProgress ? 'Удаление…' : 'Да, удалить'}
                </button>
                <button
                  type="button"
                  style={{
                    ...styles.modalSecondaryBtn,
                    ...(deleteAppInProgress ? styles.disabledBtn : {}),
                  }}
                  onClick={() => setDeleteAppTarget(null)}
                  disabled={deleteAppInProgress}
                >
                  Отмена
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}

      {/* Тост об ошибке */}
      {toast && createPortal(<div style={styles.toast}>{toast}</div>, document.body)}
    </div>
  );
}

export default EventDetail;