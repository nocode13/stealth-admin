import {
  Alert,
  Button,
  Card,
  Checkbox,
  Col,
  Empty,
  Flex,
  Image,
  Input,
  InputNumber,
  Radio,
  Row,
  Segmented,
  Select,
  Space,
  Tabs,
  Tag,
  Typography,
} from 'antd';
import { useState, type ReactNode } from 'react';

import { ListingCodeCell, formatVariant } from '@/entities/listing';
import type { CatalogItem, Listing } from '@/shared/api';
import { formatAmount, toTiyin } from '@/shared/lib/currency/currency';
import { RichTextView } from '@/shared/ui/rich-text';

import type { ApplyPlan, ApplyResult, ApplyStep, CatalogTexts } from '../lib/apply';
import { buildPlan, resolveDraft, type ImportDefaults, type Overrides } from '../lib/draft';
import { mediaUrl, type ManifestGroup, type ManifestPlant } from '../lib/manifest';
import { approxRetailTiyin, normalizeName, type CatalogSource } from '../lib/match';
import type { SystemData } from '../lib/system';

const NEW = '__new__';
const SEARCH_LIMIT = 20;

const SOURCE_LABELS: Record<CatalogSource, string> = {
  sku: 'по SKU',
  batch: 'как у другого размера',
  claude: 'Claude',
  manual: 'выбран вручную',
  none: 'в каталоге не найден',
};

const TAG_COLORS: Record<string, string> = {
  sku: 'green',
  high: 'green',
  medium: 'gold',
  low: 'red',
  SKU: 'green',
  партия: 'blue',
};

const STEP_LABELS: Record<ApplyStep, string> = {
  catalog: 'каталог',
  listing: 'позиция',
  media: 'фото и видео',
  activate: 'активация',
};

const LOCALES: { key: string; name: keyof CatalogTexts; description: keyof CatalogTexts }[] = [
  { key: 'RU', name: 'nameRu', description: 'descriptionRu' },
  { key: 'UZ', name: 'nameUz', description: 'descriptionUz' },
  { key: 'EN', name: 'nameEn', description: 'descriptionEn' },
];

type CatalogOption = { value: string; label: string; cover: string | null; hint: string | null; tag: string | null };
type ListingOption = { value: string; label: string; tag: string | null; color: string };

const coverOf = (catalog: CatalogItem) => {
  const media = [...catalog.media].sort((a, b) => a.sortOrder - b.sortOrder);
  return media.find((m) => m.type === 'IMAGE')?.url ?? media.find((m) => m.posterUrl)?.posterUrl ?? null;
};

const usd = (value: number | null) => (value === null ? '—' : `${value.toLocaleString('ru-RU')} $`);

const listingLabel = (listing: Listing) =>
  [
    `#${listing.code}`,
    formatVariant(listing) ?? 'вариант не указан',
    listing.sku ? `код ${listing.sku}` : 'без кода',
    `${formatAmount(Number(listing.costPrice))} сум`,
    `ост. ${listing.stock}`,
    listing.status,
  ].join(' · ');

const Field = ({ label, children }: { label: string; children: ReactNode }) => (
  <Flex gap={12} align="start">
    <Typography.Text type="secondary" style={{ width: 120, flexShrink: 0, paddingTop: 4 }}>
      {label}
    </Typography.Text>
    <div style={{ flex: 1, minWidth: 0 }}>{children}</div>
  </Flex>
);

type OptionRowProps = { cover?: string | null; label: string; hint?: string | null; tag: string | null; color?: string };

const OptionRow = ({ cover, label, hint, tag, color }: OptionRowProps) => (
  <Flex gap={8} align="center">
    {cover !== undefined && (
      <div style={{ width: 32, height: 32, flexShrink: 0, background: '#f5f5f5', borderRadius: 4, overflow: 'hidden' }}>
        {cover && <img src={cover} alt="" width={32} height={32} style={{ objectFit: 'cover' }} />}
      </div>
    )}
    <Flex vertical style={{ minWidth: 0 }}>
      <span style={{ whiteSpace: 'normal' }}>
        {label} {tag && <Tag color={color ?? TAG_COLORS[tag]}>{tag}</Tag>}
      </span>
      {hint && (
        <Typography.Text type="secondary" style={{ fontSize: 12, whiteSpace: 'normal' }}>
          {hint}
        </Typography.Text>
      )}
    </Flex>
  </Flex>
);

