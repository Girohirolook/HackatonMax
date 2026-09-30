export interface CreateEventDto {
  name: string;
  description?: string;
  organizationalDetails?: string;
  criteria?: string;
  city?: string;
  address: string;
  requiredVolunteersCount?: number;
  eventDate?: string; // ISO
  photos?: string[];  // url'ы после загрузки
  endTime?: string;    // ← добавить
  minAge?: number;              // ← добавить
}