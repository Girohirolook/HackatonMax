import { useEffect, useState } from 'react';
import { Button, Typography } from '@maxhub/max-ui';
import { useNavigate } from 'react-router-dom';
import {
  updateProfile,
  fetchOrganizationEvents,
  type UpdateProfilePayload,
  type OrgEvent,
} from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { AddressInput } from '../components/AddressInput';
import { useToast } from '../context/ToastContext';
// import { useNavigate } from 'react-router-dom';

// ---------- Палитра в стиле MAX ----------
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
  root: {
    maxWidth: 920,
    margin: '0 auto',
    padding: '8px 4px 32px',
  },
  card: {
    background: C.card,
    border: `1px solid ${C.border}`,
    borderRadius: 12,
    padding: 20,
    marginBottom: 12,
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: 16,
    flexWrap: 'wrap' as const,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: '50%',
    background: C.accent,
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 22,
    fontWeight: 600,
    overflow: 'hidden',
    flexShrink: 0,
  },
  name: { fontSize: 18, fontWeight: 600, color: C.text, lineHeight: 1.3 },
  role: { fontSize: 14, color: C.textSec, marginTop: 2 },
  actions: { marginLeft: 'auto' },
  sectionTitle: {
    fontSize: 15,
    fontWeight: 600,
    color: C.text,
    margin: '0 0 8px',
  },
  row: (last: boolean) => ({
    display: 'flex',
    gap: 16,
    padding: '10px 0',
    borderBottom: last ? 'none' : `1px solid ${C.border}`,
    fontSize: 14,
    flexWrap: 'wrap' as const,
  }),
  rowLabel: {
    width: 170,
    flexShrink: 0,
    color: C.textSec,
  },
  rowValue: { color: C.text, flex: 1, minWidth: 200 },
  badge: (kind: 'official' | 'pending' | 'none') => ({
    display: 'inline-block',
    marginTop: 6,
    padding: '3px 10px',
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 600,
    background: kind === 'official' ? C.successBg : kind === 'pending' ? C.warnBg : C.muted,
    color: kind === 'official' ? C.success : kind === 'pending' ? C.warn : C.textSec,
    border: `1px solid ${C.border}`,
  }),
  label: {
    display: 'block',
    marginBottom: 6,
    fontSize: 13,
    fontWeight: 600,
    color: C.textSec,
  },
  input: {
    width: '100%',
    padding: '10px 12px',
    fontSize: 15,
    color: C.text,
    border: `1px solid ${C.border}`,
    borderRadius: 10,
    boxSizing: 'border-box' as const,
    marginBottom: 14,
    outline: 'none',
    background: '#fff',
  },
  banner: (kind: 'ok' | 'err') => ({
    padding: '10px 14px',
    borderRadius: 10,
    marginBottom: 12,
    fontSize: 14,
    background: kind === 'ok' ? C.successBg : C.dangerBg,
    color: kind === 'ok' ? C.success : C.danger,
    border: `1px solid ${C.border}`,
  }),
  buttonRow: { display: 'flex', gap: 8, marginTop: 16 },
  uploadRow: { marginTop: 4, marginBottom: 14 },
  uploadLabel: {
    display: 'inline-block',
    padding: '8px 14px',
    fontSize: 13,
    fontWeight: 600,
    color: C.accent,
    border: `1px solid ${C.accent}`,
    borderRadius: 10,
    cursor: 'pointer',
    background: '#fff',
  },
  hint: { fontSize: 12, color: C.textSec, margin: '6px 0 0' },
};

