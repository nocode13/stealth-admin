# stealth-admin

Веб-админка (панель управления) к бэкенду **stealth-backend**. Разделы: заказы, категории,
каталог, продавцы, продажные позиции.

## Стек

- **Vite 8** (Rolldown) + **React 19** + **TypeScript**, пакетный менеджер **pnpm**.
- **eslint 10** (flat config) + **prettier**; `eslint-plugin-boundaries` **проверяет слои FSD** —
  нарушение импорта вверх по слоям падает как ошибка линтера.
- **React Compiler** включён (`@rolldown/plugin-babel` + `reactCompilerPreset`).
- **effector** + **effector-react** (+ **patronum**, **effector-refetch**) — состояние и запросы.
- **atomic-router** + **atomic-router-react** — роутинг и guard'ы.
- **antd 6** + **@ant-design/icons** — UI.
- **react-hook-form** + **zod v4** — формы и валидация.
- **axios** — HTTP.

## Архитектура (Feature-Sliced Design)

Слои: `app` → `pages` → `widgets` → `features` → `entities` → `shared`.
Импорт-alias `@/*` → `src/*` (`tsconfig.app.json` + `vite.config.ts`).

```
src/
  app/        app.tsx (провайдеры + RouterProvider + contextHolder'ы), model.ts (инициализация роутера)
  pages/      auth, home, categories, catalog, listing, sellers, orders, order-detail,
              forbidden, not-found. Каждая — ленивая (code-split):
                model.ts        factory({ route }) с guard'ом и запросами
                ui/ui.tsx       export component + createModel (строго эти два имени)
                ui/index.ts     createLazyPage + withSuspense → { route, view, layout }
              index.ts — createRoutesView([...])
  widgets/    layout/ — сайдбар, меню (MENU_ROUTES + $activeRoutes), кнопки привязки TG и выхода
  features/   auth/login, auth/logout, auth/link-telegram,
              category/creat-edit (sic — так называется директория), order/change-status,
              catalog/creat-edit, catalog/delete, listing/creat-edit, listing/delete,
              seller/change-status
  entities/   user/ ($user, $session, sessionFx, chainAuthorized/chainAnonymous),
              category/, catalog/, listing/, seller/, order/
  shared/
    api/      instances.ts (axios base, withCredentials), по файлу на ресурс
              (auth, category, catalog, listing, orders, sellers), error.ts, types.ts,
              index.ts (export const api = { ... })
    lib/      form.ts (мост react-hook-form ↔ effector), create-lazy-page.tsx,
              message.ts и notification.ts (effector-операторы antd), disclosure.ts,
              f-retry.ts, format.ts
    ui/       form/ (text-field, select-field), status-tag.tsx, with-suspense, with-title
    config/   routing.ts (router + routes), pagination.ts (PAGE_SIZE), env.ts, system.ts
```

Конвенции (зеркалят соседний **stealth-mobile**):
- zod-схема живёт рядом с `model.ts` фичи; тип формы = `z.infer<typeof schema>` как `FormValues`.
- resolver — `standardSchemaResolver` из `@hookform/resolvers/standard-schema` (НЕ `zodResolver`);
  импорт zod — `import { z } from 'zod/v4'`, использовать `z.email()`.
- переиспользуемые контролы форм — в `shared/ui/form/`.
- защита роутов — через `userModel.chainAuthorized` / `chainAnonymous` в `pages/*/model.ts`,
  а не через JSX-обёртки. Роли — параметром `roles: [...]`.
- `tsconfig` включает `erasableSyntaxOnly` — **нельзя `enum`** (используем const-объект + union,
  см. `SessionStatus`) и `verbatimModuleSyntax` — импорт типов через `import type`.
- фича с UI экспортирует namespace-объект: `{ View, Trigger?, model: { ... } }`.
- удаление сущности — свой паттерн (`features/{catalog,listing}/delete`): без модалки/disclosure,
  подтверждение через antd `Popconfirm` прямо в таблице; `deleteTriggered<T>` → `attach`-эффект →
  `mutated<T>` для инвалидации списка на странице. Экспортирует `{ View: <EntityDeleteButton>, model }`.

**Пагинация — только курсорная**, без offset и без серверной сортировки: `<Table pagination={false}>`
плюс кнопка «Загрузить ещё», пока `nextCursor !== null`.

**Нестыковка конвенций в `shared/api`, которую надо копировать как есть:** list-методы возвращают
**сырой axios-response** (`base.get<CursorPage<T>>(...)`), а мутации разворачивают
(`.then((r) => r.data)`). Поэтому модели читают `{ result: { data } }` у списков и `result` у мутаций.

## Заказы

Единственный раздел с фильтрами и поллингом — до него ни того, ни другого в проекте не было.

- `pages/orders` — список. Фильтр по статусу (antd `Segmented` + стор `$status` в factory),
  смена фильтра инвалидирует список через тот же `purge`, что и мутация статуса.
- **Поллинг новых заказов**: `patronum.interval` раз в 30 с, пока роут открыт (`start` на
  `opened`, `stop` на `closed` — иначе интервал стучит в фоне). Появившиеся id сравниваются
  с предыдущими, и на разницу показывается antd-нотификация через `shared/lib/notification.ts`
  — оператор был написан давно, но до заказов не вызывался ни разу. WebSocket'ов в бэкенде
  нет и заводить их ради одного экрана не стали.
- `pages/order-detail` — **первая в проекте страница с параметром роута** (`route.$params`);
  раньше всё редактировалось в модалках. Состав, контакты, таймлайн (`antd Steps`) и ссылка
  на **маршрут** в Яндекс.Картах по `deliveryLat/Lng`.
