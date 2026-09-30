export const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

/** Очистка технического мусора из сообщения об ошибке */
function cleanErrorMessage(err: any): string {
  // 1. Если это HTTP-ответ с JSON-ошибкой
  if (err?.response?.data?.message) {
    const msg = err.response.data.message;
    if (typeof msg === 'string') return msg;
    if (Array.isArray(msg)) return msg.join('; ');
  }

  // 2. Если есть обычное message
  if (err?.message) {
    const msg = String(err.message);
    
    // Убираем технические детали
    if (msg.includes('Failed to fetch')) return 'Ошибка сети. Проверьте подключение.';
    if (msg.includes('NetworkError')) return 'Ошибка сети. Проверьте подключение.';
    if (msg.includes('timeout')) return 'Превышено время ожидания. Попробуйте снова.';
    if (msg.includes('401') || msg.includes('Unauthorized')) return 'Требуется авторизация.';
    if (msg.includes('403') || msg.includes('Forbidden')) return 'Доступ запрещён.';
    if (msg.includes('404') || msg.includes('Not Found')) return 'Данные не найдены.';
    if (msg.includes('500') || msg.includes('Internal Server Error')) return 'Ошибка сервера. Попробуйте позже.';
    
    // Убираем stack traces и коды
    if (msg.includes('at ') && msg.includes('.js:')) return 'Неизвестная ошибка.';
    if (/^\[.*\]/.test(msg)) return 'Неизвестная ошибка.';
    
    return msg;
  }

  // 3. Строковая ошибка
  if (typeof err === 'string') return err;

  return 'Неизвестная ошибка.';
}

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!res.ok) {
    let errorData: any = null;
    try {
      errorData = await res.json();
    } catch {
      // Игнорируем ошибки парсинга
    }

    const error: any = new Error(
      errorData?.message || `HTTP ${res.status}: ${res.statusText}`,
    );
    error.response = { data: errorData, status: res.status };
    throw error;
  }

  return res.json();
}

// Глобальный обработчик необработанных ошибок
window.addEventListener('unhandledrejection', (event) => {
  const message = cleanErrorMessage(event.reason);
  console.error('Unhandled error:', event.reason);
  
  // Показываем toast, если контекст доступен
  const toastEvent = new CustomEvent('global-error', { detail: message });
  window.dispatchEvent(toastEvent);
});

// ---------- Типы ----------

export interface VolunteerProfile {
  firstName: string;
  lastName: string;
  middleName: string | null;
  birthDate: string;
  city: string | null;
  address: string | null;
}

export interface OrganizationProfile {
  name: string;
  description: string | null;
  contacts: string | null;
  socialMediaLink: string | null;
  logoUrl: string | null;
  isOfficial: boolean;
  hasDocuments: boolean;
  city: string | null;
  address: string | null;
}

export interface CheckResponse {
  isNewUser: boolean;
  maxUser?: {
    id: number;
    firstName: string;
    lastName: string;
    username: string | null;
    photoUrl: string | null;
  };
  user?: {
    id: number;
    role: string;
    maxBridgeId: string;
    volunteer: VolunteerProfile | null;
    organization: OrganizationProfile | null;
  };
}

export interface RegisterPayload {
  role: 'volunteer' | 'organization_creator';
  firstName?: string;
  lastName?: string;
  middleName?: string;
  birthDate?: string;
  city?: string;
  address?: string;
  organizationName?: string;
  description?: string;
  contacts?: string;
  socialMediaLink?: string;
  logoUrl?: string;
  documentsZipFilename?: string;
  phone?: string,
}



export interface UpdateProfilePayload {
  firstName?: string;
  lastName?: string;
  middleName?: string;
  birthDate?: string;
  organizationName?: string;
  description?: string;
  contacts?: string;
  socialMediaLink?: string;
  logoUrl?: string;
  city?: string;
  address?: string;
}

// ---------- Методы ----------

export function getInitData(): string {
  return window.WebApp?.initData ?? '';
}

export function checkUser(): Promise<CheckResponse> {
  return request<CheckResponse>('/api/auth/check', {
    method: 'POST',
    body: JSON.stringify({ initData: getInitData() }),
  });
}

export function registerUser(payload: RegisterPayload) {
  return request<{ id: number; role: string }>('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ initData: getInitData(), ...payload }),
  });
}

export function updateProfile(payload: UpdateProfilePayload) {
  return request<{ role: string; updated: boolean }>('/api/auth/profile', {
    method: 'PATCH',
    body: JSON.stringify({ initData: getInitData(), ...payload }),
  });
}

// ---------- Загрузка файлов ----------

async function uploadRequest<T>(path: string, fd: FormData): Promise<T> {
  const url = `${API_URL}${path}`;
  const file = fd.get('file');
  let res: Response;
  try {
    res = await fetch(url, { method: 'POST', body: fd });
  } catch (error) {
    const reason = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
    console.error('Ошибка сетевого запроса загрузки файла', {
      url,
      fileName: file instanceof File ? file.name : undefined,
      fileSize: file instanceof File ? file.size : undefined,
      error,
    });
    throw new Error(`Не удалось загрузить файл: ${reason} (URL: ${url})`);
  }
  if (!res.ok) {
    const b = await res.json().catch(() => ({}));
    throw new Error(b.message || `Ошибка загрузки (HTTP ${res.status})`);
  }
  return res.json() as Promise<T>;
}


