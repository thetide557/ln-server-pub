declare namespace API.System {
  export interface DictType {
    id: number;
    dict_name: string;
    type_code: string;
    remark: string;
  }

  export interface DictTypeListParams {
    dictId?: string;
    dictName?: string;
    dictType?: string;
    status?: string;
    createBy?: string;
    createTime?: string;
    updateBy?: string;
    updateTime?: string;
    remark?: string;
    pageSize?: string;
    currentPage?: string;
    filter?: string;
    sorter?: string;
  }

  export interface DictTypeInfoResult {
    code: number;
    msg: string;
    data: Dict;
  }

  export interface DictTypePageResult {
    code: number;
    msg: string;
    total: number;
    rows: Array<Dict>;
  }

  export interface DictTypeResult {
    code: number;
    msg: string;
    data: Array<Dict>;
  }
}
