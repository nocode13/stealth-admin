import { isAxiosError } from 'axios';

/** Тело ошибки NestJS: `message` — строка ИЛИ массив строк. */
interface NestErrorBody {
  statusCode?: number;
  message?: string | string[];
  error?: string;
}

const DEFAULT_MESSAGE = 'Что-то пошло не так. Попробуйте ещё раз.';

/** Достаёт человекочитаемое сообщение из ошибки axios/NestJS. */
export function getApiErrorMessage(error: unknown, fallback: string = DEFAULT_MESSAGE): string {
  if (isAxiosError(error)) {
    const data = error.response?.data as NestErrorBody | undefined;
    const message = data?.message;

    if (Array.isArray(message) && message.length > 0) return message.join('\n');
    if (typeof message === 'string' && message) return message;
    if (error.response == null) return 'Нет связи с сервером. Проверьте интернет.';
  }

  return fallback;
}