export function uploadDocuments(file: File, initData: string) {
  const fd = new FormData();
  fd.append('file', file);
  fd.append('initData', initData);
  return uploadRequest<{ filename: string }>('/api/auth/upload/documents', fd);
}

export interface OrgEvent {
  id: number;
  name: string;
  description: string | null;
  city: string | null;
  eventDate: string;
  status: 'active' | 'completed';
  photos: string[];
}

export function fetchOrganizationEvents(): Promise<{
  total: number;
  events: OrgEvent[];
}> {
  return request<{ total: number; events: OrgEvent[] }>(
    '/api/events/by-organization',
    {
      method: 'POST',
      body: JSON.stringify({ initData: getInitData() }),
    },
  );
}

// ---------- Мои мероприятия ----------

export interface EventCard {
  id: number;
  name: string;
  description: string | null;
  organizationalDetails: string | null;
  criteria: string | null;
  city: string | null;
  address: string | null;
  eventDate: string;
  endTime: string | null;          
  minAge: number | null;
  requiredVolunteersCount: number;
  registeredCount: number;
  status: 'upcoming' | 'ongoing' | 'completed';   // ← три статуса
  photos: string[];
  registrationStatus?: string | null;
  pendingCount?: number;
}

export interface MyEventsResponse {
  role: string;
  active: EventCard[];
  past: EventCard[];
}

export function fetchMyEvents(): Promise<MyEventsResponse> {
  return request<MyEventsResponse>('/api/events/my', {
    method: 'POST',
    body: JSON.stringify({ initData: getInitData() }),
  });
}


export interface CreateEventPayload {
  name: string;
  description?: string;
  organizationalDetails?: string;
  criteria?: string;
  city?: string;
  address?: string;
  requiredVolunteersCount: number;
  eventDate: string;
  endTime?: string;   // ← добавить
  minAge?: number;
}

export function createEvent(payload: CreateEventPayload): Promise<{ id: number }> {
  return request<{ id: number }>('/api/events/create', {
    method: 'POST',
    body: JSON.stringify({ initData: getInitData(), ...payload }),
  });
}

// ---------- Детали мероприятия ----------

export interface EventOrganization {
  id: number;
  name: string;
  logoUrl: string | null;
  isOfficial: boolean;
}

export interface EventRegistration {
  status: 'pending' | 'approved' | 'rejected' | 'completed';
  registeredAt: string;
}

export interface EventDetails extends EventCard {
  organization: EventOrganization;
  freeSlots: number;
  registration: EventRegistration | null;
  isOwner: boolean;
}

export function fetchEventDetails(eventId: number): Promise<EventDetails> {
  return request<EventDetails>('/api/events/details', {
    method: 'POST',
    body: JSON.stringify({ initData: getInitData(), eventId }),
  });
}

export function registerForEvent(eventId: number): Promise<{ status: string }> {
  return request<{ status: string }>('/api/events/register-for-event', {
    method: 'POST',
    body: JSON.stringify({ initData: getInitData(), eventId }),
  });
}

export function cancelRegistration(eventId: number): Promise<{ cancelled: boolean }> {
  return request<{ cancelled: boolean }>('/api/events/cancel-registration', {
    method: 'POST',
    body: JSON.stringify({ initData: getInitData(), eventId }),
  });
}

// ---------- DaData адреса ----------

export interface AddressVariant {
  value: string;
  city: string | null;
}

export function suggestAddress(
  query: string,
): Promise<{ suggestions: AddressVariant[]; degraded?: boolean }> {
  return request<{ suggestions: AddressVariant[]; degraded?: boolean }>(
    '/api/dadata/suggest',
    { method: 'POST', body: JSON.stringify({ initData: getInitData(), query }) },
  );
}

export function cleanAddress(
  address: string,
): Promise<{ address: AddressVariant | null; degraded?: boolean }> {
  return request<{ address: AddressVariant | null; degraded?: boolean }>(
    '/api/dadata/clean',
    { method: 'POST', body: JSON.stringify({ initData: getInitData(), address }) },
  );
}

export function searchEvents(filters: {
  query?: string;
  city?: string;
  fromDate?: string;
  toDate?: string;
  minAge?: number;
  hasFreeSlots?: boolean;
  sortBy?: 'date' | 'freeSlots';
  sortOrder?: 'asc' | 'desc';
}): Promise<{ events: EventCard[] }> {
  return request<{ events: EventCard[] }>('/api/events/search', {
    method: 'POST',
    body: JSON.stringify({ initData: getInitData(), ...filters }),
  });
}

// ---------- Заявки на мероприятие ----------

