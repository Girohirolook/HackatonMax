import { useState, type ChangeEvent } from 'react';
import { Button, Typography } from '@maxhub/max-ui';
import {
  registerUser,
  checkUser,
  uploadDocuments,
  getInitData,
  type RegisterPayload,
} from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { AddressInput } from '../components/AddressInput';

// ---------- Константы ----------

const DOCS_MAX = 20 * 1024 * 1024; // 20 МБ

// ---------- Стили ----------

const styles = {
  container: {
    maxWidth: 560,
    margin: '0 auto',
    padding: 24,
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column' as const,
  },
  progressContainer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    gap: 8,
  },
  progressDot: (active: boolean, completed: boolean) => ({
    width: 12,
    height: 12,
    borderRadius: '50%',
    background: completed || active ? '#007AFF' : '#E0E0E0',
    transition: 'all 0.3s ease',
    flexShrink: 0,
  }),
  progressLine: (completed: boolean) => ({
    flex: 1,
    height: 2,
    background: completed ? '#007AFF' : '#E0E0E0',
    maxWidth: 60,
  }),
  card: {
    background: 'white',
    borderRadius: 16,
    padding: 24,
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
    marginBottom: 24,
  },
  input: {
    width: '100%',
    padding: '12px 16px',
    fontSize: 16,
    border: '1px solid #E0E0E0',
    borderRadius: 12,
    boxSizing: 'border-box' as const,
    marginBottom: 16,
    outline: 'none',
  },
  label: {
    display: 'block',
    marginBottom: 8,
    fontWeight: 600,
    fontSize: 14,
    color: '#333',
  },
  roleButton: (selected: boolean) => ({
    flex: 1,
    padding: '20px 16px',
    borderRadius: 12,
    border: `2px solid ${selected ? '#007AFF' : '#E0E0E0'}`,
    background: selected ? '#F0F7FF' : 'white',
    cursor: 'pointer',
    transition: 'all 0.2s',
    textAlign: 'center' as const,
  }),
  buttonRow: {
    display: 'flex',
    gap: 12,
    marginTop: 24,
  },
  errorBox: {
    background: '#FEE',
    color: '#C00',
    padding: '12px 16px',
    borderRadius: 12,
    marginBottom: 16,
    fontSize: 14,
  },
  subtitle: {
    color: '#666',
    marginBottom: 24,
    fontSize: 15,
    marginTop: 4,
  },
  // --- Новые стили для файлов ---
  avatarCircle: {
    width: 72,
    height: 72,
    borderRadius: '50%',
    background: '#F0F2F5',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    flexShrink: 0,
    border: '1px solid #E0E0E0',
  },
  uploadButton: {
    display: 'inline-block',
    padding: '10px 16px',
    fontSize: 14,
    border: '1px solid #007AFF',
    borderRadius: 12,
    background: 'white',
    color: '#007AFF',
    cursor: 'pointer',
    fontWeight: 600,
  },
  hint: { fontSize: 12, color: '#999', margin: '6px 0 0' },
  note: {
    fontSize: 13,
    color: '#666',
    background: '#F5F7FA',
    padding: '10px 12px',
    borderRadius: 10,
    marginBottom: 10,
    lineHeight: 1.5,
  },
  fileInput: {
    width: '100%',
    fontSize: 14,
    padding: '10px 12px',
    border: '1px dashed #B9C4D0',
    borderRadius: 12,
    background: '#FAFBFC',
    boxSizing: 'border-box' as const,
    marginBottom: 8,
    cursor: 'pointer',
  },
  fileOk: { fontSize: 13, color: '#2E7D32', marginBottom: 0 },
  removeLink: {
    background: 'none',
    border: 'none',
    color: '#C00',
    cursor: 'pointer',
    fontSize: 13,
    marginLeft: 8,
    textDecoration: 'underline',
    padding: 0,
  },
};

// ---------- Типы ----------

type Role = 'volunteer' | 'organization_creator';

interface FormData {
  role: Role;
  firstName: string;
  lastName: string;
  middleName: string;
  birthDate: string;
  city: string;
  address: string;
  organizationName: string;
  description: string;
  contacts: string;
  socialMediaLink: string;
}

// ---------- Компонент ----------

