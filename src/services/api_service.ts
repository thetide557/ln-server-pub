
import request from '@/utils/request';
import { RequestMethod } from '@/store/common';
import { ApiServiceType } from '@/pages/apiService';

export const listApiService = function (params = {}) {
    return request("/api/takin/api-service", {
        method: RequestMethod.Get,
        params
    })
}

export const getApiService = function (id: number|string) {
    return request(`/api/takin/api-service/${id}`, {
        method: RequestMethod.Get
    })
}

export const createApiService = function (data: ApiServiceType) {
    return request("/api/takin/api-service", {
        method: RequestMethod.Post,
        data
    })
}

export const updateApiService = function (data: ApiServiceType) {
    return request("/api/takin/api-service", {
        method: RequestMethod.Put,
        data
    })
}

export const deleteApiService = function (id: number|string) {
    return request(`/api/takin/api-service/${id}`, {
        method: RequestMethod.Delete
    })
}

export const executeApiService = function (id: number|string) {
    return request(`/api/takin/api-service/${id}/execute`, {
        method: RequestMethod.Get
    })
}

export const getApiServiceOptions = function () {
    return request(`/api/takin/api-service/options`, {
        method: RequestMethod.Get
    })
}