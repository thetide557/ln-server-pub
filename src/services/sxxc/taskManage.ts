import request from '@/utils/request';
import { RequestMethod } from '@/store/common';

// 获取任务管理列表
export function getBizScriptList(params) {
    return request(`/sxxcTask/biz/script/list`, {
        method: RequestMethod.Get,
        params,
    });
}
// 新增任务
export function addBizScript (data: any) {
    return request(`/sxxcTask/biz/script/add`, {
      method: RequestMethod.Post,
      data,
    });
};
// 删除任务
export function removeBizScript (ids: any) {
    return request(`/sxxcTask/biz/script/remove/${ids}`, {
      method: RequestMethod.Post,
    });
};
// 修改任务
export function editBizScript (data: any) {
    return request(`/sxxcTask/biz/script/edit`, {
      method: RequestMethod.Post,
      data,
    });
};
// 获取任务管理列表
export function getBizScriptInfo(id:any) {
    return request(`/sxxcTask/biz/script/${id}`, {
        method: RequestMethod.Get
    });
}
// 执行任务
export function runTask (data: any) {
    return request(`/sxxcTask/biz/task/excutor/run`, {
      method: RequestMethod.Post,
      data,
    });
};
// 查看任务执行结果
export function getTaskLog(params) {
    return request(`/sxxcTask/biz/task/excutor/getLog`, {
        method: RequestMethod.Get,
        params,
    });
}
// 查看任务日志列表
export function getTaskLogList(params) {
    return request(`/sxxcTask/biz/task/log/list`, {
        method: RequestMethod.Get,
        params,
    });
}
// 查看任务日志详情
export function getTaskLogInfo(id) {
    return request(`/sxxcTask/biz/task/log/${id}`, {
        method: RequestMethod.Get,
    });
}
// 查看任务类型
export function getTaskTypeList(params) {
    return request(`/sxxcTask/biz/task/type/list`, {
        method: RequestMethod.Get,
        params,
    });
}
// 查询策略列表
export function getStrategyList(params) {
    return request(`/sxxcTask/biz/strategy/list`, {
        method: RequestMethod.Get,
        params,
    });
}

// 执行任务弹窗资产列表
export function getBizScriptAssets(params) {
    return request(`/sxxcTask/biz/script/assets`, {
        method: RequestMethod.Get,
        params,
    });
}