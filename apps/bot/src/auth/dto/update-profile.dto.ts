export interface UpdateProfileDto {
  // --- Волонтёр ---
  firstName?: string;
  lastName?: string;
  middleName?: string;
  birthDate?: string; // ISO "2000-05-15"

  // --- Организация ---
  organizationName?: string;
  description?: string;
  contacts?: string;
  socialMediaLink?: string;
  logoUrl?: string;

  // --- Общее (геолокация) ---
  city?: string;
  address?: string;
}