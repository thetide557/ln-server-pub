import { useMemoizedFn, useSafeState } from 'ahooks';
import type { ColumnType } from 'antd/es/table/interface';
import { useEffect, useRef, useCallback } from 'react';

const useTableCol = (wrapperWidth: number | undefined, columns: ColumnType<any>[]) => {
  const [isInit, setInit] = useSafeState<boolean>(false);
  // 保存每一列宽度的百分比，用来当容器的宽度变化时，计算每列的宽度
  const titleWidthMapRef = useRef<{ titleWidthMap: Record<string, number> | undefined }>({ titleWidthMap: undefined });
  // 每一列的宽度转换成数字之后的列配置
  const [tableShowColumns, setTableShowColumns] = useSafeState<ColumnType<any>[]>([]);

  // 初始时，将传入的表格配置数据进行转换
  // 将百分比、字符串格式的宽度配置转换成对应的数字宽度
  // 并根据容器的宽度做自适应
  const getTableNumberWidthCol = useMemoizedFn(() => {
    let resultTableColumesList: ColumnType<any>[] = [];
    if (wrapperWidth && columns) {
      // TODO: 筛选出所有显示的列
      const showCols = columns.filter((col) => col);
      const newColumesList = showCols.map((col) => {
        const { width } = col;
        const newCol = { ...col };
        // 当配置了width属性，且width为字符串类型时，计算具体的宽度值
        if (width && typeof width === 'string') {
          newCol.width = width.endsWith('%') ? (wrapperWidth * parseFloat(width)) / 100 : parseFloat(width);
        }
        return newCol;
      });
      // 表格总的宽度
      const totalWidth = newColumesList
        .filter((item) => typeof item.width === 'number')
        .reduce((sum, current) => sum + Number(current.width), 0);
      // 查找出未配置宽度的列
      const noWidthColumes = newColumesList.filter((col) => !col.width);
      // 如果存在未配置宽度的列，则将容器未分配的宽度，等分给未分配宽度的列
      if (noWidthColumes.length > 0) {
        const otherWidth = wrapperWidth - totalWidth;
        if (otherWidth > 0) {
          // 为了简单，向下取整，并将差值放到最后一列
          const commonWidth = Math.floor(otherWidth / noWidthColumes.length);
          const resultColumes = newColumesList.map((col) => {
            if (!col.width) {
              // 最后一个未配置宽度的列宽取差值
              if (col.title === noWidthColumes[noWidthColumes.length - 1].title) {
                col.width = otherWidth - commonWidth * (noWidthColumes.length - 1);
              } else {
                // 非最后一个未配置宽度的列，则取均值的向下取整值
                col.width = commonWidth;
              }
            }
            return col;
          });
          resultTableColumesList = resultColumes;
        } else {
          // 存在未分配宽度的列，但是列的已分配宽度大于容器宽度，此处正常情况下不应出现
          // 若出现了此情况，则给无列宽的列都分配60px的宽度，其他有列宽的需要同等缩小
          const needWidth = 60 * noWidthColumes.length + Math.abs(otherWidth);
          const showColWithWidth = newColumesList.length - noWidthColumes.length;
          if (showColWithWidth > 0) {
            const averageWidth = Math.floor(needWidth / showColWithWidth);
            const lastWidth = needWidth - averageWidth * (showColWithWidth - 1);
            const resultColumes = newColumesList.map((col) => {
              if (!col.width) {
                // 最后一个未配置宽度的列宽取差值
                if (col.title === noWidthColumes[noWidthColumes.length - 1].title) {
                  col.width = lastWidth;
                } else {
                  // 非最后一个未配置宽度的列，则取均值的向下取整值
                  col.width = averageWidth;
                }
              }
              return col;
            });
            resultTableColumesList = resultColumes;
          }
        }
      } else {
        const otherWidth = totalWidth - wrapperWidth;
        const averageWidth = Math.floor(otherWidth / newColumesList.length);
        const lastWidth = otherWidth - averageWidth * (newColumesList.length - 1);
        const resultColumes = newColumesList.map((col, index) => {
          if (index !== newColumesList.length - 1) {
            return { ...col, width: Number(col.width) - averageWidth };
          }
          return { ...col, width: Number(col.width) - lastWidth };
        });
        resultTableColumesList = resultColumes;
      }
    }
    return resultTableColumesList;
  });
  // 更新列宽占容器百分比的方法，若表格列支持拖拽，则需提供给拖拽方法，每次拖拽结束后，更新值
  const updateTitleWidthMap = useCallback(
    (result: Record<string, number>) => {
      titleWidthMapRef.current.titleWidthMap = result;
    },
    [titleWidthMapRef],
  );

  // 将数字列宽所占百分比保存下来，用以当容器的宽度变更时，做自适应处理
  const setTitleWidthMapMethod = useMemoizedFn((colList: ColumnType<any>[], allWidth?: number) => {
    if (allWidth) {
      const result: Record<string, number> = {};
      colList.forEach(({ width }, index) => {
        result[`_${index}`] = parseFloat(((width as number) / allWidth).toFixed(2));
      });
      updateTitleWidthMap(result);
    }
  });
  // 此useEffect为第一次执行表格渲染时，生成对应的列配置
  useEffect(() => {
    // 初始化时，根据配置项，设置表格列的宽度，并记录对应百分比
    if (wrapperWidth && !isInit) {
      const resultTableCol = getTableNumberWidthCol();
      setTitleWidthMapMethod(resultTableCol, wrapperWidth);
      setTableShowColumns(resultTableCol);
      setInit(true);
    }
  }, [
    isInit,
    wrapperWidth,
    tableShowColumns,
    setInit,
    setTableShowColumns,
    getTableNumberWidthCol,
    setTitleWidthMapMethod,
  ]);

  // 当容器宽度变化时，根据每列所占的比例，重新结算列宽
  useEffect(() => {
    if (wrapperWidth && isInit) {
      setTableShowColumns((oldColumns) => {
        const result: ColumnType<any>[] = [];
        const titleWidthMap = titleWidthMapRef?.current?.titleWidthMap;
        oldColumns.forEach((col, index) => {
          const pervent = titleWidthMap?.[`_${index}`];
          result.push({
            ...col,
            width: wrapperWidth * pervent!,
          });
        });
        const totalWidth = result.reduce((sum, cur) => sum + parseFloat(`${cur.width!}`), 0);
        result[result.length - 1].width = wrapperWidth + parseFloat(`${result[result.length - 1].width!}`) - totalWidth;
        return result;
      });
    }
  }, [isInit, wrapperWidth, titleWidthMapRef, setTableShowColumns]);

  return {
    tableShowColumns,
    isInit,
    setTitleWidthMapMethod,
  } as const;
};

export default useTableCol;