import request from "@/utils/request";
import { RequestMethod } from "@/store/common";

// 获取值班列表

export const getDutyList = function (params) {
  return request("/api/takin/duty/list", {
    method: RequestMethod.Get,
    params,
  });
};

// 新增值班人员
export const addDuty = function (data) {
  return request("/api/takin/duty/add", {
    method: RequestMethod.Post,
    data,
  });
};

// 查看值班人员信息
export const getDutyDetail = function (id) {
  return request(`/api/takin/duty/${id}`, {
    method: RequestMethod.Get,
  });
};

// 编辑值班人员信息
export const editDuty = function (data) {
  return request("/api/takin/duty/update", {
    method: RequestMethod.Post,
    data,
  });
};

// 删除值班
export const deleteDuty = function (ids) {
  return request(`/api/takin/duty`, {
    method: RequestMethod.Delete,
    data: { ids },
  });
};

// 检查人员是否有待值班任务
export const getPersonnelStatus = function (id) {
  return request(`/api/takin/personnel/status/${id}`, {
    method: RequestMethod.Get,
  });
};

// 启用/禁用值班人员
export const updateDutyPersonnelStatus = function (status, ids) {
  return request(`/api/takin/duty/fields?action=${status}`, {
    method: RequestMethod.Put,
    data: { ids },
  });
};


// ============排班管理===================
// 获取值班人员列表
// export const getDutyPersonnelOptions = function (params) {
//   return request("/api/takin/duty/personnel/options", {
//     method: RequestMethod.Get,
//     params,
//   });
// };

export const getDutyPersonnelOptions = function (params) {
  return request("/api/takin/schedule/personnel/options", {
    method: RequestMethod.Get,
    params,
  });
};

// 新增排班
export const addSchedule = function (data) {
  return request("/api/takin/schedule/add", {
    method: RequestMethod.Post,
    data,
  });
};

// 获取当日排班详情
export const getScheduleDetail = function (params) {
  return request("/api/takin/schedule/detail", {
    method: RequestMethod.Get,
    params,
  });
};

// 获取当月排班列表
export const getScheduleList = function (params) {
  return request("/api/takin/schedule/calendar", {
    method: RequestMethod.Get,
    params,
  });
};

// 删除排班
export const deleteSchedule = function (id) {
  return request(`/api/takin/schedule/delete/${id}`, {
    method: RequestMethod.Delete,
  });
};

// 编辑排班
export const updateSchedule = function (data, id) {
  return request(`/api/takin/schedule/update/${id}`, {
    method: RequestMethod.Post,
    data,
  });
};

// 批量删除排班
export const batchDeleteSchedule = function (data) {
  return request("/api/takin/schedule/batch-delete", {
    method: RequestMethod.Delete,
    data,
  });
};

// 悬浮展示排班人员信息
export const getSchedulePersonnel = function (params) {
  return request(`/api/takin/schedule/personnel-info`, {
    method: RequestMethod.Get,
    params
  });
};

// 获取当日值班
export const getTodayDuty = function (params) {
  return request(`/api/takin/duty/today`, {
    method: RequestMethod.Get,
    params
  });
};

// 自动排班
export const autoSchedule = function (data) {
  return request("/api/takin/schedule/auto", {
    method: RequestMethod.Post,
    data,
  });
};


// ============值班日志===================

// 获取当月值班日志
export const getDutyLogCalendar = function (params) {
  return request("/api/takin/dutylog/calendar", {
    method: RequestMethod.Get,
    params,
  });
};

// 获取当日值班日志详情
export const getDutyLogDetail = function (params) {
  return request("/api/takin/dutylog/detail", {
    method: RequestMethod.Get,
    params,
  });
};

// 根据id获取值班日志详情
export const getDutyLogById = function (id) {
  return request(`/api/takin/dutylog/${id}`, {
    method: RequestMethod.Get,
  });
};

// 获取值班日志记录人所拥有的值班类型
export const getDutyLogRecord = function (params) {
  return request(`/api/takin/dutylog/recorder/duty-types`, {
    method: RequestMethod.Get,
    params
  });
};

// 新增值班日志
export const addDutyLog = function (data) {
  return request("/api/takin/dutylog/add", {
    method: RequestMethod.Post,
    data,
  });
};

// 编辑值班日志
export const updateDutyLog = function (data, id) {
  return request(`/api/takin/dutylog/update/${id}`, {
    method: RequestMethod.Post,
    data,
  });
};

// 删除值班日志
export const deleteDutyLog = function (id) {
  return request(`/api/takin/dutylog/delete/${id}`, {
    method: RequestMethod.Delete,
  });
};

// 批量删除值班日志
export const batchDeleteDutyLog = function (data) {
  return request("/api/takin/dutylog/batch-delete", {
    method: RequestMethod.Delete,
    data,
  });
}

// 获取日志编号
export const getDutyLogNo = function (params) {
  return request("/api/takin/dutylog/no", {
    method: RequestMethod.Get,
    params,
  });
};


// ============项目支撑===================
// 获取项目支撑人员选项
export const getSupportOptions = function () {
  return request("/api/takin/duty/personnel/support-options", {
    method: RequestMethod.Get,
  });
};

// 新增项目支撑排班
export const addProdectSchedule = function (data) {
  return request("/api/takin/project/schedule/add", {
    method: RequestMethod.Post,
    data,
  });
};

// 查询单日排班详情
export const getProjectScheduleDetail = function (params) {
  return request("/api/takin/project/schedule/detail", {
    method: RequestMethod.Get,
    params,
  });
};

// 查询月度排班
export const getProjectScheduleList = function (params) {
  return request("/api/takin/project/schedule/detail-month", {
    method: RequestMethod.Get,
    params,
  });
};

// 删除单个项目支撑排班
export const deleteProjectScheduleById = function (id) {
  return request(`/api/takin/xh/project/schedule/delete/${id}`, {
    method: RequestMethod.Delete,
  });
};

// 更新项目支撑排班
export const updateProjectSchedule = function (data) {
  return request("/api/takin/project/schedule/update", {
    method: RequestMethod.Post,
    data,
  });
};

// 批量删除项目支撑排班
export const batchDeleteProjectSchedule = function (data) {
  return request("/api/takin/project/schedule/batch-delete", {
    method: RequestMethod.Delete,
    data,
  });
};

// 自动排班
export const autoProjectSchedule = function (data) {
  return request("/api/takin/project/schedule/auto", {
    method: RequestMethod.Post,
    data,
  });
};