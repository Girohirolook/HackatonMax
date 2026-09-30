export interface RegisterDto {
  role: 'volunteer' | 'organization_creator';

  // --- Для волонтёра ---
  firstName?: string;
  lastName?: string;
  middleName?: string;
  birthDate?: string;
  city?: string;
  address?: string;
  phone?: string;   // ← добавить

  // --- Для организации ---
  organizationName?: string;
  description?: string;
  contacts?: string;
  socialMediaLink?: string;

  logoUrl?: string;
  documentsZipFilename?: string;
}