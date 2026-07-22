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
  pages/      auth, home, categories, catalog, listing, sellers, seller-detail, orders,
              order-detail, forbidden, not-found. Каждая — ленивая (code-split):
                model.ts        factory({ route }) с guard'ом и запросами
                ui/ui.tsx       export component + createModel (строго эти два имени)
                ui/index.ts     createLazyPage + withSuspense → { route, view, layout }
              index.ts — createRoutesView([...])
  widgets/    layout/ — сайдбар, меню (MENU_ROUTES + $activeRoutes), кнопки привязки TG и выхода
  features/   auth/login, auth/logout, auth/link-telegram,
              category/creat-edit (sic — так называется директория), category/filter,
              order/change-status,
              catalog/creat-edit, catalog/delete, catalog/filter,
              listing/creat-edit, listing/delete, listing/filter,
              seller/creat-edit, seller/filter
  entities/   user/ ($user, $session, sessionFx, chainAuthorized/chainAnonymous),
              category/, catalog/, listing/, seller/, order/
  shared/
    api/      instances.ts (axios base, withCredentials), по файлу на ресурс
              (auth, category, catalog, listing, orders, sellers), error.ts, types.ts,
              index.ts (export const api = { ... })
    lib/      form.ts (мост react-hook-form ↔ effector), create-lazy-page.tsx,
              message.ts и notification.ts (effector-операторы antd), disclosure.ts,
              f-retry.ts, format.ts, options-factory.ts, text-factory.ts и number-factory.ts
              (генерик-фабрики значения фильтра — см. «Фильтры на списочных страницах» ниже)
    ui/       form/ (text-field, textarea-field, select-field), status-tag.tsx, with-suspense, with-title
    config/   routing.ts (router + routes), pagination.ts (PAGE_SIZE), env.ts, system.ts
