import { useMemoizedFn, useSafeState } from 'ahooks';
import { useState, useEffect } from 'react';
import useTableCol from './useTableCol';
import { ColumnType } from 'antd/es/table';

const useResizeTableCol = (wrapperWidth: number | undefined, tableRef: any, columns: ColumnType<any>[]) => {
  const [colIsInit, setColInit] = useSafeState<boolean>(false);
  console.assert(colIsInit)
  const [tableColumns, setTableColumns] = useState<ColumnType<any>[]>(columns);
  const { tableShowColumns, isInit, setTitleWidthMapMethod } = useTableCol(wrapperWidth, columns);

  const handleResize = useMemoizedFn((index: number) => (e: any, { size }: any) => {
    e.stopImmediatePropagation();
    console.log('handleResize');
    if (tableRef.current) {
      const widthList = [
        ...(tableRef.current as HTMLElement).querySelectorAll('.ant-table-thead th.react-resizable'),
      ].map((th) => {
        return (th as HTMLElement).getBoundingClientRect().width;
      });
      setTableColumns((col) => {
        const nextColumns = [...col];
        const { width: oldWidth } = nextColumns[index];
        // 此次平移的宽度
        const offsetWidth = size.width - Number(oldWidth || 0);
        // 当前列得宽度
        const currentWidth = widthList[index] + offsetWidth;
        const nextWidth = widthList[index + 1] - offsetWidth;
        // 左移，当前宽度小于42
        if (currentWidth < 42) {
          widthList[index] = 42;
          widthList[index + 1] = nextWidth - 42 + currentWidth;
        } else if (nextWidth < 42) {
          // 右移，下一列得宽度小于42
          widthList[index] = currentWidth - 42 + nextWidth;
          widthList[index + 1] = 42;
        } else {
          widthList[index] = currentWidth;
          widthList[index + 1] = nextWidth;
        }
        console.log(widthList);
        const resultColumns = nextColumns.map((nextCol, _index) => ({
          ...nextCol,
          width: widthList[_index],
          onHeaderCell:
            _index !== nextColumns.length - 1
              ? () => ({
                  width: widthList[_index],
                  onResize: handleResize(_index),
                })
              : undefined,
        }));
        setTitleWidthMapMethod(resultColumns, wrapperWidth);
        return resultColumns;
      });
    }
  });

  useEffect(() => {
    console.log("kjlj")
    if (isInit) {
      setTableColumns(
        tableShowColumns.map((col, index) => ({
          ...col,
          onHeaderCell:
            index !== tableShowColumns.length - 1
              ? () => ({
                  width: col.width,
                  onResize: handleResize(index),
                })
              : undefined,
        })),
      );
      setColInit(true);
    }
  }, [tableShowColumns, isInit, setTableColumns, handleResize, setColInit]);

  return {
    colIsInit,
    tableColumns,
  } as const;
};

export default useResizeTableCol;

