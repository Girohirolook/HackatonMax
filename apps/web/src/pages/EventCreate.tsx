import { useEffect, useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { Button, Typography } from '@maxhub/max-ui';
import { createEvent, updateEvent, fetchEventDetails, type CreateEventPayload } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { AddressInput } from '../components/AddressInput';
import { useToast } from '../context/ToastContext';

const C = {
  accent: '#0077FF',
  text: '#1A1D21',
  textSec: '#6E7681',
  border: '#E6E9ED',
  card: '#FFFFFF',
  danger: '#D93025',
  dangerBg: '#FDECEA',
};

const styles = {
  root: { maxWidth: 920, margin: '0 auto', padding: '8px 4px 32px' },
  card: {
    background: C.card,
    border: `1px solid ${C.border}`,
    borderRadius: 12,
    padding: 20,
    marginBottom: 12,
  },
  sectionTitle: { fontSize: 15, fontWeight: 600, color: C.text, margin: '0 0 12px' },
  label: { display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 600, color: C.textSec },
  hint: { fontSize: 12, color: C.textSec, margin: '-2px 0 10px' },
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
  errorBox: {
    background: C.dangerBg,
    color: C.danger,
    border: `1px solid ${C.border}`,
    padding: '10px 14px',
    borderRadius: 10,
    marginBottom: 12,
    fontSize: 14,
  },
  buttonRow: { display: 'flex', gap: 8, marginTop: 16 },
};

function EventCreate() {
  const { data } = useAuth();
  const navigate = useNavigate();
  const { id } = useParams();
  const isOrg = data?.user?.role === 'organization_creator';
  const isEdit = !!id;
  const editEventId = Number(id);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [organizationalDetails, setOrganizationalDetails] = useState('');
  const [criteria, setCriteria] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [count, setCount] = useState('1');
  const [eventDate, setEventDate] = useState('');
  const [endTime, setEndTime] = useState('');
  const [minAge, setMinAge] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(isEdit);
  const { showError } = useToast();


  // Загрузка данных для редактирования
  useEffect(() => {
    if (!isEdit) return;
    let cancelled = false;
    setLoading(true);
    fetchEventDetails(editEventId)
      .then((res) => {
        if (cancelled) return;
        setName(res.name);
        setDescription(res.description || '');
        setOrganizationalDetails(res.organizationalDetails || '');
        setCriteria(res.criteria || '');
        setAddress(res.address || '');
        setCity(res.city || '');
        setCount(String(res.requiredVolunteersCount));
        const d = new Date(res.eventDate);
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        const hh = String(d.getHours()).padStart(2, '0');
        const min = String(d.getMinutes()).padStart(2, '0');
        setEventDate(`${yyyy}-${mm}-${dd}T${hh}:${min}`);
        if (res.endTime) {
          const e = new Date(res.endTime);
          const eyyyy = e.getFullYear();
          const emm = String(e.getMonth() + 1).padStart(2, '0');
          const edd = String(e.getDate()).padStart(2, '0');
          const ehh = String(e.getHours()).padStart(2, '0');
          const emin = String(e.getMinutes()).padStart(2, '0');
          setEndTime(`${eyyyy}-${emm}-${edd}T${ehh}:${emin}`);
        }
        if (res.minAge) {
          setMinAge(String(res.minAge));
        }
      })
      .catch((err: any) => {
        if (!cancelled) showError(err.message || 'Не удалось загрузить мероприятие');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isEdit, editEventId]);

  if (!isOrg) return <Navigate to="/events/my" replace />;

  const handleAddress = (a: {
    address: string;
    city: string;
    latitude?: number;
    longitude?: number;
  }) => {
    setAddress(a.address);
    setCity(a.city);
  };

  const handleSubmit = async () => {
    const trimmedName = name.trim();
    const trimmedAddress = address.trim();
    const trimmedCity = city.trim();
    const n = parseInt(count, 10);

    if (!trimmedName) {
      showError('Укажите название мероприятия');
      return;
    }
    if (!eventDate) {
      showError('Укажите дату и время проведения');
      return;
    }
    if (!trimmedAddress) {
      showError('Укажите адрес');
      return;
    }
    if (!Number.isFinite(n) || n < 1) {
      showError('Нужен хотя бы 1 волонтёр');
      return;
    }

    setSaving(true);
    try {
      const payload: CreateEventPayload = {
        name: trimmedName,
        description: description.trim() || undefined,
        organizationalDetails: organizationalDetails.trim() || undefined,
        criteria: criteria.trim() || undefined,
        city: trimmedCity || undefined,
        address: trimmedAddress,
        
        requiredVolunteersCount: n,
        eventDate: new Date(eventDate).toISOString(),
        endTime: endTime ? new Date(endTime).toISOString() : undefined,  // ← добавить
        minAge: minAge ? parseInt(minAge, 10) : undefined,  // ← добавить
      };

      if (isEdit) {
        await updateEvent(editEventId, payload);
        navigate(`/events/${editEventId}`);
      } else {
        await createEvent(payload);
        navigate('/events/my');
      }
    } catch (err: any) {
      showError(
        err.message ||
          (isEdit ? 'Ошибка сохранения мероприятия' : 'Ошибка создания мероприятия'),
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={styles.root}>
        <div style={{ textAlign: 'center', padding: 40, color: C.textSec }}>
          Загрузка…
        </div>
      </div>
    );
  }

  return (
    <div style={styles.root}>
      <Typography.Headline variant="large-strong" style={{ marginBottom: 12 }}>
        {isEdit ? 'Редактирование мероприятия' : 'Новое мероприятие'}
      </Typography.Headline>

      {/* {error && <div style={styles.errorBox}>{error}</div>} */}

      <div style={styles.card}>
        <div style={styles.sectionTitle}>Основное</div>

        <label style={styles.label}>Название *</label>
        <input
          style={styles.input}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Субботник в парке Горького"
        />

        <label style={styles.label}>Описание</label>
        <textarea
          style={{ ...styles.input, minHeight: 90, resize: 'vertical' }}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Коротко о том, что будет происходить"
        />

        <label style={styles.label}>Дата и время проведения *</label>
        <input
          style={styles.input}
          type="datetime-local"
          value={eventDate} 
          onChange={(e) => setEventDate(e.target.value)}
        />
        <label style={styles.label}>Дата и время окончания</label>
        <input
          style={styles.input}
          type="datetime-local"
          value={endTime}
          onChange={(e) => setEndTime(e.target.value)}
        />

        <label style={styles.label}>Количество нужных волонтёров *</label>
        <input
          style={styles.input}
          type="number"
          min={1}
          value={count}
          onChange={(e) => setCount(e.target.value)}
        />

        <label style={styles.label}>Минимальный возраст (лет)</label>
        <input
          style={styles.input}
          type="number"
          min={0}
          value={minAge}
          onChange={(e) => setMinAge(e.target.value)}
          placeholder="Например: 16"
        />
      </div>

      <div style={styles.card}>
        <div style={styles.sectionTitle}>Место проведения</div>
        <label style={styles.label}>Адрес *</label>
        <AddressInput value={address} onChange={handleAddress} />
        <div style={styles.hint}>
          Начните вводить адрес — появятся подсказки. Город определится автоматически.
        </div>
      </div>

      <div style={styles.card}>
        <div style={styles.sectionTitle}>Для волонтёров</div>

        <label style={styles.label}>Организационные моменты</label>
        <div style={styles.hint}>
          Этот текст будет показан всем зарегистрировавшимся волонтёрам
        </div>
        <textarea
          style={{ ...styles.input, minHeight: 90, resize: 'vertical' }}
          value={organizationalDetails}
          onChange={(e) => setOrganizationalDetails(e.target.value)}
          placeholder="Сбор у главного входа в 10:00, перчатки выдаём"
        />

        <label style={styles.label}>Критерии волонтёров</label>
        <div style={styles.hint}>Например: от 16 лет, нужен паспорт и справка</div>
        <textarea
          style={{ ...styles.input, minHeight: 70, resize: 'vertical' }}
          value={criteria}
          onChange={(e) => setCriteria(e.target.value)}
          placeholder="От 16 лет, при себе паспорт и медицинская справка"
        />
      </div>

      <div style={styles.buttonRow}>
        <Button variant="primary" onClick={handleSubmit} disabled={saving}>
          {saving ? (isEdit ? 'Сохранение…' : 'Создание…') : (isEdit ? 'Сохранить изменения' : 'Создать мероприятие')}
        </Button>
        <Button
          variant="secondary"
          onClick={() => navigate(isEdit ? `/events/${editEventId}` : '/events/my')}
          disabled={saving}
        >
          Отмена
        </Button>
      </div>
    </div>
  );
}

export default EventCreate;