```

Конвенции (зеркалят соседний **stealth-mobile**):
- zod-схема живёт рядом с `model.ts` фичи; тип формы = `z.infer<typeof schema>` как `FormValues`.
- resolver — `standardSchemaResolver` из `@hookform/resolvers/standard-schema` (НЕ `zodResolver`);
  импорт zod — `import { z } from 'zod/v4'`, использовать `z.email()`.
- переиспользуемые контролы форм — в `shared/ui/form/` (`TextField`, `TextAreaField`, `NumberField`,
  `SelectField`); многострочные поля (`description` и т.п.) — всегда `TextAreaField`, числовые
  (`price`, `stock` и т.п.) — всегда `NumberField` (antd `InputNumber`), однострочный `TextField`
  для них не используем.
- у каждого контрола в `shared/ui/form/` есть проп `required` (просто рисует красную `*` рядом
  с label, на валидацию не влияет) — **всегда проставлять его на полях, обязательных по смыслу**
  (в т.ч. если поле обязательно только в одном из режимов create/edit, как `ownerEmail`/`ownerPassword`
  у продавца при создании). Не забывать при добавлении новых полей в формы catalog/seller (и других).
- **gotcha zod v4**: `z.email().optional()` (и любой `.email()/.min()/...` + `.optional()`) пропускает
  только `undefined`, а не `''` — если поле скрыто в форме и дефолт `''`, валидация всё равно упадёт
  и сабмит молча не сработает. Для полей с форматной проверкой, которые могут прийти пустой строкой,
  оборачивать в `z.union([z.literal(''), z.email(...)]).optional()`.
- **переводы статусов — эталон `entities/category`** (`config.ts` + `ui.tsx` + `index.ts`):
  `config.ts` экспортирует `statusOptions: Record<Status, string>` (сами подписи) и хук
  `useStatusOptions()` (те же подписи в виде antd `SelectProps['options']`); `ui.tsx` — самодостаточный
  `StatusTag: React.FC<{ status }>`, берущий подпись из `statusOptions` (без пропа `labels` — в отличие
  от старого generic `shared/ui/status-tag.tsx`, который теперь используют только `entities/order`
  и `entities/{category,catalog,seller,listing}` больше не трогают); `index.ts` реэкспортирует
  `StatusTag` и собирает `<entity>Config = { statusOptions, useStatusOptions }` для использования в
  `creat-edit`-форме (`const statusOptions = <entity>Config.useStatusOptions()` вместо локального
  хардкода). Этому же паттерну следуют `entities/catalog`, `entities/seller`, `entities/listing` —
  разница только в содержимом `statusOptions`: у catalog/seller — настоящие русские подписи (как у
  category), у listing — **сознательно без перевода** (значение подписи = сырой enum), см. ниже.
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

## Фильтры на списочных страницах

Есть на `categories`, `catalog`, `listing`, `sellers` (везде, кроме `orders` — там свой
Segmented-фильтр по статусу, см. ниже). Эталон — `categories`, паттерн скопирован без изменений
в остальные три раздела.

- Значение каждого поля фильтра — это `shared/lib/text-factory.ts` (`textFactory`, для строкового
  поиска: `$value` обновляется сразу для контролируемого инпута, `debouncedChanged` — тот же
  `changed`, но через `patronum.debounce(300)`, и именно он идёт в `filtersChanged`) или
  `shared/lib/options-factory.ts` (`optionsFactory<T extends string | number>`, для селектов —
  статус, categoryId: `$value`/`changed`, без дебаунса). Обе фабрики принимают опциональный
  `reset: Event` для `$value.reinit`.
- Фича `features/<entity>/filter/`: `model.ts` собирает нужные `textFactory`/`optionsFactory`
  инстансы, `$filters = combine({...})`, `filtersChanged = merge([...changed-события...])`;
  `ui/ui.tsx` — компонент `View: React.FC<PropsWithChildren>` (antd `Row`/`Col` с `Input`/`Select`/
  `InputNumber`, `allowClear`), `children` — слот под кнопку «Создать» (рисуется в последней
  колонке); `index.ts` экспортирует `<Entity>Filters = { View, model: { $filters, filtersChanged } }`
  (сырые сторы/события отдельных полей наружу не отдаются). У catalog/listing в фильтре есть ещё
  `categoryId` (свой независимый fetch `api.category.findAll({ limit: 100, status: 'APPROVED' })`,
  запущенный сразу при импорте модуля — `fetchCategoriesQuery.start()` вне `sample`, без внешнего
  триггера; допустимо, т.к. `factory()`/фича-модуль — синглтон на всё время жизни приложения, см.
  `shared/lib/create-lazy-page.tsx`); у listing вдобавок `minPrice`/`maxPrice` — по одному
  `shared/lib/number-factory.ts` (`numberFactory`, зеркало `textFactory`, но `number | null`) на
  каждую границу диапазона.
- В `pages/<entity>/model.ts` фильтры подключаются через `sample`+`patronum.spread` (не `.on()`):
  `fetchPageQuery`-эффект принимает `{ cursor, filters }`, три отдельных `sample`
  — на `[authorizedRoute.opened, purge]` (первая страница), на `loadMoreClicked` (следующая
  страница текущего фильтра, `cursor: $nextCursor`) и отдельно на `Filters.model.filtersChanged`
  (**важно**: `cursor` тут всегда `undefined`, а не `$nextCursor` — иначе смена фильтра после
  подгрузки доп. страниц уйдёт под старым курсором вместо страницы 1; на это уже наступали при
  первой реализации в `categories`, фикс — разносить load-more и filters-changed по разным
  `sample`, не объединять в один clock-массив).
- `<entity>Config.useStatusOptions()` (см. «переводы статусов» выше) переиспользуется в
  `filter/ui/ui.tsx` — отдельного маппинга под фильтр заводить не нужно.
- `shared/api/types.ts`: `FindCategoriesParams`/`FindCatalogParams`/`FindListingsParams` уже были;
  `FindSellersParams` (`search?`, `status?: SellerStatus`) — добавлен вместе с фильтром sellers,
  бэкенд (`SellersService.findAll`) их уже принимал, во фронтовом типе просто не было.

## Заказы

- `pages/orders` — список. Фильтр по статусу (antd `Segmented` + стор `$status` в factory,
  отдельный от паттерна `features/*/filter` выше — сделан раньше и не переведён на него),
  смена фильтра инвалидирует список через тот же `purge`, что и мутация статуса.
- **Поллинг новых заказов** — единственный раздел с поллингом: `patronum.interval` раз в 30 с, пока роут открыт (`start` на
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

- **Категория** (`features/category/creat-edit`) — самый простой create/edit (только строковые
  поля + `status`, без картинки/числовых полей), но структурно приведён к тому же эталону, что и
  каталог/листинг/продавец: `$editingCategory`/`$mode` — голые сторы + `sample({ clock: editTriggered,
  target: $editingCategory })` (без инлайнового `.on()/.reset()`), `mutated = merge([createFx.done,
  updateFx.done])`. У категории на бэкенде нет DELETE — удаления там и не будет.
- **Каталог** (`features/catalog/creat-edit` + `features/catalog/delete`) — эталонный CRUD-паттерн,
  скопированный далее для продавцов. Категория для позиции выбирается селектом (свой fetch на
  `api.category.findAll({ limit: 100 })` при каждом открытии модалки, отфильтрован по
  `status === 'APPROVED'` — переиспользовать стор страницы `pages/categories` нельзя, он
  инкапсулирован в её `factory()`). Статус (`ReviewStatus`) — обычное поле формы в общем
  `PATCH /catalog/:id` (отдельного эндпоинта под статус на бэке больше нет), но в `updateFx` поле
  `status` отправляется только если `role === 'SUPER_ADMIN'`, и в UI селект статуса показан только
  при этом условии и только в режиме редактирования. Изображение — `POST /catalog/:id/image`
  (multipart, только в edit-режиме — эндпоинту нужен существующий `id`); на фронте `Content-Type`
  инстанса `base` явно сбрасывается в `undefined` на этот запрос, чтобы браузер сам проставил
  multipart-boundary. `mutated` — `merge([createFx.done, updateFx.done, uploadImageFx.done])`
  (не отдельный вручную заведённый `createEvent`), `$editingItem` синхронизируется через `sample`
  на `[editTriggered, uploadImageFx.doneData]`, а не инлайновым `.on()/.reset()`.
- **Продажные позиции** (`features/listing/creat-edit` + `features/listing/delete`) — полный CRUD,
  доступно только продавцу (`roles: ['SELLER']`), без разделения мастер/продавец, поэтому Edit/Delete
  в таблице показаны без доп. ролевых гейтов. `status` (`ListingStatus`) — обычное поле формы в обоих
  режимах: у листинга нет review-процесса и transition-map на бэкенде, значение принимается любое;
  `entities/listing.STATUS_LABELS` **без перевода** (значение = сырой enum, `DRAFT`/`ACTIVE`/`ARCHIVED`).
  `price`/`stock` — числовые поля через `NumberField` (`shared/ui/form/number-field.tsx`, обёртка над
  antd `InputNumber`) + `z.coerce.number()`. Нет изображения/баннера у листинга, поэтому
  `$editingListing` и `mutated` собраны по эталону каталога, но без ветки под `uploadXFx`: `$editingListing` — просто
  `sample({ clock: editTriggered, target: $editingListing })` (без инлайнового `.on()/.reset()`),
  `mutated = merge([createFx.done, updateFx.done])`.
- **Продавцы** (`features/seller/creat-edit`) — полный CRUD по образцу каталога: `create` заводит
  продавца вместе с владельцем (`ownerEmail`/`ownerPassword`/`ownerPhone` — поля формы только в
  режиме создания), `update` меняет `name`/`description`, а `status` (`SellerStatus`) — то же поле
  формы, что и у каталога: показано только при `!!editingSeller && role === 'SUPER_ADMIN'`, в payload
  `updateFx` уходит только для SUPER_ADMIN. Отдельного `features/seller/change-status` и эндпоинта
  `PATCH /sellers/:id/status` больше нет — бэкенд схлопнул статус в обычный `PATCH /sellers/:id`.
  Баннер — `POST /sellers/:id/image` (multipart, только после создания, тот же паттерн, что у
  изображения каталога). `pages/seller-detail` (`route.$params`, роль `SUPER_ADMIN`) — карточка
  продавца с баннером/статусом/описанием, его заказы (`api.orders.findAll({ sellerId })` с load-more)
  и три read-only списка без пагинации (свои категории/каталог/листинги, `limit: 50`) — вспомогательные
  таблицы страницы, не переиспользуют сторы `pages/{categories,catalog,listing}`.

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
