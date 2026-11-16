/**
 * 第六步 ES 升级轮（step6f）新加的本地副本。
 *
 * 为什么不用 `@/pages/dashboard/VariableConfig/utils` 里那个同名函数：
 * fe v9.1.0 的版本收 4 个参数 `(params, date_field, start, end)`，会把时间范围写进 query 的 filter，
 * 并且直接用 `params.field` 做 terms 聚合（fe `src/pages/dashboard/VariableConfig/utils.ts:4-64`）；
 * 而羚牛 pub 现在那份只收 1 个参数、不带时间范围，还会无条件给字段名后面补 `.keyword`
 * （pub 同路径文件 `:1-33`）。KQL 输入框的取值补全要按 fe 的语义走，
 * 而按本轮纪律「pub 已有且不一致的共享文件一律保留 pub 版、pub 现有共享文件不许动」，
 * 所以把 fe 那一份原样放在这里，只给 KQLInput 自己用，不影响 pub 原来的变量配置页。
 *
 * 内容与 fe v9.1.0 `src/pages/dashboard/VariableConfig/utils.ts` 的 `normalizeESQueryRequestBody` 逐字相同。
 */
export function normalizeESQueryRequestBody(
  params: {
    find: string;
    field: string;
    query?: string;
    size?: number;
    orderBy?: string;
    order?: string;
  },
  date_field: string | undefined,
  start: number,
  end: number,
) {
  let orderBy = '_key';
  if (params?.orderBy === 'doc_count') {
    orderBy = '_count';
  }
  const body: any = {
    size: 0,
    query: {
      bool: {
        filter: [
          {
            range: {
              [date_field || '@timestamp']: {
                gte: start,
                lte: end,
                format: 'epoch_millis',
              },
            },
          },
        ],
      },
    },
    aggs: {
      A: {
        [params.find]: {
          field: `${params.field}`,
          size: params.size || 500,
          order: {
            [orderBy]: params.order || 'desc',
          },
        },
      },
    },
  };

  if (params.query && params.query !== '') {
    body.query.bool.filter = [
      ...body.query.bool.filter,
      params?.query
        ? {
            query_string: {
              analyze_wildcard: true,
              query: params?.query,
            },
          }
        : { match_all: {} },
    ];
  }

  return body;
}
