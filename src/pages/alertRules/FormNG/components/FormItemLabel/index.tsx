import React from 'react';

// 第六步 第4段 W0（阶段 0 · ck 试点）：fe 把 cn（拼 className 的小工具，clsx + tailwind-merge）
// 放在 src/utils/index.ts:292-294，pub 的 src/utils 里没有这个导出；但 pub 自己已经有一份一模一样的实现
// （src/components/AiChatNG/utils.ts:8-10，同样是 twMerge(clsx(inputs))）。
// src/utils/index.ts 不在本任务的写盘白名单里，所以这里改成引用 pub 已有的那一份，不新造实现。
import { cn } from '@/components/AiChatNG/utils';

interface IProps {
  children: React.ReactNode;
  description?: React.ReactNode;
  required?: boolean;
  className?: string;
}

export default function FormLabel({ children, description, required = true, className }: IProps) {
  return (
    <div className={cn('ant-form-item-label', className)}>
      <label className={required ? 'ant-form-item-required' : undefined}>{children}</label>
      {description && <div className='text-soft mt-0.5 font-normal'>{description}</div>}
    </div>
  );
}
