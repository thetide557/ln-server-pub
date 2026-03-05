import request from "@/utils/request";
import { RequestMethod } from "@/store/common";

// 获取值班列表

export const getDutyList = function (params) {
  return request("/api/n9e/busi-group/-1/duty/xh", {
    method: RequestMethod.Get,
    params,
  });
};

// 新增值班人员
export const addDuty = function (data) {
  return request("/api/n9e/busi-group/-1/duty/add", {
    method: RequestMethod.Post,
    data,
  });
};

// 查看值班人员信息
export const getDutyDetail = function (id) {
  return request(`/api/n9e/busi-group/duty/${id}`, {
    method: RequestMethod.Get,
  });
};

// 编辑值班人员信息
export const editDuty = function (data) {
  return request("/api/n9e/busi-group/-1/duty/update", {
    method: RequestMethod.Post,
    data,
  });
};

// 删除值班
export const deleteDuty = function (ids) {
  return request(`/api/n9e/busi-group/-1/duty`, {
    method: RequestMethod.Delete,
    data: { ids },
  });
};

// 检查人员是否有待值班任务
export const getPersonnelStatus = function (id) {
  return request(`/api/n9e/busi-group/personnel/status/${id}`, {
    method: RequestMethod.Get,
  });
};

// 启用/禁用值班人员
export const updateDutyPersonnelStatus = function (status, ids) {
  return request(`/api/n9e/busi-group/-1/duty/fields?action=${status}`, {
    method: RequestMethod.Put,
    data: { ids },
  });
};


// ============排班管理===================
// 获取值班人员列表
export const getDutyPersonnelOptions = function (params) {
  return request("/api/n9e/busi-group/duty/personnel/options", {
    method: RequestMethod.Get,
    params,
  });
};

// 新增排班
export const addSchedule = function (data) {
  return request("/api/n9e/busi-group/-1/duty/schedule/add", {
    method: RequestMethod.Post,
    data,
  });
};

// 获取当日排班详情
export const getScheduleDetail = function (params) {
  return request("/api/n9e/busi-group/schedule/detail", {
    method: RequestMethod.Get,
    params,
  });
};

// 获取当月排班列表
export const getScheduleList = function (params) {
  return request("/api/n9e/busi-group/schedule/detailmonth", {
    method: RequestMethod.Get,
    params,
  });
};

// 删除排班
export const deleteSchedule = function (id) {
  return request(`/api/n9e/xh/schedule/delete/${id}`, {
    method: RequestMethod.Delete,
  });
};

// 编辑排班
export const updateSchedule = function (data) {
  return request("/api/n9e/busi-group/-1/duty/schedule/update", {
    method: RequestMethod.Post,
    data,
  });
};

// 批量删除排班
export const batchDeleteSchedule = function (data) {
  return request("/api/n9e/xh/schedule/delete/batch", {
    method: RequestMethod.Delete,
    data,
  });
};


// ============值班日志===================

// 获取当月值班日志
export const getDutyLogList = function (params) {
  return request("/api/n9e/busi-group/dutylog/month", {
    method: RequestMethod.Get,
    params,
  });
};

// 获取当日值班日志详情
export const getDutyLogDetail = function (params) {
  return request("/api/n9e/busi-group/dutylog/detail", {
    method: RequestMethod.Get,
    params,
  });
};

// 新增值班日志
export const addDutyLog = function (data) {
  return request("/api/n9e/busi-group/-1/dutylog/add", {
    method: RequestMethod.Post,
    data,
  });
};

// 编辑值班日志
export const updateDutyLog = function (data) {
  return request("/api/n9e/busi-group/-1/dutylog/update", {
    method: RequestMethod.Post,
    data,
  });
};

// 删除值班日志
export const deleteDutyLog = function (ids) {
  return request(`/api/n9e/busi-group/-1/dutylog`, {
    method: RequestMethod.Delete,
    data: { ids },
  });
};

// 批量删除值班日志
export const batchDeleteDutyLog = function (data) {
  return request("/api/n9e/busi-group/-1/batchdutylog", {
    method: RequestMethod.Delete,
    data,
  });
}

// 自动排班
export const autoSchedule = function (data) {
  return request("/api/n9e/duty/schedule/auto", {
    method: RequestMethod.Post,
    data,
  });
};



