import { Select } from 'antd';
import { useUnit } from 'effector-react';

import type { createCategoryPicker } from './picker';

type Picker = ReturnType<typeof createCategoryPicker>;

export type CategoryPickerSelectsProps = {
  picker: Picker;
  categoryId: string | null;
  subcategoryId: string | null;
  onCategoryChange: (value: string | null) => void;
  onSubcategoryChange: (value: string | null) => void;
  /** Доп. пункты в начале списка подкатегорий (например, «Без подкатегории»). */
  extraSubcategoryOptions?: { label: string; value: string }[];
};

/**
 * Два селекта фильтра «Категория → Подкатегория». Подкатегория неактивна, пока не выбрана
 * категория: без родителя список родов из всех категорий был бы бессмысленно длинным.
 * Возвращает два узла — раскладку по колонкам задаёт потребитель через `Col`.
 */
export const useCategoryPickerSelects = ({
  picker,
  categoryId,
  subcategoryId,
  onCategoryChange,
  onSubcategoryChange,
  extraSubcategoryOptions = [],
}: CategoryPickerSelectsProps) => {
  const [categories, categoriesFetching, subcategories, subcategoriesSearch, subcategoriesFetching, searchChanged] =
    useUnit([
      picker.$categories,
      picker.$categoriesFetching,
      picker.$subcategories,
      picker.$subcategoriesSearch,
      picker.$subcategoriesFetching,
      picker.subcategoriesSearchChanged,
    ]);

  const categorySelect = (
    <Select
      value={categoryId}
      options={categories.map((category) => ({ label: category.name, value: category.id }))}
      onChange={(value) => onCategoryChange(value ?? null)}
      allowClear
      style={{ width: '100%' }}
      placeholder="Категория"
      loading={categoriesFetching}
      showSearch={{ optionFilterProp: 'label' }}
    />
  );

  const subcategorySelect = (
    <Select
      value={subcategoryId}
      options={[
        ...extraSubcategoryOptions,
        ...subcategories.map((category) => ({ label: category.name, value: category.id })),
      ]}
      onChange={(value) => onSubcategoryChange(value ?? null)}
      allowClear
      disabled={!categoryId}
      style={{ width: '100%' }}
      placeholder="Подкатегория"
      loading={subcategoriesFetching}
      showSearch={{
        searchValue: subcategoriesSearch,
        onSearch: searchChanged,
        // Фильтрация серверная — клиентскую отключаем, иначе она режет ответ бэка.
        filterOption: false,
        autoClearSearchValue: true,
      }}
    />
  );

  return { categorySelect, subcategorySelect };
};
