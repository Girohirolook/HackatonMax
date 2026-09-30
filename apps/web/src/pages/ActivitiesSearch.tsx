import { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { Typography } from '@maxhub/max-ui';
import { searchEvents, type EventCard } from '../lib/api';

const C = {
  accent: '#0077FF',
  text: '#1A1D21',
  textSec: '#6E7681',
  border: '#E6E9ED',
  card: '#FFFFFF',
  muted: '#F7F8FA',
  success: '#1E8E3E',
  successBg: '#E6F4EA',
  danger: '#D93025',
};

const AGE_OPTIONS: Array<{ value: string; label: string }> = [
  { value: '', label: 'Любой возраст' },
  { value: '12', label: 'От 12 лет' },
  { value: '14', label: 'От 14 лет' },
  { value: '16', label: 'От 16 лет' },
  { value: '18', label: 'От 18 лет' },
  { value: '25', label: 'От 25 лет' },
];

const styles = {
  root: { maxWidth: 920, margin: '0 auto', padding: '8px 4px 32px' },
  searchRow: {
    display: 'flex',
    gap: 8,
    alignItems: 'center',
    marginBottom: 16,
  },
  searchWrap: { position: 'relative' as const, flex: 1 },
  input: {
    width: '100%',
    padding: '12px 14px',
    fontSize: 15,
    color: C.text,
    border: `1px solid ${C.border}`,
    borderRadius: 12,
    boxSizing: 'border-box' as const,
    outline: 'none',
    background: '#fff',
  },
  loader: {
    position: 'absolute' as const,
    right: 14,
    top: 12,
    color: C.textSec,
    fontSize: 13,
  },
  filterBtn: (hasActive: boolean) => ({
    width: 44,
    height: 44,
    borderRadius: '50%',
    border: `1px solid ${hasActive ? C.accent : C.border}`,
    background: hasActive ? '#F0F6FF' : '#fff',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    position: 'relative' as const,
  }),
  filterIcon: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 3,
    alignItems: 'center',
  },
  filterLine: (active: boolean) => ({
    width: 16,
    height: 2,
    borderRadius: 1,
    background: active ? C.accent : C.textSec,
  }),
  filterDot: {
    position: 'absolute' as const,
    top: 6,
    right: 6,
    width: 8,
    height: 8,
    borderRadius: '50%',
    background: C.accent,
    border: '2px solid #fff',
  },
  activeFiltersRow: {
    display: 'flex',
    gap: 6,
    marginBottom: 12,
    flexWrap: 'wrap' as const,
  },
  activeFilterChip: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    padding: '4px 10px',
    fontSize: 12,
    fontWeight: 600,
    color: C.accent,
    background: '#F0F6FF',
    border: `1px solid ${C.accent}`,
    borderRadius: 999,
  },
  sectionTitle: { fontSize: 15, fontWeight: 600, color: C.text, margin: '4px 0 10px' },
  list: { display: 'flex', flexDirection: 'column' as const, gap: 10 },
  card: {
    padding: 14,
    border: `1px solid ${C.border}`,
    borderRadius: 12,
    background: C.card,
    cursor: 'pointer',
  },
  nameRow: {
    display: 'flex',
    gap: 8,
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  name: { fontSize: 16, fontWeight: 600, color: C.text, lineHeight: 1.3, flex: 1 },
  pill: (kind: 'active' | 'past' | 'free' | 'full') => ({
    flexShrink: 0,
    fontSize: 11,
    fontWeight: 600,
    padding: '2px 8px',
    borderRadius: 999,
    border: `1px solid ${C.border}`,
    background:
      kind === 'active' ? C.successBg : kind === 'free' ? C.successBg : kind === 'full' ? '#FDECEA' : '#F7F8FA',
    color:
      kind === 'active' ? C.success : kind === 'free' ? C.success : kind === 'full' ? '#D93025' : C.textSec,
  }),
  meta: { fontSize: 13, color: C.textSec, marginTop: 2 },
  desc: { fontSize: 13, color: C.textSec, marginTop: 6, lineHeight: 1.45 },
  footer: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: 12,
    fontSize: 13,
    color: C.textSec,
    marginTop: 8,
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

  // ===== Bottom sheet =====
  overlay: {
    position: 'fixed' as const,
    inset: 0,
    background: 'rgba(0,0,0,0.45)',
    zIndex: 100,
    display: 'flex',
    alignItems: 'flex-start',   // ← прижимаем к верху
    justifyContent: 'center',
  },
  sheet: {
    width: '100%',
    maxWidth: 640,
    background: C.card,
    borderBottomLeftRadius: 20,    // ← закругления теперь снизу
    borderBottomRightRadius: 20,
    padding: '20px 20px 24px',
    boxShadow: '0 8px 30px rgba(0,0,0,0.15)',  // ← тень вниз
    maxHeight: '85vh',
    overflowY: 'auto' as const,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    background: C.border,
    margin: '0 auto 16px',
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: 700,
    color: C.text,
    marginBottom: 16,
  },
  sheetLabel: {
    display: 'block',
    marginBottom: 6,
    fontSize: 13,
    fontWeight: 600,
    color: C.textSec,
  },
  sheetInput: {
    width: '100%',
    padding: '10px 12px',
    fontSize: 14,
    color: C.text,
    border: `1px solid ${C.border}`,
    borderRadius: 10,
    boxSizing: 'border-box' as const,
    outline: 'none',
    background: '#fff',
    marginBottom: 14,
  },
  sheetRow: {
    display: 'flex',
    gap: 8,
    marginBottom: 14,
  },
  sheetHalf: { flex: 1 },
  sheetCheckbox: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '10px 12px',
    border: `1px solid ${C.border}`,
    borderRadius: 10,
    background: '#fff',
    fontSize: 14,
    color: C.text,
    cursor: 'pointer',
    marginBottom: 14,
  },
  sheetButtons: {
    display: 'flex',
    gap: 8,
    marginTop: 8,
  },
  sheetPrimary: {
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
  sheetSecondary: {
    padding: '12px 20px',
    fontSize: 15,
    fontWeight: 600,
    color: C.text,
    background: C.muted,
    border: `1px solid ${C.border}`,
    borderRadius: 10,
    cursor: 'pointer',
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

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
}

function excerpt(text: string | null, len = 140): string | null {
  if (!text) return null;
  const t = text.trim();
  return t.length <= len ? t : t.slice(0, len).trimEnd() + '…';
}

interface Filters {
  city: string;
  fromDate: string;
  toDate: string;
  minAge: string;
  hasFreeSlots: boolean;
  sortBy: 'date' | 'freeSlots';
}

const EMPTY_FILTERS: Filters = {
  city: '',
  fromDate: '',
  toDate: '',
  minAge: '',
  hasFreeSlots: false,
  sortBy: 'date',
};

function SearchRow({ ev }: { ev: EventCard }) {
  const navigate = useNavigate();
  const free = Math.max(0, ev.requiredVolunteersCount - ev.registeredCount);
  return (
    <div style={styles.card} onClick={() => navigate(`/events/${ev.id}`)} role="button">
      <div style={styles.nameRow}>
        <div style={styles.name}>{ev.name}</div>
        <span style={styles.pill(ev.status !== 'completed' ? 'active' : 'past')}>
          {ev.status === 'upcoming' ? 'Предстоит' : ev.status === 'ongoing' ? 'Идёт' : 'Завершено'}
        </span>
      </div>
      <div style={styles.meta}>
        {formatEventDate(ev.eventDate)}
        {ev.endTime && ` — ${formatTime(ev.endTime)}`}
        {' · '}
        {ev.city ?? ev.address ?? ''}
        {ev.minAge ? ` · ${ev.minAge}+` : ''}
      </div>
      {excerpt(ev.description) && <div style={styles.desc}>{excerpt(ev.description)}</div>}
      <div style={styles.footer}>
        <span>
          Волонтёры: {ev.registeredCount} из {ev.requiredVolunteersCount}
        </span>
        {ev.status !== 'completed' && (
          <span style={styles.pill(free > 0 ? 'free' : 'full')}>
            {free > 0 ? `Свободно: ${free}` : 'Мест нет'}
          </span>
        )}
      </div>
    </div>
  );
}

function ActivitiesSearch() {
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [draftFilters, setDraftFilters] = useState<Filters>(EMPTY_FILTERS);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const [events, setEvents] = useState<EventCard[] | null>(null);
  const [loading, setLoading] = useState(true);

  const sheetRef = useRef<HTMLDivElement | null>(null);
  const touchStartY = useRef<number | null>(null);
  const isDragging = useRef(false);
  const [dragOffset, setDragOffset] = useState(0);
  // Есть ли активные фильтры (не считая сортировки по умолчанию)
  const hasActiveFilters =
    !!filters.city ||
    !!filters.fromDate ||
    !!filters.toDate ||
    !!filters.minAge ||
    filters.hasFreeSlots ||
    filters.sortBy !== 'date';

  // Количество активных фильтров для бейджа
  // Поиск с дебаунсом
  useEffect(() => {
    const state = { cancelled: false };
    setLoading(true);
    const t = window.setTimeout(async () => {
      try {
        const res = await searchEvents({
          query: query || undefined,
          city: filters.city || undefined,
          fromDate: filters.fromDate || undefined,
          toDate: filters.toDate || undefined,
          minAge: filters.minAge ? parseInt(filters.minAge, 10) : undefined,
          hasFreeSlots: filters.hasFreeSlots || undefined,
          sortBy: filters.sortBy,
          sortOrder: 'asc',
        });
        if (!state.cancelled) setEvents(res.events);
      } catch (e) {
        console.error('Search failed:', e);
        if (!state.cancelled) setEvents([]);
      } finally {
        if (!state.cancelled) setLoading(false);
      }
    }, 350);
    return () => {
      state.cancelled = true;
      window.clearTimeout(t);
    };
  }, [query, filters]);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
    isDragging.current = false;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartY.current === null) return;
    const sheet = sheetRef.current;
    if (!sheet) return;

    // Если контент панели проскроллен — не мешаем скроллу
    if (sheet.scrollTop > 0) return;

    const deltaY = touchStartY.current - e.touches[0].clientY; // > 0 = свайп вверх
    if (deltaY > 0) {
      isDragging.current = true;
      setDragOffset(deltaY);
    }
  };

  const handleTouchEnd = () => {
    if (isDragging.current && dragOffset > 90) {
      setFiltersOpen(false);
    }
    setDragOffset(0);
    touchStartY.current = null;
    isDragging.current = false;
  };

  const openFilters = () => {
    setDraftFilters(filters);
    setFiltersOpen(true);
  };

  const applyFilters = () => {
    setFilters(draftFilters);
    setFiltersOpen(false);
  };

  const resetFilters = () => {
    setDraftFilters(EMPTY_FILTERS);
  };

  const removeFilter = (key: keyof Filters) => {
    setFilters((prev) => ({
      ...prev,
      [key]: key === 'hasFreeSlots' ? false : key === 'sortBy' ? 'date' : '',
    }));
  };

  const hasQueryOrFilters = query.trim().length > 0 || hasActiveFilters;

  return (
    <div style={styles.root}>
      <Typography.Headline variant="large-strong" style={{ marginBottom: 12 }}>
        Поиск мероприятий
      </Typography.Headline>

      {/* Поиск + кнопка фильтров */}
      <div style={styles.searchRow}>
        <div style={styles.searchWrap}>
          <input
            style={styles.input}
            value={query}
            placeholder="Название или описание"
            onChange={(e) => setQuery(e.target.value)}
          />
          {loading && <span style={styles.loader}>…</span>}
        </div>
        <button
          type="button"
          style={styles.filterBtn(hasActiveFilters)}
          onClick={openFilters}
          aria-label="Фильтры"
        >
          <div style={styles.filterIcon}>
            <div style={styles.filterLine(hasActiveFilters)} />
            <div style={styles.filterLine(hasActiveFilters)} />
            <div style={styles.filterLine(hasActiveFilters)} />
          </div>
          {hasActiveFilters && <span style={styles.filterDot} />}
        </button>
      </div>

      {/* Активные фильтры как чипсы */}
      {hasActiveFilters && (
        <div style={styles.activeFiltersRow}>
          {filters.city && (
            <span style={styles.activeFilterChip} onClick={() => removeFilter('city')}>
              📍 {filters.city} ✕
            </span>
          )}
          {(filters.fromDate || filters.toDate) && (
            <span
              style={styles.activeFilterChip}
              onClick={() => {
                removeFilter('fromDate');
                removeFilter('toDate');
              }}
            >
              📅 {filters.fromDate || '…'} — {filters.toDate || '…'} ✕
            </span>
          )}
          {filters.minAge && (
            <span style={styles.activeFilterChip} onClick={() => removeFilter('minAge')}>
              👤 {AGE_OPTIONS.find((o) => o.value === filters.minAge)?.label ?? `${filters.minAge}+`} ✕
            </span>
          )}
          {filters.hasFreeSlots && (
            <span style={styles.activeFilterChip} onClick={() => removeFilter('hasFreeSlots')}>
              🎟 Со свободными местами ✕
            </span>
          )}
          {filters.sortBy === 'freeSlots' && (
            <span style={styles.activeFilterChip} onClick={() => removeFilter('sortBy')}>
              ↕ По свободным местам ✕
            </span>
          )}
        </div>
      )}

      <div style={styles.sectionTitle}>
        {hasQueryOrFilters
          ? `Результаты поиска: ${events?.length ?? 0}`
          : 'Ближайшие мероприятия'}
      </div>

      {loading && <div style={styles.empty}>Загрузка…</div>}
      {!loading && events && events.length === 0 && (
        <div style={styles.empty}>
          {hasQueryOrFilters
            ? 'Ничего не найдено. Попробуйте изменить фильтры.'
            : 'Ближайших мероприятий пока нет.'}
        </div>
      )}
      {!loading && events && events.length > 0 && (
        <div style={styles.list}>
          {events.map((ev) => (
            <SearchRow key={ev.id} ev={ev} />
          ))}
        </div>
      )}

      {/* Bottom sheet с фильтрами */}
      {filtersOpen &&
        createPortal(
          <div style={styles.overlay} onClick={() => setFiltersOpen(false)}>
            <div
              ref={sheetRef}
              style={{
                ...styles.sheet,
                transform: dragOffset > 0 ? `translateY(-${dragOffset}px)` : undefined,
                transition: isDragging.current ? 'none' : 'transform 0.25s ease',
              }}
              onClick={(e) => e.stopPropagation()}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
            >
              <div style={styles.sheetTitle}>Фильтры и сортировка</div>

              <label style={styles.sheetLabel}>Город</label>
              <input
                style={styles.sheetInput}
                value={draftFilters.city}
                placeholder="Например: Москва"
                onChange={(e) =>
                  setDraftFilters((f) => ({ ...f, city: e.target.value }))
                }
              />

              <div style={styles.sheetRow}>
                <div style={styles.sheetHalf}>
                  <label style={styles.sheetLabel}>С даты</label>
                  <input
                    style={styles.sheetInput}
                    type="date"
                    value={draftFilters.fromDate}
                    onChange={(e) =>
                      setDraftFilters((f) => ({ ...f, fromDate: e.target.value }))
                    }
                  />
                </div>
                <div style={styles.sheetHalf}>
                  <label style={styles.sheetLabel}>По дату</label>
                  <input
                    style={styles.sheetInput}
                    type="date"
                    value={draftFilters.toDate}
                    onChange={(e) =>
                      setDraftFilters((f) => ({ ...f, toDate: e.target.value }))
                    }
                  />
                </div>
              </div>
              
              <label style={styles.sheetLabel}>Мой возраст</label>
              <select
                style={styles.sheetInput}
                value={draftFilters.minAge}
                onChange={(e) =>
                  setDraftFilters((f) => ({ ...f, minAge: e.target.value }))
                }
              >
                {AGE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>

              <label style={styles.sheetCheckbox}>
                <input
                  type="checkbox"
                  checked={draftFilters.hasFreeSlots}
                  onChange={(e) =>
                    setDraftFilters((f) => ({
                      ...f,
                      hasFreeSlots: e.target.checked,
                    }))
                  }
                />
                Только со свободными местами
              </label>

              <label style={styles.sheetLabel}>Сортировка</label>
              <select
                style={styles.sheetInput}
                value={draftFilters.sortBy}
                onChange={(e) =>
                  setDraftFilters((f) => ({
                    ...f,
                    sortBy: e.target.value as 'date' | 'freeSlots',
                  }))
                }
              >
                <option value="date">По дате</option>
                <option value="freeSlots">По свободным местам</option>
              </select>

              <div style={styles.sheetButtons}>
                <button type="button" style={styles.sheetSecondary} onClick={resetFilters}>
                  Сбросить
                </button>
                <button type="button" style={styles.sheetPrimary} onClick={applyFilters}>
                  Применить
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}

export default ActivitiesSearch;