import request from '@/utils/request';
import { RequestMethod } from '@/store/common';

// 获取任务策略列表
export function getBizStrategyList(params) {
    return request(`/sxxc/biz/strategy/list`, {
        method: RequestMethod.Get,
        params,
    });
}
// 新增任务
export function addBizStrategy (data: any) {
    return request(`/sxxc/biz/strategy`, {
      method: RequestMethod.Post,
      data,
    });
};
// 删除任务
export function removeBizStrategy (ids: any) {
    return request(`/sxxc/biz/strategy/${ids}`, {
      method: RequestMethod.Delete,
    });
};
// 修改任务
export function editBizStrategy (data: any) {
    return request(`/sxxc/biz/strategy`, {
      method: RequestMethod.Put,
      data,
    });
};
export function getBizStrategyInfo(id:any) {
    return request(`/sxxc/biz/strategy/${id}`, {
        method: RequestMethod.Get
    });
}