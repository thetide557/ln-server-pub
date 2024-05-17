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

export interface Inspection {
  id: string;
  name: string;
  strategyId: string;
  status: string;
  inspectionTypeId: string;
  successCount:any;
  taskCount:any;
}

export interface InspectionList {
  list: Array<Inspection>;
  total: number;
}
export enum InspectionType {
  Inspection = '巡检任务',
  CreateInspection = '新建巡检任务',
  RunInspection = '执行巡检任务',
  EditInspection = '修改巡检任务',
}
export interface Title {
  create: string;
  edit: string;
  disabled: string;
  reset: string;
}

export interface ModalProps {
  visible: boolean;
  inspectionType?: string;
  onClose?: any;
  inspection: InspectionType;
  inspectionId?: string;
  teamId?: string;
  memberId?: string;
  onSearch?: any;
  width?: number;
}
export interface InspectionFormProps {
  inspectionId?: string;
}
