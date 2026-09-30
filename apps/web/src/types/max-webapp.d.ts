interface MaxWebAppUser {
  id: number;
  first_name: string;
  last_name: string;
  username?: string | null;
  language_code?: string;
  photo_url?: string | null;
}

interface MaxWebAppInitDataUnsafe {
  query_id?: string;
  auth_date: number;
  hash: string;
  user: MaxWebAppUser;
  chat?: {
    id: number;
    type: 'DIALOG' | 'CHAT' | 'CHANNEL';
  };
  start_param?: string;
}

interface MaxWebAppContactResult {
  phone?: string;
  authDate?: string;
  hash?: string;
  error?: { code: string };
}

interface MaxWebApp {
  initData: string;
  initDataUnsafe: MaxWebAppInitDataUnsafe;
  platform?: string;
  version?: string;
  ready?: () => void;
  expand?: () => void;
  requestContact?: () => Promise<MaxWebAppContactResult>;
}

interface Window {
  WebApp?: MaxWebApp;
}