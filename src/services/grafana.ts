import request from "@/utils/request";

// 获取看板列表
export const getDashboards = function (id: number) {
    return request.get(`/grafana/api/search/?folderIds=${id}`)
};

// 获取目录信息
export const getFolder = function(uid: string) {
    return request.get(`/grafana/api/folders/${uid}`)
}

//删除看板
export const deleteDashboard = function(uid: string) {
    return request.delete(`/grafana/api/dashboards/uid/${uid}`)
}

//创建目录
export const createFolder = function(data) {
    return request.post(`/grafana/api/folders`, {
        data
    })
}