import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { API_URL, fetchOrganizationProfile, type OrganizationProfileData } from '../lib/api';

const C = {
  accent: '#0077FF',
  text: '#1A1D21',
  textSec: '#6E7681',
  border: '#E6E9ED',
  card: '#FFFFFF',
  muted: '#F7F8FA',
  success: '#1E8E3E',
  successBg: '#E6F4EA',
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
    padding: 16,
    marginBottom: 10,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: '50%',
    background: C.accent,
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 28,
    fontWeight: 600,
    overflow: 'hidden',
    margin: '0 auto 12px',
  },
  name: {
    fontSize: 22,
    fontWeight: 700,
    color: C.text,
    textAlign: 'center' as const,
    marginBottom: 4,
  },
  badge: {
    display: 'inline-block',
    fontSize: 12,
    fontWeight: 600,
    padding: '3px 10px',
    borderRadius: 999,
    border: `1px solid ${C.border}`,
    background: C.successBg,
    color: C.success,
    margin: '8px auto',
  },
  sectionTitle: { fontSize: 15, fontWeight: 600, color: C.text, margin: '4px 0 8px' },
  body: { fontSize: 14, lineHeight: 1.55, color: C.text, whiteSpace: 'pre-wrap' as const },
  contactRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    fontSize: 14,
    color: C.textSec,
    marginBottom: 6,
  },
  link: {
    color: C.accent,
    textDecoration: 'none',
    fontSize: 14,
  },
  eventCard: {
    padding: 14,
    border: `1px solid ${C.border}`,
    borderRadius: 12,
    background: C.card,
    cursor: 'pointer',
    marginBottom: 8,
  },
  eventName: { fontSize: 16, fontWeight: 600, color: C.text, lineHeight: 1.3 },
  eventMeta: { fontSize: 13, color: C.textSec, marginTop: 2 },
  eventDesc: { fontSize: 13, color: C.textSec, marginTop: 6, lineHeight: 1.45 },
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

function excerpt(text: string | null, len = 140): string | null {
  if (!text) return null;
  const t = text.trim();
  return t.length <= len ? t : t.slice(0, len).trimEnd() + '…';
}

function initialsOf(s: string): string {
  return s.trim().charAt(0).toUpperCase() || '?';
}

function OrganizationProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const orgId = Number(id);

  const [org, setOrg] = useState<OrganizationProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!Number.isFinite(orgId) || orgId <= 0) {
      navigate('/', { replace: true });
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchOrganizationProfile(orgId)
      .then((res) => {
        if (!cancelled) setOrg(res);
      })
      .catch((err: any) => {
        if (!cancelled) setError(err.message || 'Не удалось загрузить профиль');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [orgId, navigate]);

  if (loading) {
    return (
      <div style={styles.root}>
        <div style={styles.empty}>Загрузка…</div>
      </div>
    );
  }

  if (error || !org) {
    return (
      <div style={styles.root}>
        <div style={styles.topBar}>
          <button type="button" style={styles.backButton} onClick={() => navigate(-1)}>
            ← Назад
          </button>
        </div>
        <div style={{ ...styles.empty, marginTop: 16 }}>{error || 'Организация не найдена'}</div>
      </div>
    );
  }

  const logoSrc = org.logoUrl ? `${API_URL}${org.logoUrl}` : null;

  return (
    <div style={styles.root}>
      <div style={styles.topBar}>
        <button type="button" style={styles.backButton} onClick={() => navigate(-1)}>
          ← Назад
        </button>
      </div>

      <div style={styles.card}>
        <div style={styles.avatar}>
          {logoSrc ? (
            <img src={logoSrc} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            initialsOf(org.name)
          )}
        </div>
        <div style={styles.name}>{org.name}</div>
        {org.isOfficial && (
          <div style={{ textAlign: 'center' }}>
            <span style={styles.badge}>Официальная организация</span>
          </div>
        )}
        {org.address && (
          <div style={{ ...styles.contactRow, justifyContent: 'center', marginTop: 8 }}>
            📍 {org.address}
          </div>
        )}
      </div>

      {org.description && (
        <div style={styles.card}>
          <div style={styles.sectionTitle}>Описание</div>
          <div style={styles.body}>{org.description}</div>
        </div>
      )}

      {(org.contacts || org.socialMediaLink) && (
        <div style={styles.card}>
          <div style={styles.sectionTitle}>Контакты</div>
          {org.contacts && <div style={styles.contactRow}>{org.contacts}</div>}
          {org.socialMediaLink && (
            <div style={styles.contactRow}>
              <a href={org.socialMediaLink} target="_blank" rel="noopener noreferrer" style={styles.link}>
                {org.socialMediaLink}
              </a>
            </div>
          )}
        </div>
      )}

      <div style={styles.card}>
        <div style={styles.sectionTitle}>Активные мероприятия ({org.events.length})</div>
        {org.events.length === 0 ? (
          <div style={{ fontSize: 14, color: C.textSec }}>Активных мероприятий нет</div>
        ) : (
          org.events.map((ev) => (
            <div
              key={ev.id}
              style={styles.eventCard}
              onClick={() => navigate(`/events/${ev.id}`)}
              role="button"
            >
              <div style={styles.eventName}>{ev.name}</div>
              <div style={styles.eventMeta}>
                {formatEventDate(ev.eventDate)} · {ev.city}
              </div>
              {excerpt(ev.description) && <div style={styles.eventDesc}>{excerpt(ev.description)}</div>}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default OrganizationProfile;