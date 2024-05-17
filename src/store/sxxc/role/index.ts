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

export interface Role {
  roleId: string;
  roleName: string;
  roleType:string;
  status: string;
  remark: string;
}
export interface User {
  userId: string;
  userName: string;
  nickName:string;
  status: string;
  email: string;
  phonenumber: string;
  createTime: string;
}
export interface RoleInfo {
  roleId:number;
  roleName: string;
  roleSort:string;
  roleKey:string;
  status: string;
  remark: string;
}

export interface RoleList {
  list: Array<Role>;
  total: number;
}
export enum RoleType {
  Role = '角色',
  CreateRole = '新建角色',
  EditData = '数据权限',
  EditRole = '修改角色',
  AddUser = '添加用户'
}
export interface Title {
  create: string;
  edit: string;
  disabled: string;
  reset: string;
}

export interface ModalProps {
  visible: boolean;
  roleType?: string;
  onClose?: any;
  role: RoleType;
  roleId?: string;
  roleInfo?: any;
  onSearch?: any;
  width?: number;
}
export interface RoleFormProps {
  roleId?: string;
  roleInfo?: any;
}
