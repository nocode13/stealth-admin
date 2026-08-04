/* eslint-disable react-refresh/only-export-components -- createLazyPage требует из модуля страницы экспорт component + createModel */
import { Flex } from 'antd';

import { SellerStaffTable } from '@/widgets/seller-staff';
import type { LazyPageProps } from '@/shared/lib/create-lazy-page';
import { withTitle } from '@/shared/ui/with-title';

import { factory } from '../model';

type Model = ReturnType<typeof factory>;

const Page = ({ model }: LazyPageProps<Model>) => (
  <Flex vertical gap="middle" style={{ width: '100%' }}>
    <SellerStaffTable model={model.staffModel} />
  </Flex>
);

export const component = withTitle(Page, 'Сотрудники');
export const createModel = factory;