// ---------- Стили карточки мероприятия ----------
const eventStyles = {
  list: { display: 'flex', flexDirection: 'column' as const, gap: 10 },
  card: {
    display: 'flex',
    gap: 12,
    padding: 12,
    border: `1px solid ${C.border}`,
    borderRadius: 10,
    background: '#fff',
  },
  thumb: {
    position: 'relative' as const,
    width: 84,
    height: 84,
    borderRadius: 10,
    overflow: 'hidden',
    flexShrink: 0,
    background: C.muted,
  },
  thumbPlaceholder: {
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
  name: {
    fontSize: 15,
    fontWeight: 600,
    color: C.text,
    lineHeight: 1.3,
    flex: 1,
    minWidth: 0,
  },
  status: (s: 'active' | 'completed') => ({
    flexShrink: 0,
    fontSize: 11,
    fontWeight: 600,
    padding: '2px 8px',
    borderRadius: 999,
    background: s === 'active' ? C.successBg : C.muted,
    color: s === 'active' ? C.success : C.textSec,
    border: `1px solid ${C.border}`,
  }),
  meta: { fontSize: 13, color: C.textSec, marginTop: 2 },
  desc: {
    fontSize: 13,
    color: C.textSec,
    marginTop: 6,
    lineHeight: 1.45,
    overflowWrap: 'break-word' as const,
  },
  empty: { fontSize: 14, color: C.textSec, padding: '8px 0' },
};

// ---------- Вспомогательные ----------

function formatDate(iso?: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function initialsOf(s: string): string {
  const parts = s.trim().split(/\s+/).slice(0, 2);
  const res = parts.map((w) => w.charAt(0).toUpperCase()).join('');
  return res || '?';
}

function excerptOf(text: string | null, len = 90): string | null {
  if (!text) return null;
  const t = text.trim();
  if (t.length <= len) return t;
  return t.slice(0, len).trimEnd() + '…';
}


function Row({
  label,
  value,
  last,
}: {
  label: string;
  value?: string | null;
  last?: boolean;
}) {
  return (
    <div style={styles.row(!!last)}>
      <span style={styles.rowLabel}>{label}</span>
      <span style={styles.rowValue}>{value || '—'}</span>
    </div>
  );
}

function EventCard({ ev }: { ev: OrgEvent }) {
  const navigate = useNavigate();

  return (
    <div
      style={{...eventStyles.card, cursor: 'pointer'}}
      onClick={() => navigate(`/events/${ev.id}`)}
      role="button"    
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: 8,
            justifyContent: 'space-between',
          }}
        >
          <div style={eventStyles.name}>{ev.name}</div>
          <span style={eventStyles.status(ev.status)}>
            {ev.status === 'active' ? 'Активное' : 'Проведено'}
          </span>
        </div>
        <div style={eventStyles.meta}>
          {formatDate(ev.eventDate)} · {ev.city}
        </div>
        {excerptOf(ev.description) && (
          <div style={eventStyles.desc}>{excerptOf(ev.description)}</div>
        )}
      </div>
    </div>
  );
}

// ---------- Компонент ----------