function Registration() {
  const { data, markRegistered } = useAuth();

  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Файлы организации (необязательные)
  const [docsFile, setDocsFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);

  const [phone, setPhone] = useState<string | null>(null);
  const [phoneError, setPhoneError] = useState<string | null>(null);

  const [formData, setFormData] = useState<FormData>({
    role: 'volunteer',
    firstName: data?.maxUser?.firstName ?? '',
    lastName: data?.maxUser?.lastName ?? '',
    middleName: '',
    birthDate: '',
    city: '',
    address: '',
    organizationName: '',
    description: '',
    contacts: '',
    socialMediaLink: '',
  });

  const isVolunteer = formData.role === 'volunteer';

  const totalSteps = isVolunteer ? 5 : 4;

  const updateField = <K extends keyof FormData>(field: K, value: FormData[K]) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  // ---------- Файлы ----------

  const handleDocsChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileError(null);
    const ext = file.name.toLowerCase().split('.').pop() || '';
    const isAllowed =
      file.type === 'application/zip' ||
      file.type === 'application/x-zip-compressed' ||
      file.type === 'application/pdf' ||
      ext === 'zip' ||
      ext === 'pdf';
    if (!isAllowed) {
      setFileError('Документы: ожидается ZIP-архив или PDF-файл');
      return;
    }
    if (file.size > DOCS_MAX) {
      setFileError('Документы: файл больше 20 МБ');
      return;
    }
    setDocsFile(file);
  };

  const clearDocs = () => setDocsFile(null);

  const requestPhone = async () => {
    setPhoneError(null);
    const wa = window.WebApp;
    if (!wa?.requestContact) {
      setPhoneError('Запрос номера не поддерживается в этой версии клиента');
      return;
    }
    try {
      const res = await wa.requestContact();
      if (res.error) {
        if (res.error.code === 'client.request_phone.user_refused_provide_phone_number') {
          setPhoneError('Вы отказались предоставить номер. Можно пропустить шаг.');
        } else {
          setPhoneError('Не удалось запросить номер телефона');
        }
        return;
      }
      if (!res.phone) {
        setPhoneError('Не удалось получить номер телефона');
        return;
      }
      // Просто сохраняем в state — в БД уйдёт вместе с регистрацией
      setPhone(res.phone);
    } catch (err: any) {
      setPhoneError(err.message || 'Не удалось получить номер');
    }
  };

  const handleAddress = (a: { address: string; city: string; latitude?: number; longitude?: number }) => {
    updateField('address', a.address);
    updateField('city', a.city);
  };

  // ---------- Навигация ----------

  const canGoNext = (): boolean => {
    if (step === 0) return true;
    if (step === 1) {
      if (isVolunteer) return !!formData.firstName && !!formData.lastName;
      return !!formData.organizationName;
    }
    if (step === 2) {
      if (isVolunteer) return !!formData.birthDate && !!formData.address;
      return !!formData.address;
    }
    // Шаг 3 для волонтёра (телефон) можно пропустить
    return true;
  };

  const handleNext = () => {
    if (step < totalSteps - 1 && canGoNext()) setStep(step + 1);
  };

  const handleBack = () => {
    if (step > 0) setStep(step - 1);
  };

  const handleSubmit = async () => {
    setError(null);
    setSubmitting(true);

    try {
      // 1. Сначала загружаем файлы (если есть)
      let documentsZipFilename: string | undefined;

      if (docsFile) {
        const r = await uploadDocuments(docsFile, getInitData());
        documentsZipFilename = r.filename;
      }

      // 2. Затем регистрация
      const payload: RegisterPayload = {
        role: formData.role,
        firstName: formData.firstName,
        lastName: formData.lastName,
        middleName: formData.middleName || undefined,
        birthDate: formData.birthDate,
        city: formData.city,
        address: formData.address || undefined,
        organizationName: formData.organizationName,
        description: formData.description || undefined,
        contacts: formData.contacts || undefined,
        socialMediaLink: formData.socialMediaLink || undefined,
        phone: phone || undefined,
        documentsZipFilename,
      };

      await registerUser(payload);
      const freshData = await checkUser();
      markRegistered(freshData);
    } catch (err: any) {
      setError(err.message || 'Ошибка при регистрации');
    } finally {
      setSubmitting(false);
    }
  };

  // ---------- Шаги ----------

  const renderStep0 = () => (
    <div style={styles.card}>
      <Typography.Headline variant="large-strong">Кто вы?</Typography.Headline>
      <p style={styles.subtitle}>Выберите вашу роль</p>

      <div style={{ display: 'flex', gap: 12 }}>
        <div
          style={styles.roleButton(formData.role === 'volunteer')}
          onClick={() => updateField('role', 'volunteer')}
        >
          <div style={{ fontSize: 32, marginBottom: 8 }}>🙋</div>
          <Typography.Title variant="medium-strong">Волонтёр</Typography.Title>
          <p style={{ fontSize: 14, color: '#666', marginTop: 4, marginBottom: 0 }}>
            Хочу помогать на мероприятиях
          </p>
        </div>

        <div
          style={styles.roleButton(formData.role === 'organization_creator')}
          onClick={() => updateField('role', 'organization_creator')}
        >
          <div style={{ fontSize: 32, marginBottom: 8 }}>🏢</div>
          <Typography.Title variant="medium-strong">Организатор</Typography.Title>
          <p style={{ fontSize: 14, color: '#666', marginTop: 4, marginBottom: 0 }}>
            Создаю мероприятия
          </p>
        </div>
      </div>
    </div>
  );

  const renderStep1 = () => (
    <div style={styles.card}>
      <Typography.Headline variant="large-strong">
        {isVolunteer ? 'Основная информация' : 'Организация'}
      </Typography.Headline>
      <p style={styles.subtitle}>
        {isVolunteer ? 'Как к вам обращаться?' : 'Расскажите о вашей организации'}
      </p>

      {isVolunteer ? (
        <>
          <label style={styles.label}>Фамилия *</label>
          <input
            style={styles.input}
            value={formData.lastName}
            onChange={(e) => updateField('lastName', e.target.value)}
            placeholder="Иванов"
          />

          <label style={styles.label}>Имя *</label>
          <input
            style={styles.input}  
            value={formData.firstName}
            onChange={(e) => updateField('firstName', e.target.value)}
            placeholder="Иван"
          />

          <label style={styles.label}>Отчество</label>
          <input
            style={styles.input}
            value={formData.middleName}
            onChange={(e) => updateField('middleName', e.target.value)}
            placeholder="Иванович"
          />
        </>
      ) : (
        <>
          <label style={styles.label}>Название организации *</label>
          <input
            style={styles.input}
            value={formData.organizationName}
            onChange={(e) => updateField('organizationName', e.target.value)}
            placeholder='Фонд "Добрые дела"'
          />

          <label style={styles.label}>Описание</label>
          <textarea
            style={{ ...styles.input, minHeight: 100, resize: 'vertical' }}
            value={formData.description}
            onChange={(e) => updateField('description', e.target.value)}
            placeholder="Чем занимается ваша организация?"
          />

          {/* ===== СНИЗУ: документы для проверки ===== */}
          <label style={{ ...styles.label, marginTop: 8 }}>Документы для проверки</label>
          <p style={styles.note}>
            После проверки организации будет выдан статус официальной. Загрузка не
            обязательна. Формат: ZIP или PDF, до 20 МБ.
          </p>
          <input
            type="file"
            accept=".zip,.pdf,application/zip,application/pdf"
            style={styles.fileInput}
            onChange={handleDocsChange}
          />
          {docsFile && (
            <p style={styles.fileOk}>
              ✓ {docsFile.name} ({(docsFile.size / 1024 / 1024).toFixed(1)} МБ)
              <button type="button" onClick={clearDocs} style={styles.removeLink}>
                Убрать
              </button>
            </p>
          )}
        </>
      )}
    </div>
  );

  const renderStep2 = () => (
    <div style={styles.card}>
      <Typography.Headline variant="large-strong">Местоположение</Typography.Headline>
      <p style={styles.subtitle}>Где вы находитесь?</p>

      <label style={styles.label}>Адрес *</label>
      <AddressInput value={formData.address} onChange={handleAddress} />

      {isVolunteer && (
        <>
          <label style={{ ...styles.label, marginTop: 16 }}>Дата рождения *</label>
          <input
            style={styles.input}
            type="date"
            value={formData.birthDate}
            onChange={(e) => updateField('birthDate', e.target.value)}
          />
        </>
      )}

      {!isVolunteer && (
        <>
          <label style={{ ...styles.label, marginTop: 16 }}>Контакты</label>
          <input
            style={styles.input}
            value={formData.contacts}
            onChange={(e) => updateField('contacts', e.target.value)}
            placeholder="Телефон, email..."
          />

          <label style={styles.label}>Ссылка на соцсети</label>
          <input
            style={styles.input}
            value={formData.socialMediaLink}
            onChange={(e) => updateField('socialMediaLink', e.target.value)}
            placeholder="https://vk.com/..."
          />
        </>
      )}
    </div>
  );
  
    const renderPhoneStep = () => (
    <div style={styles.card}>
      <Typography.Headline variant="large-strong">Номер телефона</Typography.Headline>
      <p style={styles.subtitle}>
        Организаторы увидят ваш номер после одобрения заявки на мероприятие.
        Это необязательно.
      </p>
      {phone ? (
        <p style={{ ...styles.fileOk, fontSize: 14 }}>✓ Номер сохранён: {phone}</p>
      ) : (
        <>
          <button
            type="button"
            style={styles.uploadButton}
            onClick={requestPhone}
          >
            Поделиться номером телефона
          </button>
          <p style={styles.hint}>
            Номер запрашивается у клиента MAX и проверяется на соответствие аккаунту.
          </p>
        </>
      )}
      {phoneError && (
        <p style={{ color: '#C00', fontSize: 13, marginTop: 8 }}>{phoneError}</p>
      )}
    </div>
  );

  const renderStep3 = () => (
    <div style={styles.card}>
      <Typography.Headline variant="large-strong">Подтверждение</Typography.Headline>
      <p style={styles.subtitle}>Проверьте данные перед отправкой</p>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <div style={styles.avatarCircle}>
            <span style={{ fontSize: 24, color: 'white', fontWeight: 600, background: '#007AFF', width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {(isVolunteer ? formData.firstName : formData.organizationName).charAt(0) || '?'}
            </span>
        </div>
        <div>
          <Typography.Title variant="small-strong">
            {isVolunteer
              ? `${formData.firstName} ${formData.lastName}`
              : formData.organizationName}
          </Typography.Title>
          <p style={{ fontSize: 14, color: '#666', margin: 0 }}>
            {isVolunteer ? 'Волонтёр' : 'Организатор'}
          </p>
        </div>
      </div>

      <div
        style={{
          background: '#F5F5F5',
          padding: 16,
          borderRadius: 12,
          fontSize: 14,
          lineHeight: 1.6,
        }}
      >
        {isVolunteer ? (
          <>
            <div>
              <strong>ФИО:</strong> {formData.lastName} {formData.firstName}{' '}
              {formData.middleName}
            </div>
            <div>
              <strong>Дата рождения:</strong> {formData.birthDate}
            </div>
            <div>
              <strong>Город:</strong> {formData.city}
            </div>
            {formData.address && (
              <div>
                <strong>Адрес:</strong> {formData.address}
              </div>
            )}
            <div><strong>Телефон:</strong> {phone ?? '—'}</div>
          </>
        ) : (
          <>
            <div>
              <strong>Название:</strong> {formData.organizationName}
            </div>
            {formData.description && (
              <div>
                <strong>Описание:</strong> {formData.description}
              </div>
            )}
            <div>
              <strong>Город:</strong> {formData.city}
            </div>
            {formData.contacts && (
              <div>
                <strong>Контакты:</strong> {formData.contacts}
              </div>
            )}
            <div>
              <strong>Документы:</strong> {docsFile ? `✓ ${docsFile.name}` : '—'}
            </div>
          </>
        )}
      </div>
    </div>
  );

  const renderCurrentStep = () => {
    if (isVolunteer) {
      switch (step) {
        case 0: return renderStep0();
        case 1: return renderStep1();
        case 2: return renderStep2();
        case 3: return renderPhoneStep();
        case 4: return renderStep3();
        default: return null;
      }
    }
    switch (step) {
      case 0: return renderStep0();
      case 1: return renderStep1();
      case 2: return renderStep2();
      case 3: return renderStep3();
      default: return null;
    }
  };
  
  return (
    <div style={styles.container}>
      <div style={styles.progressContainer}>
        {Array.from({ length: totalSteps }).map((_, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
            <div style={styles.progressDot(i === step, i < step)} />
            {i < totalSteps - 1 && <div style={styles.progressLine(i < step)} />}
          </div>
        ))}
      </div>

      <p style={{ textAlign: 'center', color: '#999', marginBottom: 24, fontSize: 14 }}>
        Шаг {step + 1} из {totalSteps}
      </p>

      {error && <div style={styles.errorBox}>{error}</div>}
      {fileError && <div style={styles.errorBox}>{fileError}</div>}

      {renderCurrentStep()}

      <div style={styles.buttonRow}>
        {step > 0 && (
          <Button variant="secondary" onClick={handleBack} style={{ flex: 1 }}>
            ← Назад
          </Button>
        )}

        {step < totalSteps - 1 ? (
          <Button
            variant="primary"
            onClick={handleNext}
            disabled={!canGoNext()}
            style={{ flex: 1 }}
          >
            Далее →
          </Button>
        ) : (
          <Button
            variant="primary"
            onClick={handleSubmit}
            disabled={submitting}
            style={{ flex: 1 }}
          >
            {submitting ? 'Регистрация...' : 'Зарегистрироваться'}
          </Button>
        )}
      </div>
    </div>
  );
}

export default Registration;