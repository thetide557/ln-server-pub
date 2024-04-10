
import request from '@/utils/request';
import { RequestMethod } from '@/store/common';
import { message, notification } from 'antd';

// 查询分组对应大屏
export const getListGroupScreen = function () {
    return request(`/dataroomxc/bigScreenServer/bigScreen/design/listGroupScreen`, {
        method: RequestMethod.Get,
        timeout: 2000,
        errorHandler(error) {
            console.log(error.message)
            // 忽略掉 setting getter-only property "data" 的错误
            // 这是 umi-request 的一个 bug，当触发 abort 时 catch callback 里面不能 set data
            if (error.name !== 'AbortError' && error.message !== 'setting getter-only property "data"' && error.message !== 'timeout of 2000ms exceeded') {
                // @ts-ignore
                if (!error.silence) {
                    // notification.error({
                    //   message: error.message,
                    // });
                    message.error(error.message)
                    throw error;
                }
                // 暂时认定只有开启 silence 的时候才需要传递 error 详情以便更加精确的处理错误
                // @ts-ignore
                if (error.silence) {
                    throw error;
                } else {
                    message.error(error.message)
                    // throw new Error();
                    throw error;
                }
            }
            // throw error;
        },
    })
}

// 添加分组对应大屏
export const addGroupScreen = function (data: any) {
    return request("/dataroomxc/bigScreenServer/bigScreen/design/addGroupScreen", {
        method: RequestMethod.Post,
        data
    })
}

// 修改分组对应大屏
export const editGroupScreen = function (data: any) {
    return request("/dataroomxc/bigScreenServer/bigScreen/design/editGroupScreen", {
        method: RequestMethod.Post,
        data
    })
}

// 删除分组与大屏的对应关系
export const deleteGroupScreen = function (id: any) {
    return request(`/dataroomxc/bigScreenServer/bigScreen/design/deleteGroupScreen?id=${id}`, {
        method: RequestMethod.Post
    })
}

// 查询所有未绑定大屏的分组名称
export const listAllNotBoundGroupName = function () {
    return request(`/dataroomxc/bigScreenServer/bigScreen/design/listAllNotBoundGroupName`, {
        method: RequestMethod.Get
    })
}

// 查询所有未绑定分组的大屏code
export const listAllNotBoundScreenCode = function () {
    return request(`/dataroomxc/bigScreenServer/bigScreen/design/listAllNotBoundScreenCode`, {
        method: RequestMethod.Get
    })
}

// 根据id查询单个分组对应大屏
export const getGroupScreenById = function (id: any) {
    return request(`/dataroomxc/bigScreenServer/bigScreen/design/getGroupScreenById?id=${id}`, {
        method: RequestMethod.Get
    })
}

// 仪表盘列表
export const getDashboards = function (id: number | string) {
    return request(`/api/n9e/busi-group/${id}/boards`, {
        method: RequestMethod.Get,
    }).then((res) => {
        return res.dat;
    });
};

// 更新仪表盘
export const updateBoards = function (id: number | string) {
    return request(`/api/n9e/board/${id}/update`, {
        method: RequestMethod.Post,
    })
};



