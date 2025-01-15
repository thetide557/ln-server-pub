import request from '@/utils/request';
import { RequestMethod } from '@/store/common';

// 获取巡检列表
export function getInspectionList(params) {
    return request(`/sxxcTask/biz/task/inspection/list`, {
        method: RequestMethod.Get,
        params,
    });
}
// 获取巡检任务详情
export function getInspectionDetail(id) {
    return request(`/sxxcTask/biz/task/inspection/${id}`, {
        method: RequestMethod.Get,
    });
}
// 获取巡检任务详情
export function getInspectionDetailByGroup(id, params) {
    return request(`/sxxcTask/biz/task/inspection/detail/${id}`, {
        method: RequestMethod.Get,
        params
    });
}
// 新增巡检
export function addInspection (data: any) {
    return request(`/sxxcTask/biz/task/inspection/add`, {
      method: RequestMethod.Post,
      data,
    });
};
// 有效or无效
export function editInspectionStatus (data: any) {
    return request(`/sxxcTask/biz/task/inspection/changeStatus`, {
      method: RequestMethod.Post,
      data,
    });
};
// 修改巡检
export function editInspection (data: any) {
    return request(`/sxxcTask/biz/task/inspection/edit`, {
      method: RequestMethod.Post,
      data,
    });
};
// 删除任务
export function removeInspection (ids: any) {
    return request(`/sxxcTask/biz/task/inspection/remove/${ids}`, {
      method: RequestMethod.Post,
    });
};
// 获取巡检日志列表
export function getInspectionLogList(params) {
    return request(`/sxxcTask/biz/inspection/log/list`, {
        method: RequestMethod.Get,
        params,
    });
}
// 获取巡检报告列表
export function getInspectionReportList(params) {
    return request(`/sxxcTask/biz/inspection/log/listReport`, {
        method: RequestMethod.Get,
        params,
    });
}

// 获取巡检报告内容
export function getInspectionReport(params) {
    return request(`/sxxcTask/biz/inspection/log/report`, {
        method: RequestMethod.Get,
        params,
    });
}