function Profile() {
  const navigate = useNavigate();
  const { data, refresh } = useAuth();
  const user = data?.user;
  const isVolunteer = user?.role === 'volunteer';
  const v = user?.volunteer ?? null;
  const o = user?.organization ?? null;

  const buildForm = () => ({
    firstName: v?.firstName ?? '',
    lastName: v?.lastName ?? '',
    middleName: v?.middleName ?? '',
    birthDate: v?.birthDate ? v.birthDate.slice(0, 10) : '',
    organizationName: o?.name ?? '',
    description: o?.description ?? '',
    contacts: o?.contacts ?? '',
    socialMediaLink: o?.socialMediaLink ?? '',
    city: v?.city ?? o?.city ?? '',
    address: v?.address ?? o?.address ?? '',
  });

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(buildForm);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const { showError } = useToast();

  // Мероприятия организации
  const [eventsData, setEventsData] = useState<{
    total: number;
    events: OrgEvent[];
  } | null>(null);
  const [eventsLoading, setEventsLoading] = useState(true);

  useEffect(() => {
    if (user?.role !== 'organization_creator') {
      setEventsLoading(false);
      return;
    }
    let cancelled = false;
    setEventsLoading(true);
    fetchOrganizationEvents()
      .then((res) => {
        if (!cancelled) setEventsData(res);
      })
      .catch((err) => {
        console.error('Events load failed:', err);
        if (!cancelled) setEventsData(null);
      })
      .finally(() => {
        if (!cancelled) setEventsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user?.id, user?.role]);

  if (!user) return null;

  const title = isVolunteer
    ? `${v?.lastName ?? ''} ${v?.firstName ?? ''}`.trim()
    : (o?.name ?? '');

  const updateField = <K extends keyof ReturnType<typeof buildForm>>(
    key: K,
    value: ReturnType<typeof buildForm>[K],
  ) => setForm((prev) => ({ ...prev, [key]: value }));

  const startEdit = () => {
    setForm(buildForm());;
    setSaved(false);
    setEditing(true);
  };

  const cancelEdit = () => {
    setEditing(false);
  };

  const handleSave = async () => {
    setSaving(true);

    try {
      const payload: UpdateProfilePayload = {
        city: form.city,
        address: form.address,
      };

      if (isVolunteer) {
        payload.firstName = form.firstName;
        payload.lastName = form.lastName;
        payload.middleName = form.middleName;
        payload.birthDate = form.birthDate;
      } else {
        payload.organizationName = form.organizationName;
        payload.description = form.description;
        payload.contacts = form.contacts;
        payload.socialMediaLink = form.socialMediaLink;
      }

      await updateProfile(payload);
      await refresh();
      setEditing(false);
      setSaved(true);
    } catch (err: any) {
      showError(err.message || 'Ошибка сохранения');
    } finally {
      setSaving(false);
    }
  };

  const badgeKind = o?.isOfficial ? 'official' : o?.hasDocuments ? 'pending' : 'none';
  const badgeText = o?.isOfficial
    ? 'Официальная организация'
    : o?.hasDocuments
      ? 'Документы на проверке'
      : 'Документы не загружены';

  // ---------- Блок мероприятий (только организации) ----------

  const renderEvents = () => {
    if (isVolunteer) return null;

    if (eventsLoading) {
      return (
        <div style={styles.card}>
          <div style={styles.sectionTitle}>Мероприятия</div>
          <div style={eventStyles.empty}>Загрузка…</div>
        </div>
      );
    }

    if (!eventsData || eventsData.events.length === 0) {
      return (
        <div style={styles.card}>
          <div style={styles.sectionTitle}>Мероприятия</div>
          <div style={eventStyles.empty}>Мероприятий пока нет</div>
        </div>
      );
    }

    return (
      <div style={styles.card}>
        <div style={styles.sectionTitle}>Мероприятия</div>
        <div style={eventStyles.list}>
          {eventsData.events.map((ev) => (
            <EventCard key={ev.id} ev={ev} />
          ))}
        </div>
        {eventsData.total > 5 && (
          <Button
            variant="secondary"
            size="small"
            style={{ width: '100%', marginTop: 12 }}
            onClick={() => navigate('/events/my')}
          >
            Показать больше
          </Button>
        )}
      </div>
    );
  };

  // ---------- Режим просмотра ----------

  const renderView = () => (
    <>
      <div style={styles.card}>
        <div style={styles.header}>
          <div>
            <div style={styles.avatar}>{initialsOf(title || '?')}</div>
            <div style={styles.name}>{title || '—'}</div>
            <div style={styles.role}>
              {isVolunteer ? 'Волонтёр' : 'Организация'}
            </div>
            {!isVolunteer && <span style={styles.badge(badgeKind)}>{badgeText}</span>}
          </div>
          <div style={styles.actions}>
            <Button variant="secondary" size="small" onClick={startEdit}>
              Изменить
            </Button>
          </div>
        </div>
      </div>

      <div style={styles.card}>
        <div style={styles.sectionTitle}>Основная информация</div>
        {isVolunteer ? (
          <>
            <Row label="Фамилия" value={v?.lastName} />
            <Row label="Имя" value={v?.firstName} />
            <Row label="Отчество" value={v?.middleName} />
            <Row label="Дата рождения" value={formatDate(v?.birthDate)} last />
          </>
        ) : (
          <>
            <Row label="Название" value={o?.name} />
            <Row label="Описание" value={o?.description} />
            <Row label="Контакты" value={o?.contacts} />
            <Row label="Соцсети" value={o?.socialMediaLink} last />
          </>
        )}
      </div>

      {renderEvents()}

      <div style={styles.card}>
        <div style={styles.sectionTitle}>Местоположение</div>
        <Row label="Адрес" value={v?.address ?? o?.address} last />
      </div>
    </>
  );

  // ---------- Режим редактирования ----------

  const renderEdit = () => (
    <>
      <div style={styles.card}>
        <div style={styles.header}>
          <div>
            <div style={styles.avatar}>
              {initialsOf(
                (isVolunteer
                  ? `${form.lastName} ${form.firstName}`
                  : form.organizationName) || '?',
              )}
            </div>
            <div style={styles.name}>Редактирование профиля</div>
            <div style={styles.role}>
              {isVolunteer ? 'Волонтёр' : 'Организация'}
            </div>
          </div>
        </div>

      </div>

      <div style={styles.card}>
        <div style={styles.sectionTitle}>Основная информация</div>

        {isVolunteer ? (
          <>
            <label style={styles.label}>Фамилия *</label>
            <input
              style={styles.input}
              value={form.lastName}
              onChange={(e) => updateField('lastName', e.target.value)}
            />
            <label style={styles.label}>Имя *</label>
            <input
              style={styles.input}
              value={form.firstName}
              onChange={(e) => updateField('firstName', e.target.value)}
            />
            <label style={styles.label}>Отчество</label>
            <input
              style={styles.input}
              value={form.middleName}
              onChange={(e) => updateField('middleName', e.target.value)}
            />
            <label style={styles.label}>Дата рождения *</label>
            <input
              style={styles.input}
              type="date"
              value={form.birthDate}
              onChange={(e) => updateField('birthDate', e.target.value)}
            />
          </>
        ) : (
          <>
            <label style={styles.label}>Название организации *</label>
            <input
              style={styles.input}
              value={form.organizationName}
              onChange={(e) => updateField('organizationName', e.target.value)}
            />
            <label style={styles.label}>Описание</label>
            <textarea
              style={{ ...styles.input, minHeight: 90, resize: 'vertical' }}
              value={form.description}
              onChange={(e) => updateField('description', e.target.value)}
            />
            <label style={styles.label}>Контакты</label>
            <input
              style={styles.input}
              value={form.contacts}
              onChange={(e) => updateField('contacts', e.target.value)}
            />
            <label style={styles.label}>Ссылка на соцсети</label>
            <input
              style={styles.input}
              value={form.socialMediaLink}
              onChange={(e) => updateField('socialMediaLink', e.target.value)}
            />
          </>
        )}
      </div>

      {renderEvents()}

      <div style={styles.card}>
        <label style={styles.label}>Адрес</label>
        <AddressInput
          value={form.address}
          onChange={(a) => {
            setForm((prev) => ({
              ...prev,
              address: a.address,
              city: a.city,
            }));
          }}
        />
      </div>

      <div style={styles.buttonRow}>
        <Button variant="primary" onClick={handleSave} disabled={saving}>
          {saving ? 'Сохранение...' : 'Сохранить'}
        </Button>
        <Button variant="secondary" onClick={cancelEdit} disabled={saving}>
          Отмена
        </Button>
      </div>
    </>
  );

  return (
    <div style={styles.root}>
      <Typography.Headline variant="large-strong" style={{ marginBottom: 12 }}>
        Профиль
      </Typography.Headline>

      {/* {error && <div style={styles.banner('err')}>{error}</div>} */}
      {saved && !editing && (
        <div style={styles.banner('ok')}>Изменения сохранены</div>
      )}

      {editing ? renderEdit() : renderView()}
    </div>
  );  
}

export default Profile;