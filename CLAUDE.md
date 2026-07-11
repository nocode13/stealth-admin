# stealth-admin

Веб-админка (панель управления) к бэкенду **stealth-backend**. Сейчас реализованы страница
логина и флоу авторизации; остальные разделы добавляются поверх этой основы.

## Стек

- **Vite 8** (Rolldown) + **React 19** + **TypeScript**, пакетный менеджер **pnpm**, линтер **oxlint**.
- **effector** + **effector-react** (+ **patronum**) — состояние.
- **atomic-router** + **atomic-router-react** — роутинг и guard'ы.
- **antd 6** + **@ant-design/icons** — UI.
- **react-hook-form** + **zod v4** — формы и валидация.
- **axios** — HTTP.

## Архитектура (Feature-Sliced Design)

Слои: `app` → `pages` → `features` → `entities` → `shared`. Импорт-alias `@/*` → `src/*`
(настроен в `tsconfig.app.json` и `vite.config.ts`).

```
src/
  app/        app.tsx (провайдеры + RouterProvider), model.ts (инициализация истории роутера)
  pages/      auth/, home/ — ленивые (code-split): model.ts (factory с guard),
              ui/ui.tsx (export component + createModel), ui/index.ts (createLazyPage+withSuspense → { route, view })
              index.ts — createRoutesView([...])
  features/   auth/login (schema+model+ui), auth/logout
  entities/   user/ — $user, $session, sessionFx (getMe), chainAuthorized/chainAnonymous
  shared/
    api/      instances.ts (axios base), auth.ts (auth = { login, getMe, logout }),
              error.ts, types.ts (User, Role, LoginPayload), index.ts (export const api = { auth })
    lib/      form.ts — мост react-hook-form ↔ effector (createForm + useBindFormWithModel)
              create-lazy-page.tsx — ленивая страница + guard (порт из cash-frontend / @dmed/frontend-core)
              message.ts — effector-оператор antd-сообщений (message({clock, errorHandle}) + useBindMessageApi)
    ui/       form/text-field.tsx (useController + antd Input), with-suspense.tsx, full-screen-loader.tsx
    config/   routing.ts (router + routes), env.ts (API_URL), system.ts (appStarted)
```

Конвенции (зеркалят соседний **stealth-mobile**):
- zod-схема живёт рядом с `model.ts` фичи; тип формы = `z.infer<typeof schema>` как `FormValues`.
- resolver — `standardSchemaResolver` из `@hookform/resolvers/standard-schema` (НЕ `zodResolver`);
  импорт zod — `import { z } from 'zod/v4'`, использовать `z.email()`.
- переиспользуемые контролы форм — в `shared/ui/form/`.
- защита роутов — через `userModel.chainAuthorized` / `chainAnonymous` в `pages/*/model.ts`,
  а не через JSX-обёртки.
- `tsconfig` включает `erasableSyntaxOnly` — **нельзя `enum`** (используем const-объект + union,
  см. `SessionStatus`) и `verbatimModuleSyntax` — импорт типов через `import type`.

## Auth (важно)

Бэкенд использует **сессионную httpOnly cookie** (`connect.sid`), НЕ JWT. Поэтому:
- axios-инстанс с `withCredentials: true`; **токены не храним**, refresh не нужен.
- проверка сессии = `GET /admin/auth/me` (`sessionFx`).

Эндпоинты (`shared/api/auth.ts`), база `VITE_API_BASE_URL` (по умолчанию `http://localhost:3000`,
без префикса):
- `POST /admin/auth/login` — `{ email, password }` (строго эти поля) → `User` + cookie.
- `GET  /admin/auth/me` → `User` (200) / 401.
- `POST /admin/auth/logout` → `{ success: true }`.

`User = { id, phone, email, role, sellerId }`, `role ∈ 'SUPER_ADMIN' | 'SELLER' | 'CUSTOMER'`
(роль используется строкой по месту, без карт доступа).

## Команды

- `pnpm dev` — дев-сервер на **5173** (этот origin уже в CORS бэкенда).
- `pnpm build` — `tsc -b && vite build`.
- `pnpm lint` — oxlint.

Тестовый логин (сид бэкенда): `admin@stealth.local` / `password123` (SUPER_ADMIN).

## Соседние проекты-референсы

- `../stealth-backend` — NestJS бэкенд (порт 3000, `pnpm start:dev`, `pnpm db:seed`).
- `../stealth-mobile` — Expo-приложение; источник конвенций RHF+zod+effector+FSD.
- `../../zordoc/cash-frontend` — источник паттернов effector + atomic-router (guard'ы, роутинг).
