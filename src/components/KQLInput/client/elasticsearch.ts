import _ from 'lodash';
import moment from 'moment';
import LRUCache from 'lru-cache';
import { parseRange } from '@/components/TimeRangePicker';
import { getFullFields } from '@/pages/explorer/Elasticsearch/services';
import { getESVariableResult } from '@/services/dashboardV2';
// step6f（ES 升级轮）：原来这一行是 `from '@/pages/dashboard/VariableConfig/utils'`。
// pub 那份同名函数只收 1 个参数、语义也和 fe 不一样（详见下面这个文件开头的说明），
// pub 现有共享文件按纪律不许改，所以换成本目录下 fe 语义的本地副本。
import { normalizeESQueryRequestBody } from './normalizeESQueryRequestBody';

export interface Client {
  fields(): Promise<string[]>;
  fieldValues(field: string): Promise<string[]>;
}

export interface CacheConfig {
  maxAge?: number;
  initialMetricList?: string[];
}

export interface Config {
  datasourceValue?: number;
  query: any;
  httpErrorHandler?: (error: any) => void;
  cache?: CacheConfig;
}

export class HTTPClient implements Client {
  private readonly datasourceValue?: number;
  private readonly query: any;
  private readonly errorHandler?: (error: any) => void;

  constructor(config: Config) {
    this.datasourceValue = config.datasourceValue;
    this.query = config.query;
    this.errorHandler = config.httpErrorHandler;
  }

  fields(): Promise<string[]> {
    if (this.datasourceValue && this.query?.index) {
      // step6f（ES 升级轮）：fe v9.1.0 这里传的第三个参数是 `{ includeSubFields: true }`
      // （fe `src/pages/explorer/Elasticsearch/services.ts` 的 getFullFields 第三个参数是个 options 对象，
      //   includeSubFields=true 表示把 `xxx.keyword` 这类子字段也列出来）。
      // 羚牛 pub 的同名函数签名还是老的 `(datasourceValue, index?, type?, allow_hide_system_indices?)`，
      // 第三个参数是字符串 type，没有 includeSubFields 这回事（pub 同路径 `:76`）。
      // 按本轮纪律 pub 现有共享文件不许动，这里退成只传前两个参数：
      // 效果差别是 KQL 输入框的字段补全里不会出现 `.keyword` 这类子字段，其余不变。已登记。
      return getFullFields(this.datasourceValue, this.query.index)
        .then((res) => {
          return _.map(res.allFields, 'name');
        })
        .catch((error) => {
          if (this.errorHandler) {
            this.errorHandler(error);
          }
          return [];
        });
    }
    return Promise.resolve([]);
  }

  fieldValues(fieldName: string): Promise<string[]> {
    if (this.datasourceValue && this.query?.index && this.query?.date_field && this.query?.range) {
      const { index, date_field, range } = this.query;
      const start = moment(parseRange(range).start).valueOf();
      const end = moment(parseRange(range).end).valueOf();
      return getESVariableResult(
        this.datasourceValue,
        index,
        normalizeESQueryRequestBody(
          {
            find: 'terms',
            field: fieldName,
          },
          date_field,
          start,
          end,
        ),
      ).catch((error) => {
        if (this.errorHandler) {
          this.errorHandler(error);
        }
        return [];
      });
    }
    return Promise.resolve([]);
  }
}

class Cache {
  private fields: string[];
  private fieldValues: LRUCache<string, string[]>;

  constructor(config?: CacheConfig) {
    const maxAge = config && config.maxAge ? config.maxAge : 5 * 60 * 1000;
    this.fields = [];
    this.fieldValues = new LRUCache<string, string[]>(maxAge);
  }

  setFields(fields: string[]): void {
    this.fields = fields;
  }

  getFields(): string[] {
    return this.fields;
  }

  setFieldValues(fieldName: string, fieldValues: string[]): void {
    this.fieldValues.set(fieldName, fieldValues);
  }

  getFieldValues(fieldName: string): string[] {
    const labelValues = this.fieldValues.get(fieldName);
    return labelValues ? Array.from(labelValues) : [];
  }
}

export class CachedClient implements Client {
  private readonly cache: Cache;
  private readonly client: Client;

  constructor(client: Client, config?: CacheConfig) {
    this.client = client;
    this.cache = new Cache(config);
  }

  fields(): Promise<string[]> {
    const cachedFields = this.cache.getFields();
    if (cachedFields && cachedFields.length > 0) {
      return Promise.resolve(cachedFields);
    }

    return this.client.fields().then((fields) => {
      this.cache.setFields(fields);
      return fields;
    });
  }

  fieldValues(fieldName: string): Promise<string[]> {
    const cachedFieldValues = this.cache.getFieldValues(fieldName);
    if (cachedFieldValues && cachedFieldValues.length > 0) {
      return Promise.resolve(cachedFieldValues);
    }

    return this.client.fieldValues(fieldName).then((fields) => {
      this.cache.setFieldValues(fieldName, fields);
      return fields;
    });
  }
}
