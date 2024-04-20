/*
 * Copyright 2022 Nightingale Team
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 */
import React from 'react';

export interface Dict {
  dictCode: string;
  dictLabel: string;
  dictSort:string;
  dictType:string;
  status: string;
  remark: string;
}
export interface DictInfo {
  dictName: string;
  dictType:string;
  status: string;
  remark: string;
}

export interface DictSearch {
    dictLabel: string;
    dictType:string;
    status: string;
  }

export interface DictList {
  list: Array<Dict>;
  total: number;
}
export enum DictType {
  Dict = '巡检任务',
  CreateDict = '新建巡检任务',
  RunDict = '执行巡检任务',
  EditDict = '修改巡检任务',
}
export interface Title {
  create: string;
  edit: string;
  disabled: string;
  reset: string;
}

export interface ModalProps {
  visible: boolean;
  dictType?: string;
  onClose?: any;
  dict: DictType;
  dictCode?: string;
  dictInfo?: any;
  onSearch?: any;
  width?: number;
}
export interface DictFormProps {
  dictCode?: string;
  dictInfo?: any;
  dictType?: string;
}
