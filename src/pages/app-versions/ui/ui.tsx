/* eslint-disable react-refresh/only-export-components -- createLazyPage требует из модуля страницы экспорт component + createModel */
import { standardSchemaResolver } from '@hookform/resolvers/standard-schema';
import { Alert, Button, Card, Flex, Spin, Tabs, Typography } from 'antd';
import { useUnit } from 'effector-react';
import { useForm } from 'react-hook-form';

import type { AppPlatform } from '@/shared/api';
import type { LazyPageProps } from '@/shared/lib/create-lazy-page';
import { SwitchField, TextAreaField, TextField } from '@/shared/ui/form';
import { withTitle } from '@/shared/ui/with-title';

import { factory, form as formBridge, DEFAULT_VALUES, PLATFORMS, schema } from '../model';

type Model = ReturnType<typeof factory>;

const Page = ({ model }: LazyPageProps<Model>) => {
  const [current, platform, pending, saving, platformChanged, validated] = useUnit([
    model.$current,
    model.$platform,
    model.$pending,
    model.$saving,
    model.platformChanged,
    model.validated,
  ]);

  const form = useForm<typeof DEFAULT_VALUES>({
    resolver: standardSchemaResolver(schema),
    defaultValues: DEFAULT_VALUES,
  });
  formBridge.useBindFormWithModel({ form });

  if (pending && !current) return <Spin />;

  return (
    <Flex vertical gap="middle" style={{ width: '100%', maxWidth: 560 }}>
      <Alert
        type="info"
        showIcon
        message="Как это работает"
        description={
          <>
            Приложение сравнивает установленную версию с этими значениями при запуске и при возврате из фона. Ниже
            актуальной — предлагает обновиться и даёт закрыть плашку. Ниже минимальной — показывает экран, который
            нельзя закрыть. Поднимайте актуальную версию только после того, как сборка реально раскатилась в сторе.
          </>
        }
      />

      <Tabs
        activeKey={platform}
        onChange={(key) => platformChanged(key as AppPlatform)}
        items={PLATFORMS.map(({ value, label }) => ({ key: value, label }))}
      />

      <Card size="small">
        <form onSubmit={form.handleSubmit(() => validated())}>
          <TextField
            control={form.control}
            name="latestVersion"
            label="Актуальная версия в сторе"
            placeholder="1.0.22"
            required
          />
          <TextField
            control={form.control}
            name="minSupportedVersion"
            label="Минимально поддерживаемая версия"
            placeholder="1.0.10"
            required
          />
          <Typography.Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
            Установки ниже минимальной блокируются полностью — ставьте её только для релизов, без которых приложение
            действительно не работает.
          </Typography.Text>

          <TextField
            control={form.control}
            name="storeUrl"
            label="Ссылка на страницу в сторе"
            placeholder="https://play.google.com/store/apps/details?id=uz.egen.marketplace"
            required
          />

          <TextAreaField control={form.control} name="releaseNotesRu" label="Что нового, русский" rows={2} />
          <TextAreaField control={form.control} name="releaseNotesUz" label="Что нового, узбекский" rows={2} />
          <TextAreaField control={form.control} name="releaseNotesEn" label="Что нового, английский" rows={2} />
          <Typography.Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
            Необязательно. Пустое поле — приложение покажет плашку без описания; незаполненный язык подставляет русский
            текст.
          </Typography.Text>

          <SwitchField control={form.control} name="enabled" label="Показывать плашку обновления" />
          <Typography.Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
            Выключатель на случай ошибки: приложение перестанет предлагать обновление на этой платформе.
          </Typography.Text>

          <Button type="primary" htmlType="submit" loading={saving}>
            Сохранить
          </Button>
        </form>
      </Card>
    </Flex>
  );
};

export const component = withTitle(Page, 'Версии приложения');
export const createModel = factory;
