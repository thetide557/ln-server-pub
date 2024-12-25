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

export interface Contacts {
  key: string;
  value: string;
}
export interface Task {
  id: string;
  title: string;
  content: string;
  strategyId: string;
  status: string;
  taskTypeId: string;
}

export interface Log {
  id: string;
  taskName: string;
  taskType: string;
  taskSubType: string;
  strategyName: string;
  inspectionLogName: string;
  projectName: string;
  createTime: string;
  host: string;
  taskReslut: string;
  scriptId:string;
  excuteId:Number;
}

export interface Serve {
  id: string;
  ident: string;
  remote_addr: string;
  ip:string;
  groupId:number
}

export interface Team {
  id: string;
  name: string;
  note: string;
  create_at: number;
  create_by: string;
  update_at: number;
  update_by: string;
}
export interface TaskList {
  list: Array<Task>;
  total: number;
}
export interface TeamList {
  list: Array<Team>;
  total: number;
}
export interface TeamInfo {
  task_groups?: Team;
  task_group?: Team;
  tasks: Array<Task>;
}
export enum TaskType {
  Task = '任务',
  CreateTask = '新建任务',
  RunTask = '执行任务',
  EditTask = '编辑任务信息',
}
export enum RoleType {
  Admin = '管理员',
  Standard = '普通用户',
  Guest = '游客',
}
export interface Title {
  create: string;
  edit: string;
  disabled: string;
  reset: string;
}
export type TitleKey = keyof Title;

export interface ModalProps {
  visible: boolean;
  taskType?: string;
  onClose?: any;
  task: TaskType;
  taskId?: string;
  teamId?: string;
  memberId?: string;
  onSearch?: any;
  width?: number;
}
export interface TeamProps {
  onClose?: any;
  teamId?: string;
  businessId?: string;
  onSelect?: any;
  task?: TaskType;
}
export interface TaskAndPasswordFormProps {
  taskId?: string;
}
export interface ContactsItem {
  key: string;
  label: string;
}
export interface PopoverProps {
  taskId?: string;
  teamId?: string;
  memberId?: string;
  onClose: any;
  taskType: string;
  isIcon?: boolean;
}
