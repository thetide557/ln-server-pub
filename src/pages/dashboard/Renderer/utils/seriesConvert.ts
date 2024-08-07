import _ from "lodash";
import moment from "moment";

export function convertTimeseriesToG2Data(series) {
  const data: any[] = [];
  if (Array.isArray(series)) {
    series?.map((serie: { name: any; data: any[]; metric: any; id: any }) => {
      const name = serie.name;
      const id = serie.id
      if (serie[0]?.data) {
        serie[0].data.map((v) => {
          data.push({
            ...serie.metric,
            name: name,
            id,
            time: v[0] * 1000,
            value: _.toNumber(v[1]),
            metric: serie.metric,
          });
        });
      } else {
        serie.data.map((v) => {
          data.push({
            ...serie.metric,
            name: name,
            id,
            time: v[0] * 1000,
            value: _.toNumber(v[1]),
            metric: serie.metric,
          });
        });
      }
    });
  } else {
    series?.series?.map((serie: { name: any; data: any[]; metric: any , id: any}) => {
      const name = serie.name;
      const id = serie.id
      serie.data.map((v) => {
        data.push({
          ...serie.metric,
          name: name,
          id,
          time: v[0] * 1000,
          value: _.toNumber(v[1]),
          metric: serie.metric,
        });
      });
    });
  }
  // // 步骤 1: 创建一个空的映射来计数
  // const countMap = new Map();

  // // 步骤 2: 遍历数据数组，填充映射
  // data.forEach((obj) => {
  //   const key = `${obj.time}-${obj.name}`;
  //   countMap.set(key, (countMap.get(key) || 0) + 1);
  // });

  // // 步骤 3: 收集所有 `name` 和 `time` 组合出现超过一次的对象
  // const duplicates = data.filter((obj) => {
  //   const key = `${obj.time}-${obj.name}`;
  //   return countMap.get(key) > 1;
  // });

  // // 打印结果
  // return data;
  // 步骤 1: 创建一个空的集合来跟踪已经出现的 `name` 和 `time` 组合
  const seen = new Set();
  const name = new Set();
  // 步骤 2: 创建一个新数组来存储去重后的对象
  const uniqueArray = [];

  // 步骤 3: 遍历数据数组
  data.forEach((obj: Object, index) => {
    const key = `${obj.time}-${obj.name}-${obj.id}`;
    if (!name.has(obj.name)) {
      name.add(obj.name);
    }
    // 检查这个组合是否已经在集合中
    if (!seen.has(key)) {
      // 如果不在，添加到集合中
      seen.add(key);
      // 并将对象添加到去重后的数组中
      obj.name = `${obj.name}-${obj.id}`;
      uniqueArray.push(obj);
    }
  });
  return uniqueArray;
}
