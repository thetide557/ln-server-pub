declare namespace API.System {
  interface DictData {
    id: number;
    dict_label: string;
    dict_name: string;
    remark: string;
  }

  export interface DictDataListParams {
    dictCode?: string;
    dictSort?: string;
    dictLabel?: string;
    dictValue?: string;
    dictType?: string;
    cssClass?: string;
    listClass?: string;
    isDefault?: string;
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

  export interface DictDataInfoResult {
    current: number;
    pageSize: number;
    total: number;
    data: DictData;
  }

  export interface DictDataPageResult {
    code: number;
    msg: string;
    total: number;
    rows: Array<DictData>;
  }
}
