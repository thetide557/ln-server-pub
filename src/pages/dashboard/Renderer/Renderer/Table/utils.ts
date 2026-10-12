import _ from 'lodash';

export function transformColumns(columns: any[], transformations?: any[]): any[] {
  let newColumns: any[] = columns;
  if (!transformations) {
    return newColumns;
  }
  const organizeOptions = transformations[0]?.options;
  if (organizeOptions) {
    const { excludeByName, indexByName, renameByName } = organizeOptions;
    if (indexByName) {
      newColumns = _.map(newColumns, (column) => {
        const index = indexByName[column.title];
        return {
          ...column,
          sort: index,
        };
      });
      newColumns = _.sortBy(newColumns, 'sort');
    }
    if (excludeByName) {
      newColumns = _.filter(newColumns, (column) => !excludeByName[column.title]);
    }
    if (renameByName) {
      newColumns = _.map(newColumns, (column) => {
        const newName = renameByName[column.title];
        if (newName) {
          return { ...column, title: newName };
        }
        return column;
      });
    }
  }
  return newColumns;
}

/**
 * 判断是否为 raw 数据（一般为日志或是mysql数据）
 * 用途：表格图里如果是 raw 数据，则在标签模式下不显示 value 列
 * @param data series data || raw data
 * @returns boolean
 */
export function isRawData(data: any[]) {
  const head = _.head(data);
  if (head && head?.target?.query?.mode === 'raw') {
    return true;
  }
  return false;
}
