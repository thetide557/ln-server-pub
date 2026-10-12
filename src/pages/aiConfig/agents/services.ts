import _ from 'lodash';

import request from '@/utils/request';
import { RequestMethod } from '@/store/common';

import { Item, FormValues } from './types';

export type { Item, FormValues };

export const getList = function (): Promise<Item[]> {
  return request('/api/takin/ai-agents', {
    method: RequestMethod.Get,
  }).then((res) => res.dat ?? []);
};

export const getItem = function (id: number): Promise<Item> {
  return request(`/api/takin/ai-agent/${id}`, {
    method: RequestMethod.Get,
  }).then((res) => res.dat);
};

export const postItem = function (data: FormValues) {
  return request('/api/takin/ai-agents', {
    method: RequestMethod.Post,
    data,
  }).then((res) => res.dat);
};

export const putItem = function (id: number, data: FormValues) {
  return request(`/api/takin/ai-agent/${id}`, {
    method: RequestMethod.Put,
    data,
  }).then((res) => res.dat);
};

export const deleteItem = function (id: number) {
  return request(`/api/takin/ai-agent/${id}`, {
    method: RequestMethod.Delete,
  }).then((res) => res.dat);
};

export const getMCPServers = function (): Promise<{ id: number; name: string }[]> {
  return request('/api/takin/mcp-servers', {
    method: RequestMethod.Get,
  }).then((res) => res.dat ?? []);
};
