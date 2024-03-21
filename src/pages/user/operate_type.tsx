import { Space } from 'antd';
import React from 'react';

export enum OperateType { 
  ChangeOrganize = 'changeOrganize', 
  UnbindTag = 'unbindTag',
  BatchImport = 'batchImport', 
  None = 'none',
}
// export const SetOperateTypes = {
//     batch_operations:[
//       { key: OperateType.SelectDeviceType, label: ('添加设备') },
//       { key: OperateType.AssetBatchImport, label: ('导入设备') },
//       { key: OperateType.AssetBatchExport, label: ('导出设备') },
//       { key: OperateType.DeleteAssets, label: ('删除设备') },
//       { key: OperateType.ChangeCatalog, label: ('设备转移') },
//       { key: OperateType.CreatedCode, label: ('生成二维码') },
//       { key: OperateType.ChangeResponsible, label: ('更改责任人') },
//       { key: OperateType.ChangeOrganize, label: ('修改所属组织') },
//       { key: OperateType.ChangeRoom, label: ('更改所在机房') },
//       { key: OperateType.NetConfigExport, label: ('导出网络配置') },
//       { key: OperateType.NetConfigImport, label: ('导入网络配置') },
//     ],
   


