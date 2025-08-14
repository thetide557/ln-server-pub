import request from '@/utils/request';
import { RequestMethod } from '@/store/common';

// 获取部署记录列表
export function getDeploymentsList(params) {
    return request(`/api/n9e/deployments`, {
        method: RequestMethod.Get,
        params,
    });
}
// 获取部署记录详情
export function getDeploymentsDetails(id) {
    return request(`/api/n9e/deployment/${id}`, {
        method: RequestMethod.Get,
    });
}
// 删除部署记录
export function delDeployments(id) {
    return request(`/api/n9e/deployment/${id}`, {
        method: RequestMethod.Delete,
    });
}
// 新增部署记录
export function addDeployment (data: any) {
    return request(`/api/n9e/deployment`, {
      method: RequestMethod.Post,
      data,
    });
};
// 更新部署记录
export function putDeployment (data: any) {
    return request(`/api/n9e/deployment`, {
      method: RequestMethod.Put,
      data,
    });
};
// 批量删除部署记录
export function batchDelDeployment (data: any) {
    return request(`/api/n9e/deployment/batch-del`, {
      method: RequestMethod.Post,
      data,
    });
};