- `features/order/change-status` — модалка. Список доступных статусов берётся из
  `entities/order.ALLOWED_TRANSITIONS`. Это **копия** карты переходов с бэкенда
  (`src/orders/order-status.ts`) — она нужна лишь чтобы не показывать заведомо недоступные
  варианты; источник правды остаётся на сервере, при расхождении придёт 400.

## Каталог, продажные позиции, продавцы

- **Категория** (`features/category/creat-edit`) — эталонный create/edit-паттерн, скопированный
  для каталога и листингов. У категории на бэкенде нет DELETE — удаления там и не будет.
- **Каталог** (`features/catalog/creat-edit` + `features/catalog/delete`) — полный CRUD.
  Категория для позиции выбирается селектом (свой fetch на `api.category.findAll({ limit: 100 })`
  при каждом открытии модалки, отфильтрован по `status === 'APPROVED'` — переиспользовать стор
  страницы `pages/categories` нельзя, он инкапсулирован в её `factory()`). Статус (`ReviewStatus`)
  меняется **отдельным** эндпоинтом `PATCH /catalog/:id/status` (в отличие от category, где статус
  входит в обычный `update`) — поэтому в модели есть отдельный `updateStatusFx`, вызываемый после
  `updateFx`, только если роль `SUPER_ADMIN` и статус реально изменился. Изображение —
  `POST /catalog/:id/image` (multipart, только в edit-режиме — эндпоинту нужен существующий `id`);
  на фронте `Content-Type` инстанса `base` явно сбрасывается в `undefined` на этот запрос, чтобы
  браузер сам проставил multipart-boundary.
- **Продажные позиции** (`features/listing/creat-edit` + `features/listing/delete`) — полный CRUD,
  доступно только продавцу (`roles: ['SELLER']`), без разделения мастер/продавец, поэтому Edit/Delete
  в таблице показаны без доп. ролевых гейтов. `status` (`ListingStatus`) — обычное поле формы в обоих
  режимах: у листинга нет review-процесса и transition-map на бэкенде, значение принимается любое.
  `price`/`stock` — числовые поля через `TextField` + `z.coerce.number()` (отдельный `NumberField`
  сознательно не заводили).
- **Продавцы** (`features/seller/change-status`, копия `features/order/change-status`) — на бэкенде
  нет create/update/delete для продавца (регистрируются отдельно), доступна только смена статуса.

## Auth (важно)

Бэкенд использует **сессионную httpOnly cookie** (`connect.sid`), НЕ JWT. Поэтому:
- axios-инстанс с `withCredentials: true`; **токены не храним**, refresh не нужен.
- проверка сессии = `GET /admin/auth/me` (`sessionFx`).

Эндпоинты (`shared/api/auth.ts`), база `VITE_API_BASE_URL` (по умолчанию `http://localhost:3000`,
без префикса):
- `POST /admin/auth/login` — `{ email, password }` (строго эти поля) → `User` + cookie.
- `GET  /admin/auth/me` → `User` (200) / 401.
- `POST /admin/auth/logout` → `{ success: true }`.
- `POST /admin/auth/telegram/link` → `{ nonce, botUrl, expiresIn }` — ссылка на бота.

`User = { id, phone, email, role, sellerId, telegramId }`,
`role ∈ 'SUPER_ADMIN' | 'SELLER' | 'CUSTOMER'` (роль используется строкой по месту).

**Привязка Telegram** (`features/auth/link-telegram`, кнопка в сайдбаре). Продавец входит сюда
по паролю, поэтому бот не знает, кому слать заказы. Кнопка выдаёт ссылку/QR на
`t.me/<bot>?start=sel_<nonce>`; после Start заказы приходят продавцу в чат, и статусы он может
менять прямо там.

**Один Telegram = одна роль.** Аккаунт, который уже вошёл в мобилку покупателем, привязать
к магазину нельзя — и наоборот, под привязанным к магазину Telegram нельзя войти в мобилку.
Отказ приходит **в чат бота** (не в админку: привязку подтверждает бот, а не эта форма),
поэтому модалка просто ждёт — после Start обнови страницу и увидишь «Telegram привязан»
либо прежнюю кнопку. Кому нужны обе роли — заводит второй Telegram под магазин.
Подробности и тексты — `stealth-backend/src/common/telegram-identity.ts`.

## Команды

- `pnpm dev` — дев-сервер на **5173** (этот origin уже в CORS бэкенда).
- `pnpm build` — `tsc -b && vite build`.
- `pnpm lint:ts` — `tsc --noEmit`; `pnpm lint:eslint` — eslint; `pnpm lint:all` — оба параллельно.

Тестовые логины (сид бэкенда, пароль у всех `password123`):
`admin@stealth.local` (SUPER_ADMIN), `seller@stealth.local` и `seller2@stealth.local` (SELLER).
Двух продавцов держим намеренно — на них проверяется разбиение заказа и скоуп видимости.

## Поддержание этого файла

После каждого значимого изменения архитектуры, конвенций или структуры проекта (новый раздел,
новый паттерн фичи, смена соглашения в `shared/api` и т.п.) — обновляй этот файл, чтобы он не
расходился с кодом. Точечные правки внутри уже описанного паттерна отдельного упоминания не
требуют — обновлять нужно то, что меняет саму карту проекта.

## Соседние проекты-референсы

- `../stealth-backend` — NestJS бэкенд (порт 3000, `pnpm start:dev`, `pnpm db:seed`).
- `../stealth-mobile` — Expo-приложение; источник конвенций RHF+zod+effector+FSD.
- `../../zordoc/cash-frontend` — источник паттернов effector + atomic-router (guard'ы, роутинг).