type Props = {
  batch: string;
  group: ManifestGroup;
  plant: ManifestPlant | undefined;
  system: SystemData;
  defaults: ImportDefaults;
  rate: number | null;
  overrides: Overrides;
  /** Каталог, уже выбранный другой карточкой этого растения в партии. */
  plantCatalog: string | undefined;
  result: ApplyResult | undefined;
  applying: boolean;
  /** Идёт approve другой карточки — по одной за раз. */
  busy: boolean;
  onChange: (patch: Overrides) => void;
  onApprove: (plan: ApplyPlan) => void;
  onSkip: () => void;
  onUnskip: () => void;
};

export const ImportCard = ({
  batch,
  group,
  plant,
  system,
  defaults,
  rate,
  overrides,
  plantCatalog,
  result,
  applying,
  busy,
  onChange,
  onApprove,
  onSkip,
  onUnskip,
}: Props) => {
  const [catalogSearch, setCatalogSearch] = useState('');
  const [showWhite, setShowWhite] = useState(true);

  const draft = resolveDraft({ group, plant, system, defaults, rate, created: plantCatalog, overrides });
  const plan = buildPlan(batch, group, draft);
  const match = plant?.match ?? null;

  // --- медиа
  const labelPhoto = group.media.labelIndex === null ? null : (group.media.photos[group.media.labelIndex] ?? null);
  const originals = group.media.plantIndexes.map((index) => group.media.photos[index]).filter(Boolean);
  const hasWhite = group.media.white.length > 0;
  const shownPlants = showWhite && hasWhite ? group.media.white : originals;

  // --- варианты каталога: SKU → партия → кандидаты Claude → текущий → поиск
  const catalogsById = new Map(system.catalogs.map((catalog) => [catalog.id, catalog]));
  const catalogOptions: CatalogOption[] = [
    { value: NEW, label: 'Новый каталог', cover: null, hint: draft.texts.nameRu || null, tag: null },
  ];
  const seen = new Set<string>();
  const addCatalog = (id: string, tag: string | null, hint: string | null) => {
    const catalog = catalogsById.get(id);
    if (!catalog || seen.has(id)) return;
    seen.add(id);
    catalogOptions.push({
      value: id,
      label: catalog.name,
      cover: coverOf(catalog),
      hint: hint ?? catalog.subcategory?.name ?? null,
      tag,
    });
  };
  for (const hit of draft.skuHits) addCatalog(hit.catalogItemId, 'SKU', `позиция #${hit.code}`);
  if (plantCatalog) addCatalog(plantCatalog, 'партия', 'выбран для другого размера этого растения');
  for (const candidate of match?.candidates ?? []) {
    const isChoice = candidate.catalogItemId === match?.catalogItemId;
    addCatalog(candidate.catalogItemId, isChoice ? (match?.confidence ?? null) : 'кандидат', candidate.reason);
  }
  if (draft.catalogItem) addCatalog(draft.catalogItem.id, null, null);
  if (catalogSearch.trim().length >= 2) {
    const query = normalizeName(catalogSearch);
    system.catalogs
      .filter((catalog) => normalizeName(catalog.name).includes(query))
      .slice(0, SEARCH_LIMIT)
      .forEach((catalog) => addCatalog(catalog.id, null, null));
  }

  const toListingOption = (tag: string, color: string) => (listing: Listing) => ({
    value: listing.id,
    label: listingLabel(listing),
    tag,
    color,
  });
  const listingOptions: ListingOption[] = [
    { value: NEW, label: 'Новый размер — создать позицию', tag: null, color: 'default' },
    ...draft.listingOptions.exact.map(toListingOption('тот же вариант', 'green')),
    ...draft.listingOptions.partial.map(toListingOption('вариант не заполнен', 'gold')),
    ...draft.listingOptions.others.map(toListingOption('другой вариант', 'default')),
  ];

  const sourceTag =
    draft.catalogSource === 'claude' ? `Claude · ${draft.catalogConfidence ?? '?'}` : SOURCE_LABELS[draft.catalogSource];
  const catalogCover = draft.catalogItem ? coverOf(draft.catalogItem) : null;
  const setText = (key: keyof CatalogTexts, value: string) =>
    onChange({ texts: { [key]: value } as Partial<CatalogTexts> });

  const roots = system.categories.filter((category) => !category.parentId);
  const subcategories = system.categories.filter(
    (category) => category.parentId && category.parentId === draft.categoryId,
  );
  const warnings = [...group.warnings, ...draft.warnings];
  const title =
    draft.catalogItem?.name ||
    draft.texts.nameRu ||
    plant?.names[0] ||
    group.caption.split('\n')[0] ||
    `Пост #${group.id}`;

  return (
    <Card
      size="small"
      title={
        <Space wrap>
          <span>{title}</span>
          {group.code ? <Tag>{group.code}</Tag> : <Tag color="red">нет кода</Tag>}
          {result?.status === 'done' && <Tag color="green">готово</Tag>}
          {result?.status === 'skipped' && <Tag>пропущено</Tag>}
          {result?.status === 'error' && <Tag color="red">ошибка</Tag>}
        </Space>
      }
      extra={<Typography.Text type="secondary">{group.date.replace('T', ' ')}</Typography.Text>}
    >
      <Row gutter={[16, 16]}>
        <Col xs={24} xl={9}>
          <Flex vertical gap={8}>
            <Flex gap={8} wrap align="start">
              <Flex vertical gap={4} align="center">
                {shownPlants.length ? (
                  <Image.PreviewGroup>
                    <Flex gap={4} align="start">
                      {shownPlants.map((path, index) => (
                        <Image
                          key={path}
                          width={index === 0 ? 220 : 100}
                          src={mediaUrl(batch, path)}
                          style={{ border: '1px solid #f0f0f0' }}
                        />
                      ))}
                    </Flex>
                  </Image.PreviewGroup>
                ) : (
                  <Empty description="нет фото растения" />
                )}
                {hasWhite && originals.length > 0 && (
                  <Segmented
                    size="small"
                    value={showWhite ? 'white' : 'original'}
                    options={[
                      { label: 'Белый фон', value: 'white' },
                      { label: 'Оригинал', value: 'original' },
                    ]}
                    onChange={(value) => setShowWhite(value === 'white')}
                  />
                )}
              </Flex>
              {labelPhoto && (
                <Flex vertical gap={4} align="center">
                  <Image width={110} src={mediaUrl(batch, labelPhoto)} />
                  <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                    бирка
                  </Typography.Text>
                </Flex>
              )}
              {group.media.video && (
                <video
                  src={mediaUrl(batch, group.media.video)}
                  controls
                  preload="metadata"
                  style={{ width: 220, borderRadius: 8, background: '#000' }}
                />
              )}
            </Flex>
            {group.caption && (
              <Typography.Paragraph
                type="secondary"
                ellipsis={{ rows: 3, expandable: true }}
                style={{ whiteSpace: 'pre-line', margin: 0 }}
              >
                {group.caption}
              </Typography.Paragraph>
            )}
            {group.labelText && (
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                Бирка: {group.labelText}
              </Typography.Text>
            )}
            {group.notes && (
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                Claude: {group.notes}
              </Typography.Text>
            )}
          </Flex>
        </Col>

        <Col xs={24} xl={15}>
          <Flex vertical gap={10}>
            {warnings.length > 0 && (
              <Alert
                type="warning"
                showIcon
                title={
                  <ul style={{ margin: 0, paddingLeft: 16 }}>
                    {warnings.map((warning) => (
                      <li key={warning}>{warning}</li>
                    ))}
                  </ul>
                }
              />
            )}

            <Field label="Код">
              <Space wrap>
                {group.code ? <Typography.Text copyable>{group.code}</Typography.Text> : '—'}
                {group.codeSources.caption && <Tag>из подписи</Tag>}
                {group.codeSources.label && (
                  <Tag>
                    с фото{group.codeSources.label !== group.code ? `: ${group.codeSources.label}` : ''}
                  </Tag>
                )}
              </Space>
            </Field>

            <Field label="Прайс">
              {group.excelRows.length === 0 ? (
                <Typography.Text type="danger">кода нет в прайсе</Typography.Text>
              ) : (
                <Radio.Group
                  value={draft.excelRowIndex}
                  onChange={(e) =>
                    onChange({ excelRowIndex: e.target.value as number, costPriceSum: undefined, stock: undefined })
                  }
                >
                  <Flex vertical gap={4}>
                    {group.excelRows.map((row, index) => (
                      <Radio key={`${row.sheets.join()}-${row.warehouse}-${index}`} value={index}>
                        {row.name}{' '}
                        <Typography.Text type={group.excelConflict ? 'danger' : 'secondary'}>
                          {row.sheets.join(', ')}
                          {row.warehouse ? ` · ${row.warehouse}` : ''} · ост. {row.stock ?? '—'} · опт{' '}
                          {usd(row.wholesaleUsd)} · розн {usd(row.retailUsd)}
                        </Typography.Text>
                      </Radio>
                    ))}
                  </Flex>
                </Radio.Group>
              )}
            </Field>

            <Field label="Вариант">
              <Space wrap>
                <InputNumber
                  min={0.1}
                  step={0.5}
                  value={draft.variant.potVolumeMl !== null ? draft.variant.potVolumeMl / 1000 : null}
                  suffix="л"
                  placeholder="объём"
                  onChange={(value) =>
                    onChange({
                      variant: { potVolumeMl: value === null ? null : Math.round(Number(value) * 1000) },
                      listing: undefined,
                    })
                  }
                />
                <InputNumber
                  min={1}
                  precision={0}
                  value={draft.variant.stemCount}
                  suffix="PP"
                  placeholder="растений"
                  onChange={(value) =>
                    onChange({ variant: { stemCount: value === null ? null : Number(value) }, listing: undefined })
                  }
                />
                <InputNumber
                  min={1}
                  precision={0}
                  value={draft.variant.heightCm}
                  suffix="см"
                  placeholder="высота"
                  onChange={(value) =>
                    onChange({ variant: { heightCm: value === null ? null : Number(value) }, listing: undefined })
                  }
                />
              </Space>
            </Field>

            <Field label="Продавец">
              <Select
                style={{ width: '100%', maxWidth: 360 }}
                placeholder="Продавец"
                value={draft.sellerId}
                options={system.sellers.map((seller) => ({ value: seller.id, label: seller.name }))}
                showSearch={{ optionFilterProp: 'label' }}
                allowClear
                status={draft.sellerId ? undefined : 'error'}
                onChange={(value: string | undefined) => onChange({ sellerId: value ?? null, listing: undefined })}
              />
            </Field>

            <Field label="Каталог">
              <Flex vertical gap={6}>
                <Flex gap={8} align="start">
                  <Select
                    style={{ flex: 1, minWidth: 0 }}
                    value={draft.catalog.kind === 'new' ? NEW : draft.catalog.catalogItemId}
                    options={catalogOptions}
                    showSearch={{
                      searchValue: catalogSearch,
                      onSearch: setCatalogSearch,
                      filterOption: false,
                      autoClearSearchValue: true,
                    }}
                    placeholder="Найти каталог по названию"
                    optionRender={(option) => {
                      const data = option.data as CatalogOption;
                      return <OptionRow cover={data.cover} label={data.label} hint={data.hint} tag={data.tag} />;
                    }}
                    onChange={(value: string) => {
                      setCatalogSearch('');
                      onChange({
                        catalog: value === NEW ? { kind: 'new' } : { kind: 'existing', catalogItemId: value },
                        listing: undefined,
                      });
                    }}
                  />
                  {catalogCover && <Image width={64} src={catalogCover} />}
                </Flex>
                <Space size={4} wrap>
                  <Tag color={draft.catalogConfidence ? TAG_COLORS[draft.catalogConfidence] : undefined}>
                    {sourceTag}
                  </Tag>
                  {match?.reason && draft.catalogSource !== 'sku' && draft.catalogSource !== 'batch' && (
                    <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                      {match.reason}
                    </Typography.Text>
                  )}
                </Space>
                {draft.canAddDescription && (
                  <Flex vertical gap={4}>
                    <Checkbox
                      checked={draft.addDescription}
                      onChange={(e) => onChange({ addDescription: e.target.checked })}
                    >
                      У каталога нет описания — добавить от Claude (RU/UZ/EN)
                    </Checkbox>
                    {draft.addDescription && <RichTextView html={draft.texts.descriptionRu} />}
                  </Flex>
                )}
              </Flex>
            </Field>

            {draft.catalog.kind === 'new' && (
              <Field label="Новый каталог">
                <Flex vertical gap={8}>
                  <Tabs
                    size="small"
                    items={LOCALES.map(({ key, name, description }) => ({
                      key,
                      label: key,
                      children: (
                        <Flex vertical gap={8}>
                          <Input
                            value={draft.texts[name]}
                            placeholder="Название"
                            status={key === 'RU' && !draft.texts.nameRu.trim() ? 'error' : undefined}
                            onChange={(e) => setText(name, e.target.value)}
                          />
                          <Input.TextArea
                            value={draft.texts[description]}
                            autoSize={{ minRows: 3, maxRows: 8 }}
                            placeholder="Описание, HTML"
                            onChange={(e) => setText(description, e.target.value)}
                          />
                          {draft.texts[description] && <RichTextView html={draft.texts[description]} />}
                        </Flex>
                      ),
                    }))}
                  />
                  <Row gutter={[8, 8]}>
                    <Col xs={24} md={8}>
                      <Select
                        style={{ width: '100%' }}
                        placeholder="Категория"
                        value={draft.categoryId}
                        options={roots.map((category) => ({ value: category.id, label: category.name }))}
                        showSearch={{ optionFilterProp: 'label' }}
                        status={draft.categoryId ? undefined : 'error'}
                        onChange={(value: string | undefined) =>
                          onChange({ categoryId: value ?? null, subcategoryId: null })
                        }
                      />
                    </Col>
                    <Col xs={24} md={8}>
                      <Select
                        style={{ width: '100%' }}
                        placeholder="Подкатегория"
                        value={draft.subcategoryId}
                        options={subcategories.map((category) => ({ value: category.id, label: category.name }))}
                        showSearch={{ optionFilterProp: 'label' }}
                        allowClear
                        disabled={!draft.categoryId}
                        onChange={(value: string | undefined) => onChange({ subcategoryId: value ?? null })}
                      />
                    </Col>
                    <Col xs={24} md={8}>
                      <Select
                        style={{ width: '100%' }}
                        placeholder="Страна"
                        value={draft.countryId}
                        options={system.countries.map((country) => ({ value: country.id, label: country.name }))}
                        showSearch={{ optionFilterProp: 'label' }}
                        allowClear
                        onChange={(value: string | undefined) => onChange({ countryId: value ?? null })}
                      />
                    </Col>
                  </Row>
                </Flex>
              </Field>
            )}

            {draft.catalog.kind === 'existing' && (
              <Field label="Позиция">
                {draft.sellerId ? (
                  <Flex vertical gap={4}>
                    <Select
                      style={{ width: '100%' }}
                      value={draft.listing.kind === 'new' ? NEW : draft.listing.listingId}
                      options={listingOptions}
                      optionRender={(option) => {
                        const data = option.data as ListingOption;
                        return <OptionRow label={data.label} tag={data.tag} color={data.color} />;
                      }}
                      onChange={(value: string) =>
                        onChange({ listing: value === NEW ? { kind: 'new' } : { kind: 'existing', listingId: value } })
                      }
                    />
                    {draft.listingItem && draft.listingItem.ownMedia.length > 0 && (
                      <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                        Свои фото позиции ({draft.listingItem.ownMedia.length}) будут заменены
                      </Typography.Text>
                    )}
                  </Flex>
                ) : (
                  <Typography.Text type="secondary">выбери продавца</Typography.Text>
                )}
              </Field>
            )}

            <Field label="Себестоимость">
              <Space wrap>
                <InputNumber
                  min={0}
                  precision={0}
                  style={{ width: 180 }}
                  value={draft.costPriceSum}
                  suffix="сум"
                  status={draft.costPriceSum ? undefined : 'error'}
                  onChange={(value) => onChange({ costPriceSum: value === null ? null : Number(value) })}
                />
                {draft.excelRow?.retailUsd != null && (
                  <Typography.Text type="secondary">
                    розница {usd(draft.excelRow.retailUsd)} × {rate ?? '?'}
                  </Typography.Text>
                )}
                {overrides.costPriceSum !== undefined && (
                  <Button type="link" size="small" onClick={() => onChange({ costPriceSum: undefined })}>
                    из прайса
                  </Button>
                )}
                {draft.costPriceSum ? (
                  <Typography.Text type="secondary">
                    ≈ {formatAmount(approxRetailTiyin(toTiyin(draft.costPriceSum), system.settings.markupTiers))} сум
                    на витрине
                  </Typography.Text>
                ) : null}
                {draft.listingItem && (
                  <Typography.Text type="secondary">
                    сейчас {formatAmount(Number(draft.listingItem.costPrice))} сум
                  </Typography.Text>
                )}
              </Space>
            </Field>

            <Field label="Остаток">
              <Space wrap>
                <InputNumber
                  min={0}
                  precision={0}
                  value={draft.stock}
                  onChange={(value) => onChange({ stock: value === null ? null : Number(value) })}
                />
                {draft.listingItem && (
                  <Typography.Text type="secondary">сейчас {draft.listingItem.stock}</Typography.Text>
                )}
              </Space>
            </Field>

            {result?.status === 'done' && result.listingCode !== undefined && (
              <Alert
                type="success"
                showIcon
                title={
                  <Space>
                    Позиция на витрине: <ListingCodeCell code={result.listingCode} />
                  </Space>
                }
              />
            )}
            {result?.status === 'error' && (
              <Alert
                type="error"
                showIcon
                title={`Ошибка на шаге «${result.failedStep ? STEP_LABELS[result.failedStep] : '?'}»`}
                description={`${result.error ?? ''} Повтор продолжит с этого шага.`}
              />
            )}

            <Flex gap={8} align="center" wrap>
              {result?.status === 'skipped' ? (
                <Button onClick={onUnskip}>Вернуть в очередь</Button>
              ) : (
                <>
                  <Button
                    type="primary"
                    disabled={!plan || (busy && !applying)}
                    loading={applying}
                    onClick={() => plan && onApprove(plan)}
                  >
                    {result?.status === 'error'
                      ? 'Повторить'
                      : result?.status === 'done'
                        ? 'Применить ещё раз'
                        : 'Approve'}
                  </Button>
                  {result?.status !== 'done' && (
                    <Button disabled={applying} onClick={onSkip}>
                      Пропустить
                    </Button>
                  )}
                </>
              )}
              {draft.blockers.length > 0 && result?.status !== 'skipped' && (
                <Typography.Text type="secondary">{draft.blockers.join(' · ')}</Typography.Text>
              )}
            </Flex>
          </Flex>
        </Col>
      </Row>
    </Card>
  );
};
