import { createHmac } from 'node:crypto';

export interface MaxBridgeUser {
  id: number;
  first_name: string;
  last_name: string;
  username?: string | null;
  language_code?: string;
  photo_url?: string | null;
}

export interface ValidatedInitData {
  user: MaxBridgeUser;
  authDate: number;
  queryId?: string;
}

/**
 * Валидирует initData из MAX WebApp по официальному алгоритму:
 * https://dev.max.ru/docs/webapps/validation
 *
 * secret_key = HMAC-SHA256("WebAppData", BOT_TOKEN)
 * hash       = hex(HMAC-SHA256(secret_key, launch_params))
 */
export function validateMaxInitData(
  initData: string,
  botToken: string,
): ValidatedInitData {
  // 1. Разбиваем на пары key=value
  const params: [string, string][] = initData
    .split('&')
    .filter(Boolean)
    .map((pair) => {
      const eqIdx = pair.indexOf('=');
      if (eqIdx === -1) return [pair, ''];
      return [
        pair.slice(0, eqIdx),
        decodeURIComponent(pair.slice(eqIdx + 1)),
      ] as [string, string];
    });

  // 2. Достаём hash, проверяем что он ровно один
  const hashEntries = params.filter(([key]) => key === 'hash');
  if (hashEntries.length !== 1) {
    throw new Error('initData: hash отсутствует или дублируется');
  }
  const originalHash = hashEntries[0][1];

  // 3. Убираем hash, сортируем по алфавиту
  const sortedParams = params
    .filter(([key]) => key !== 'hash')
    .sort((a, b) => a[0].localeCompare(b[0]));

  // 4. Формируем launch_params: key1=value1\nkey2=value2
  const launchParams = sortedParams
    .map(([key, value]) => `${key}=${value}`)
    .join('\n');

  // 5. secret_key = HMAC-SHA256("WebAppData", BOT_TOKEN)
  const secretKey = createHmac('sha256', 'WebAppData')
    .update(botToken)
    .digest();

  // 6. signature = hex(HMAC-SHA256(secret_key, launch_params))
  const signature = createHmac('sha256', secretKey)
    .update(launchParams)
    .digest('hex');

  // 7. Сравниваем
  if (signature !== originalHash) {
    throw new Error('initData: подпись недействительна');
  }

  // 8. Достаём user
  const userEntry = sortedParams.find(([key]) => key === 'user');
  if (!userEntry) {
    throw new Error('initData: отсутствует поле user');
  }

  const user: MaxBridgeUser = JSON.parse(userEntry[1]);

  const authDateEntry = sortedParams.find(([key]) => key === 'auth_date');
  const queryIdEntry = sortedParams.find(([key]) => key === 'query_id');

  return {
    user,
    authDate: authDateEntry ? Number(authDateEntry[1]) : 0,
    queryId: queryIdEntry?.[1],
  };
}