
import request from '@/utils/request';
import { RequestMethod } from '@/store/common';
import { ApiServiceType } from '@/pages/apiService';

export const listApiService = function (params = {}) {
    return request("/api/n9e/api-service", {
        method: RequestMethod.Get,
        params
    })
}

export const getApiService = function (id: number|string) {
    return request(`/api/n9e/api-service/${id}`, {
        method: RequestMethod.Get
    })
}

export const createApiService = function (data: ApiServiceType) {
    return request("/api/n9e/api-service", {
        method: RequestMethod.Post,
        data
    })
}

export const updateApiService = function (data: ApiServiceType) {
    return request("/api/n9e/api-service", {
        method: RequestMethod.Put,
        data
    })
}

export const deleteApiService = function (id: number|string) {
    return request(`/api/n9e/api-service/${id}`, {
        method: RequestMethod.Delete
    })
}

export const executeApiService = function (id: number|string) {
    return request(`/api/n9e/api-service/${id}/execute`, {
        method: RequestMethod.Get
    })
}

export const getApiServiceOptions = function () {
    return request(`/api/n9e/api-service/options`, {
        method: RequestMethod.Get
    })
}

/*
    党政军省政府定制化首页，提取自dashboardV2接口，重新调用
*/
export const fetchHistoryRangeBatch = function (data) {
    return request("/api/n9e/query-range-batch", {
        method: RequestMethod.Post,
        data
    })
}
export const fetchHistoryInstantBatch = function (data) {
    return request("/api/n9e/query-instant-batch", {
        method: RequestMethod.Post,
        data
    })
}