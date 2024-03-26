
import request from '@/utils/request';
import { RequestMethod } from '@/store/common';

// 查询分组对应大屏
export const getListGroupScreen = function () {
    return request(`/bigScreenServer/bigScreen/design/listGroupScreen`, {
        method: RequestMethod.Get
    })
}

// 添加分组对应大屏
export const addGroupScreen = function (data: any) {
    return request("/bigScreenServer/bigScreen/design/addGroupScreen", {
        method: RequestMethod.Post,
        data
    })
}

// 修改分组对应大屏
export const editGroupScreen = function (data: any) {
    return request("/bigScreenServer/bigScreen/design/editGroupScreen", {
        method: RequestMethod.Post,
        data
    })
}

// 删除分组与大屏的对应关系
export const deleteGroupScreen = function (id: any) {
    return request(`/bigScreenServer/bigScreen/design/deleteGroupScreen?id=${id}`, {
        method: RequestMethod.Post
    })
}

// 查询所有未绑定大屏的分组名称
export const listAllNotBoundGroupName = function () {
    return request(`/bigScreenServer/bigScreen/design/listAllNotBoundGroupName`, {
        method: RequestMethod.Get
    })
}

// 查询所有未绑定分组的大屏code
export const listAllNotBoundScreenCode = function () {
    return request(`/bigScreenServer/bigScreen/design/listAllNotBoundScreenCode`, {
        method: RequestMethod.Get
    })
}

// 根据id查询单个分组对应大屏
export const getGroupScreenById = function (id: any) {
    return request(`/bigScreenServer/bigScreen/design/getGroupScreenById?id=${id}`, {
        method: RequestMethod.Get
    })
}



