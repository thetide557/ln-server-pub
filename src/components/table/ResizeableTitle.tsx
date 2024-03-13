import React, { useMemo, useState } from 'react';
import type { ResizeCallbackData } from 'react-resizable';
import { Resizable } from 'react-resizable';

const ResizeableTitle: React.FC<any> = (props) => {
  const { width, className, children, onResize, style = {}, ...resetProps } = props;
  const [offset, setOffset] = useState<number>(0);
  const [nextWidth, setNextWidth] = useState<number>(58);

  const getTranslateX = useMemo(() => {
    if (offset >= nextWidth + 42) {
      return nextWidth - 42;
    }
    return offset;
  }, [offset, nextWidth]);
  if (className?.includes('ant-table-selection-column')) {
    return (
      <th className={className} {...resetProps}>
        {children}
      </th>
    );
  }
  // console.log(props);
  if (onResize) {
    return (
      <Resizable
        width={width + offset}
        height={0}
        handle={
          <span
            className={`react-resizable-handle ${offset ? 'active' : ''}`}
            style={{ transform: `translateX(${getTranslateX}px)` }}
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
            }}
          />
        }
        // onResizeStart={() => (this.resizing = true)}
        onResizeStop={(...arg: any[]) => {
          setOffset(0);
          onResize(...arg);
        }}
        onResizeStart={(e: any) => {
          const _nextWidth = e.target.parentNode.nextSibling.getBoundingClientRect().width;
          setNextWidth(_nextWidth);
        }}
        onResize={(e: any, { size }: ResizeCallbackData) => {
          const currentOffset = size.width - width;
          if (currentOffset > nextWidth - 42) {
            setOffset(nextWidth - 42);
          } else {
            setOffset(currentOffset);
          }
        }}
        draggableOpts={{
          enableUserSelectHack: true,
          minConstraints: [width - 42, 0],
          maxConstraints: [width + nextWidth, 0],
        }}
      >
        <th className={className} style={{ ...style, width: width + 'px' }} {...resetProps}>
          <div
            style={{ width: width + 'px' }}
            className="ofs-table-cell-wrapper"
            title={typeof children.join('') === 'string' ? children.join('') : ''}
          >
            <div className="ofs-table-cell">
              {children}
            </div>
          </div>
        </th>
      </Resizable>
    );
  }
  return (
    <th className={className} style={{ ...style, width: width + 'px' }}>
      <div
        style={{ width: width + 'px' }}
        className="ofs-table-cell-wrapper"
        title={typeof children.join('') === 'string' ? children.join('') : ''}
      >
        <div {...resetProps} className="ofs-table-cell">
          {children}
        </div>
      </div>
    </th>
  );
};

export default ResizeableTitle;