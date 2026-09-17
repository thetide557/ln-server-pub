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

export interface Dept {
    id: string;
    label: string;
}
export interface UserDept {
  deptId: string;
  deptName: string;
}

export interface Contacts {
  key: string;
  value: string;
}

export interface ContactsItem {
  key: string;
  label: string;
}
export interface User {
  id: string;
  userId: string;
  userName: string;
  nickName: string;
  deptName: string;
  phonenumber: number;
  status: string;
  createTime: string;
  admin: Boolean;
  avatar: string;
  deptId: string;
  email: string;
  createBy: string;
  dept:UserDept;
  contacts: Contacts[];
}

export interface UserList {
  list: Array<User>;
  total: number;
}

export enum UserType {
  User = '用户',
  Team = '团队',
}

export enum ActionType {
  CreateUser = '创建用户',
  EditUser = '编辑用户信息',
  Reset = '重置密码',
  Disable = '禁用',
  Undisable = '启用',
  AddUser = '添加成员',
}
export enum RoleType {
  Admin = '管理员',
  Standard = 'standard',
  Guest = 'guest',
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
  userType?: string;
  onClose?: any;
  action: ActionType;
  userId?: string;
  userName?:string;
  nickName?:string;
  teamId?: string;
  memberId?: string;
  onSearch?: any;
  width?: number;
  deptList?: any;
}
export interface UserAndPasswordFormProps {
  userId?: string;
  deptList?:any;
}
export interface ContactsItem {
  key: string;
  label: string;
}
export interface PopoverProps {
  userId?: string;
  teamId?: string;
  memberId?: string;
  onClose: any;
  userType: string;
  isIcon?: boolean;
}
