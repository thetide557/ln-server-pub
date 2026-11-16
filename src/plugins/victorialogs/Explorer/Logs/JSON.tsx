import React, { useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Button } from 'antd';
import { useTranslation } from 'react-i18next';

import { copy2ClipBoard } from '@/utils';

import { NAME_SPACE } from '../../constants';

import { Data } from './index';

interface Props {
  tabBarExtraContentElement: HTMLDivElement;
  data: Data;
}

export default function JSONCpt(props: Props) {
  const { t } = useTranslation(NAME_SPACE as string); // step6d(B1)：NAME_SPACE 是枚举成员不是字面量，TS 4.3 会报 TS2589「类型实例化过深」（fe 用 TS 4.9 不报），标成 string 即可，见 拿不准-B1 B1-8
  const { tabBarExtraContentElement, data } = props;
  const jsonValue = useMemo(() => {
    try {
      return JSON.stringify(data.logs, null, 4);
    } catch (e) {
      console.error(e);
      return t('explorer.parse_failed');
    }
  }, [data.version]);

  return (
    <div className='json-view'>
      {createPortal(
        <Button
          size='small'
          onClick={() => {
            copy2ClipBoard(jsonValue);
          }}
        >
          {t('explorer.copy_json')}
        </Button>,
        tabBarExtraContentElement,
      )}
      <div className='p-2'>
        <pre>
          <code>{jsonValue}</code>
        </pre>
      </div>
    </div>
  );
}