export function verifyContact(
  phone: string,
): Promise<{ success: boolean; phone: string }> {
  return request<{ success: boolean; phone: string }>('/api/auth/verify-contact', {
    method: 'POST',
    body: JSON.stringify({ initData: getInitData(), phone }),
  });
}

export interface ApplicationItem {
  id: number;
  status: 'pending' | 'approved' | 'rejected' | 'completed';
  registeredAt: string;
  volunteer: {
    firstName: string;
    lastName: string;
    middleName: string | null;
    city: string;
    address: string | null;
    participationsCount: number;
    phone: string | null;
  };
}

export function fetchApplications(
  eventId: number,
): Promise<{ applications: ApplicationItem[] }> {
  return request<{ applications: ApplicationItem[] }>('/api/events/applications', {
    method: 'POST',
    body: JSON.stringify({ initData: getInitData(), eventId }),
  });
}

export function applicationAction(
  registrationId: number,
  action: 'approve' | 'reject',
): Promise<{ status: string }> {
  return request<{ status: string }>('/api/events/application-action', {
    method: 'POST',
    body: JSON.stringify({ initData: getInitData(), registrationId, action }),
  });
}

// ---------- Профиль организации ----------

export interface OrganizationProfileData {
  id: number;
  name: string;
  description: string | null;
  contacts: string | null;
  socialMediaLink: string | null;
  logoUrl: string | null;
  isOfficial: boolean;
  city: string | null;
  address: string | null;
  events: EventCard[];
}

export function fetchOrganizationProfile(
  organizationId: number,
): Promise<OrganizationProfileData> {
  return request<OrganizationProfileData>('/api/events/organization-profile', {
    method: 'POST',
    body: JSON.stringify({ initData: getInitData(), organizationId }),
  });
}

// ---------- Главная волонтёра ----------

export interface RecommendationCard extends EventCard {
  organizationName: string;
}

export interface VolunteerHomeResponse {
  daysSinceRegistration: number;
  participationsCount: number;
  myEvents: EventCard[];
  recommendations: RecommendationCard[];
}

export function fetchVolunteerHome(): Promise<VolunteerHomeResponse> {
  return request<VolunteerHomeResponse>('/api/events/volunteer-home', {
    method: 'POST',
    body: JSON.stringify({ initData: getInitData() }),
  });
}

// ---------- Главная организации ----------

export interface OrganizationHomeStats {
  fillRate: number;
  avgFillDays: number | null;
  repeatVolunteersPercent: number;
}

export interface OrganizationHomeResponse {
  activeEventsCount: number;
  pendingApplicationsCount: number;
  activeEvents: EventCard[];
  stats: OrganizationHomeStats;
}

export function fetchOrganizationHome(): Promise<OrganizationHomeResponse> {
  return request<OrganizationHomeResponse>('/api/events/organization-home', {
    method: 'POST',
    body: JSON.stringify({ initData: getInitData() }),
  });
}

export function broadcastToApproved(
  eventId: number,
  message: string,
): Promise<{ sent: number; total: number }> {
  return request<{ sent: number; total: number }>('/api/events/broadcast', {
    method: 'POST',
    body: JSON.stringify({ initData: getInitData(), eventId, message }),
  });
}

export interface BroadcastHistoryItem {
  id: number;
  text: string;
  sentCount: number;
  totalCount: number;
  createdAt: string;
}

export function fetchBroadcastHistory(
  eventId: number,
): Promise<{ items: BroadcastHistoryItem[] }> {
  return request<{ items: BroadcastHistoryItem[] }>('/api/events/broadcast-history', {
    method: 'POST',
    body: JSON.stringify({ initData: getInitData(), eventId }),
  });
}

export function approveAllApplications(
  eventId: number,
): Promise<{ approved: number; sent: number }> {
  return request<{ approved: number; sent: number }>(
    '/api/events/applications-approve-all',
    {
      method: 'POST',
      body: JSON.stringify({ initData: getInitData(), eventId }),
    },
  );
}

export function updateEvent(
  eventId: number,
  data: CreateEventPayload,
): Promise<{ id: number }> {
  return request<{ id: number }>('/api/events/update', {
    method: 'POST',
    body: JSON.stringify({ initData: getInitData(), eventId, ...data }),
  });
}

export function deleteEvent(eventId: number): Promise<{ deleted: boolean }> {
  return request<{ deleted: boolean }>('/api/events/delete', {
    method: 'POST',
    body: JSON.stringify({ initData: getInitData(), eventId }),
  });
}

export function fetchBotInfo(): Promise<{ username: string | null }> {
  return request<{ username: string | null }>('/api/events/bot-info', {
    method: 'POST',
    body: JSON.stringify({ initData: getInitData() }),
  });
}

export function deleteApplication(
  registrationId: number,
): Promise<{ deleted: boolean }> {
  return request<{ deleted: boolean }>('/api/events/application-delete', {
    method: 'POST',
    body: JSON.stringify({ initData: getInitData(), registrationId }),
  });
}

export { cleanErrorMessage };