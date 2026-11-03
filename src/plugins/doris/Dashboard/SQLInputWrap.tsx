import React, { useContext, useState } from 'react';
import { Button, Tooltip } from 'antd';
import { useTranslation } from 'react-i18next';
import { SqlMonacoEditor } from '@fc-components/monaco-editor';
// step6d(B1)：pub 的 lucide-react 是 0.294.0，fe v9.1.0 用的是 ^1.8.0。这个图标在 0.294.0 里还叫 Wand2，
// 后来的版本才改名成 WandSparkles（同一个图标，wand-2 → wand-sparkles），所以这里按老名字取、别名成新名字用。
// 不升 lucide-react 是因为 pub 自己有 5 处在用它（src/components/AiChatNG/*、src/components/EnhancedTable/*），改版本属于「改依赖版本」要上报。
import { Wand2 as WandSparkles } from 'lucide-react';

import { CommonStateContext } from '@/App';

interface Props {
  placeholder: string;
  validateBeforeChange: (val: string) => boolean;

  value?: string;
  onChange?: (val: string) => void;
}

export default function SQLInputWrap(props: Props) {
  const { t } = useTranslation();
  const { darkMode } = useContext(CommonStateContext) as any; // step6d(B1) shim：pub 的 ICommonState 没有 darkMode（App.tsx 不改），恒为 undefined = 浅色，写法同 L3 clickHouse/Dashboard/QueryBuilder.tsx:21

  const { placeholder, validateBeforeChange, onChange } = props;

  const [value, setValue] = useState<string>(props.value || '');

  return (
    <SqlMonacoEditor
      maxHeight={200}
      theme={darkMode ? 'dark' : 'light'}
      enableAutocomplete={true}
      enableFormat
      renderFormatButton={() => {
        return (
          <Tooltip title={t('common:format_sql')}>
            <Button size='small' type='text' icon={<WandSparkles size={12} strokeWidth={1} />} />
          </Tooltip>
        );
      }}
      placeholder={placeholder}
      value={value}
      onChange={(val) => {
        setValue(val);
      }}
      onEnter={(val) => {
        if (validateBeforeChange(val)) {
          onChange?.(val);
        }
      }}
      onBlur={(val) => {
        if (validateBeforeChange(val)) {
          onChange?.(val);
        }
      }}
    />
  );
}
