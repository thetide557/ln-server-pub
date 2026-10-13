import React, { ReactNode, useState, isValidElement, ReactElement } from 'react';
import { copy2ClipBoard } from '@/utils';
import './index.less';
interface Props {
  children: ReactNode;
}

// 目前不能放入太复杂的结构，支持的类型 e.g.
//  <Code>123</Code>
//  <Code><span>123</span></Code>
//  <Code>
//    <pre>curl -X POST \</pre>
//    <pre>http://yunyan.flashcat.cloud/v1/event/push \</pre>
//  </Code>
export default function Code(props: Props) {
  const { children } = props;
  const [copied, setCopied] = useState(false);

  const getElementText = (node: ReactNode) => {
    if (!isValidElement(node)) {
      return '';
    }
    const element = node as ReactElement<{ children?: ReactNode }>;
    return typeof element.props.children === 'string' ? element.props.children : '';
  };

  const handleCopy = () => {
    setCopied(true);
    if (!isValidElement(children) && typeof children === 'string') {
      copy2ClipBoard(children, true);
    } else if (getElementText(children)) {
      copy2ClipBoard(getElementText(children), true);
    } else if (Array.isArray(children)) {
      let text = '';
      children.forEach((item: ReactNode) => {
        const itemText = getElementText(item);
        if (itemText) {
          text += itemText + '\n';
        }
      });
      copy2ClipBoard(text, true);
    }
  };

  return (
    <div className='code-area'>
      <span className='code-text'>{children}</span>
      <span className='copy-btn' onClick={handleCopy}>
        {copied ? '复制成功' : '复制'}
      </span>
    </div>
  );
}
