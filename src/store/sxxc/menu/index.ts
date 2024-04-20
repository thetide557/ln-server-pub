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

export interface Menu {
  menuId: string;
  parentId:string;
  menuName: string;
  status: string;
  visible: string;
  icon: string;
  perms: string;
  component: string;
  createTime: string;
  children: [];
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
export interface MenuInfo {
  menuId:number;
  menuName: string;
  menuSort:string;
  menuKey:string;
  status: string;
  remark: string;
  parentId: number;
}

export interface MenuList {
  list: Array<Menu>;
  total: number;
}
export enum MenuType {
  Menu = '菜单',
  CreateMenu = '新建菜单',
  EditData = '数据权限',
  EditMenu = '修改菜单',
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
  menuType?: string;
  onClose?: any;
  menu: MenuType;
  menuId?: string;
  menuInfo?: any;
  onSearch?: any;
  width?: number;
  menuList?: any;
}
export interface MenuFormProps {
  menuId?: string;
  menuInfo?: any;
  menuList?: any;
  menu?:string;
}
