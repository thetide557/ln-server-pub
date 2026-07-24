import React, { useState, useEffect, useContext, useCallback } from "react";
import {
  Calendar,
  Card,
  Row,
  Col,
  Button,
  Spin,
  Empty,
  message,
  Modal,
  Timeline,
  Form,
  Select,
  DatePicker,
  Space,
  Tooltip,
  Input,
  Radio,
} from "antd";
import {
  PlusSquareFilled,
  EditOutlined,
  DeleteOutlined,
  UploadOutlined,
  LeftCircleFilled,
  RightCircleFilled,
  MinusSquareOutlined,
} from "@ant-design/icons";
import moment, { Moment } from "moment";
import type { CalendarProps } from "antd";
import { Lunar } from "lunar-typescript";
import {
  getDutyLogCalendar,
  getDutyLogDetail,
  addDutyLog,
  updateDutyLog,
  deleteDutyLog,
  getDutyLogNo,
  getDutyLogRecord,
  getDutyList,
  batchDeleteDutyLog,
} from "@/services/sxxc/dutyManage";
import { exportTemplet } from "@/services/assets/asset";
import "./DutyLogs.less";
import { CommonStateContext } from "@/App";
import _ from "lodash";
import BatchDeleteModal, { TimeRange } from './BatchDeleteModal';

// 日志明细
interface DutyLogDetailItem {
  id?: number;
  dutyType: number;
  hasUnfinished?: boolean;
  unfinishedDesc?: string;
  overallStatus?: number;
  overallDesc?: string;
}

// 日志主记录
interface DutyLogItem {
  id: number;
  logDate: number | string;
  logNo: string;
  recorderId: number;
  recorderName: string;
  recordTime: number;
  dutyTypes: DutyLogDetailItem[];
}

// 日历某天
interface CalendarDayItem {
  date: number;
  day: number;
  hasLog: boolean;
  isToday: boolean;
  hasUnfinished?: boolean;
  unfinishedDesc?: string;
  prevUnfinished?: boolean;
  prevUnfinishedDesc?: string;
  displayUnfinished?: boolean;
  displayUnfinishedDesc?: string;
  logs?: DutyLogItem[];
}

// 值班人员选项接口
interface PersonnelOption {
  id: number;
  name: string;
  status?: number;
  duty_type_configs?: Array<{ dutyType: number; busiGroupIds?: number[] }>;
}

// 值班类型选项
const DUTY_TYPE_OPTIONS = [
  { label: "日常常规", value: 1 },
  { label: "备班值班", value: 2 },
  { label: "重保专项", value: 3 },
];

// 当班整体运行状态选项
const OVERALL_STATUS_OPTIONS = [
  { label: "整体正常", value: 1 },
  { label: "轻微隐患", value: 2 },
  { label: "重大故障", value: 3 },
];

// 是否有未办结事项选项
const UNFINISHED_OPTIONS = [
  { label: "否", value: false },
  { label: "是", value: true },
];

const getDutyTypeLabel = (value?: number) =>
  DUTY_TYPE_OPTIONS.find((opt) => opt.value === value)?.label || "未知类型";

const getOverallStatusLabel = (value?: number) =>
  OVERALL_STATUS_OPTIONS.find((opt) => opt.value === value)?.label || "未知状态";

const DutyLogs: React.FC = () => {
  // 状态管理
  const [selectedDate, setSelectedDate] = useState<Moment>(moment());
  const [selectedMonth, setSelectedMonth] = useState<Moment>(moment());
  const [calendarDays, setCalendarDays] = useState<CalendarDayItem[]>([]);
  const [currentLogs, setCurrentLogs] = useState<DutyLogItem[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalType, setModalType] = useState<"add" | "edit">("add");
  const [initData, setInitData] = useState<DutyLogItem | undefined>(undefined);
  const { profile, permList } = useContext(CommonStateContext);
  const [refreshKey, setRefreshKey] = useState(_.uniqueId("refreshKey_"));
  const [batchDeleteVisible, setBatchDeleteVisible] = useState(false);
  const [personnelOptions, setPersonnelOptions] = useState<PersonnelOption[]>([]);
  const [recorderDutyTypeOptions, setRecorderDutyTypeOptions] = useState<{ label: string; value: number }[]>([]);
  const [logNo, setLogNo] = useState<string>("");
  const [prevUnfinishedDesc, setPrevUnfinishedDesc] = useState<string>("");

  // 获取值班人员选项（已启用）
  const fetchPersonnelOptions = useCallback(() => {
    getDutyList({ page: 1, limit: 5000 })
      .then(({ dat }) => {
        const options = (dat?.list || []).filter((p: PersonnelOption) => {
          return p.status === 1;
        });
        setPersonnelOptions(options);
      })
      .catch(() => {
        setPersonnelOptions([]);
      });
  }, []);

  useEffect(() => {
    fetchPersonnelOptions();
  }, [fetchPersonnelOptions]);

  // 只可选登录当天及以后日期
  const disableDate = (current: Moment) => {
    const today = moment().startOf("day");
    return current && current < today;
  };

  useEffect(() => {
    getCurrentSchedule();
  }, [selectedDate]);

  useEffect(() => {
    getData();
  }, [selectedMonth, refreshKey]);

  // 获取当月日历数据
  const getData = useCallback(async () => {
    try {
      const param = { month: selectedMonth.format("YYYY-MM") };
      setLoading(true);
      const { dat } = await getDutyLogCalendar(param);
      const rawCalendar = dat?.calendar;
      const days = (Array.isArray(rawCalendar) ? rawCalendar : rawCalendar?.days) || [];
      const processedDays: CalendarDayItem[] = days.map((day: any) => {
        const hasLog = day.hasLog || day.has_log || false;
        const hasUnfinished = day.hasUnfinished || day.has_unfinished || false;
        const unfinishedDesc = day.unfinishedDesc || day.unfinished_desc || "";
        const prevUnfinished = day.prevUnfinished || day.prev_unfinished || false;
        const prevUnfinishedDesc = day.prevUnfinishedDesc || day.prev_unfinished_desc || "";
        const displayUnfinished =
          day.displayUnfinished || day.display_unfinished || hasUnfinished || prevUnfinished || false;
        const displayUnfinishedDesc =
          day.displayUnfinishedDesc ||
          day.display_unfinished_desc ||
          (hasUnfinished ? unfinishedDesc : prevUnfinished ? prevUnfinishedDesc : "");
        return {
          ...day,
          hasLog,
          hasUnfinished,
          unfinishedDesc,
          prevUnfinished,
          prevUnfinishedDesc,
          displayUnfinished,
          displayUnfinishedDesc,
        };
      });
      setCalendarDays(processedDays);
    } catch (error) {
      message.error("获取值班日志日历失败");
      setCalendarDays([]);
    } finally {
      setLoading(false);
    }
  }, [selectedMonth]);

  // 处理日期选择
  const onDateSelect = (date: Moment) => {
    setSelectedDate(date);
    if (!selectedMonth.isSame(date, 'month')) {
      setSelectedMonth(date);
    }
  };

  // 获取当日值班日志
  const getCurrentSchedule = () => {
    setDetailLoading(true);
    getDutyLogDetail({
      date: selectedDate.format("YYYY-MM-DD"),
    }).then(({ dat }) => {
      const logs = (dat?.logs || []).map((item: any) => {
        const dutyTypes = item.dutyTypes || item.duty_types || [];
        const singleDutyType =
          item.dutyType !== undefined || item.duty_type !== undefined
            ? [
              {
                id: item.detailId || item.detail_id,
                dutyType: item.dutyType || item.duty_type,
                hasUnfinished:
                  item.hasUnfinished !== undefined
                    ? item.hasUnfinished
                    : item.has_unfinished,
                unfinishedDesc: item.unfinishedDesc || item.unfinished_desc || "",
                overallStatus: item.overallStatus || item.overall_status,
                overallDesc: item.overallDesc || item.overall_desc || "",
              },
            ]
            : [];
        return {
          ...item,
          logDate: item.logDate || item.log_date,
          logNo: item.logNo || item.log_no,
          recorderId: item.recorderId || item.recorder_id,
          recorderName: item.recorderName || item.recorder_name,
          recordTime: item.recordTime || item.record_time,
          dutyTypes: dutyTypes.length > 0 ? dutyTypes : singleDutyType,
        };
      }) as DutyLogItem[];
      setDetailLoading(false);
      setCurrentLogs(logs);
      setPrevUnfinishedDesc(dat?.prevUnfinishedDesc || dat?.prev_unfinished_desc || "");
    }).catch(() => {
      setDetailLoading(false);
      setCurrentLogs([]);
      setPrevUnfinishedDesc("");
    });
  };

  // 获取预生成日志编号
  const fetchLogNo = async (date?: Moment) => {
    const targetDate = date || selectedDate;
    try {
      const { dat } = await getDutyLogNo({ date: targetDate.format("YYYY-MM-DD") });
      setLogNo(dat?.logNo || dat?.log_no || "");
    } catch (error) {
      setLogNo("");
    }
  };

  // 获取记录人拥有的值班类型
  const fetchRecorderDutyTypes = async (recorderId?: number) => {
    if (!recorderId) {
      setRecorderDutyTypeOptions(DUTY_TYPE_OPTIONS);
      return;
    }
    try {
      const { dat } = await getDutyLogRecord({ recorderId });
      const rawOptions = Array.isArray(dat)
        ? dat
        : Array.isArray(dat?.options)
          ? dat.options
          : Array.isArray(dat?.list)
            ? dat.list
            : [];
      const options = rawOptions.map((item: any) => ({
        label: item.label || item.name || item.dutyTypeName,
        value: item.value || item.code || item.dutyType,
      }));
      setRecorderDutyTypeOptions(options.length > 0 ? options : DUTY_TYPE_OPTIONS);
    } catch (error) {
      setRecorderDutyTypeOptions(DUTY_TYPE_OPTIONS);
    }
  };

  // 处理新增/编辑日志
  const showModal = async (type: "add" | "edit", id?: number) => {
    setModalType(type);
    setModalVisible(true);
    form.resetFields();
    setInitData(undefined);

    if (type === "edit") {
      try {
        setConfirmLoading(true);
        const current = currentLogs.find((item) => item.id === id);
        if (current) {
          const { logDate, recorderId, logNo: currentLogNo, dutyTypes } = current;
          await fetchRecorderDutyTypes(recorderId);
          const formData = {
            logDate: logDate
              ? typeof logDate === "string" && logDate.includes("-")
                ? moment(logDate, "YYYY-MM-DD")
                : moment.unix(Number(logDate))
              : moment(),
            recorderId,
            dutyTypes: (dutyTypes || []).map((dt: any) => ({
              dutyType: dt.dutyType,
              overallStatus: dt.overallStatus,
              overallDesc: dt.overallDesc,
              hasUnfinished: dt.hasUnfinished === undefined ? false : dt.hasUnfinished,
              unfinishedDesc: dt.unfinishedDesc || "",
            })),
          };
          form.setFieldsValue(formData);
          setInitData(current);
          setLogNo(currentLogNo || "");
        }
      } catch (error) {
        message.error("获取数据失败");
      } finally {
        setConfirmLoading(false);
      }
    } else if (type === "add") {
      const defaultDate = selectedDate;
      await fetchLogNo(defaultDate);
      // setRecorderDutyTypeOptions(DUTY_TYPE_OPTIONS);
      setRecorderDutyTypeOptions([]);
      form.setFieldsValue({
        logDate: defaultDate,
        dutyTypes: [{ hasUnfinished: false, unfinishedDesc: prevUnfinishedDesc }],
      });
    }
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setConfirmLoading(true);

      const dutyTypes: any[] = values.dutyTypes || [];
      if (dutyTypes.length === 0) {
        message.error("至少新增一个值班类型");
        setConfirmLoading(false);
        return;
      }
      const typeValues = dutyTypes.map((item) => item.dutyType);
      const uniqueTypes = new Set(typeValues);
      if (uniqueTypes.size !== typeValues.length) {
        message.error("值班类型不能重复");
        setConfirmLoading(false);
        return;
      }

      const payload = {
        logDate: values.logDate.format("YYYY-MM-DD"),
        recorderId: values.recorderId,
        dutyTypes: dutyTypes.map((item) => ({
          dutyType: item.dutyType,
          overallStatus: item.overallStatus,
          overallDesc: item.overallDesc,
          hasUnfinished: item.hasUnfinished,
          unfinishedDesc: item.hasUnfinished ? item.unfinishedDesc : "",
        })),
      };

      if (modalType === "add") {
        await addDutyLog(payload);
      } else {
        await updateDutyLog(payload, initData?.id);
      }

      getCurrentSchedule();
      message.success(`${modalType === "add" ? "新增成功" : "编辑成功"}`);
      setModalVisible(false);
      form.resetFields();
      getData();
    } catch (error: any) {
      message.error(error?.message || "操作失败，请重试");
    } finally {
      setConfirmLoading(false);
    }
  };

  // 处理删除值班日志
  const handleDeleteSchedule = (id: number) => {
    Modal.confirm({
      title: "确认删除",
      content: "值班日志将清除，确认删除？",
      okText: "确认",
      cancelText: "取消",
      onOk: () => {
        deleteDutyLog(id).then(() => {
          message.success("删除成功");
          getCurrentSchedule();
          getData();
        });
      },
    });
  };

  // 处理批量删除确认
  const handleBatchDelete = async (timeRanges: TimeRange[]) => {
    try {
      const apiData = {
        time_ranges: timeRanges.map((range) => {
          return {
            start_time: range.start ? range.start.format("YYYY-MM-DD") : "",
            end_time: range.end ? range.end.format("YYYY-MM-DD") : "",
          };
        }),
      };
      await batchDeleteDutyLog(apiData);
      message.success(`成功删除 ${timeRanges.length} 个时间段的值班日志`);
      getData();
      getCurrentSchedule();
    } catch (error) {
      throw error;
    }
  };

  // 处理导出日志
  const handleExport = () => {
    Modal.confirm({
      title: "确认导出",
      content: "确认导出值班日志吗？",
      okText: "确认",
      cancelText: "取消",
      onOk: () => {
        setIsExporting(true);
        const url = `/api/takin/dutylog/export?month=${selectedMonth.format("YYYY-MM")}`;
        let params = {};
        let exportTitle = `${selectedMonth.format("YYYY-MM")}月值班日志`;

        exportTemplet(url, params)
          .then((res) => {
            const url = window.URL.createObjectURL(
              new Blob(
                [res],
                {
                  type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                }
              )
            );
            const link = document.createElement("a");
            link.href = url;
            const fileName = `${exportTitle}_导出_${moment().format("YYYYMMDD_HHmmss")}.xlsx`;
            link.setAttribute("download", fileName);
            document.body.appendChild(link);
            link.click();
          })
          .then(() => {
            setIsExporting(false);
          });
      },
      onCancel: () => {
        setIsExporting(false);
      },
    });
  };

  // 自定义日历单元格
  const dateCellRender: CalendarProps<Moment>["dateFullCellRender"] = (date) => {
    const isToday = moment().isSame(date, "day");
    const dayItem = calendarDays.find(
      (item) => item.date && moment.unix(item.date).isSame(date, "day")
    );
    const hasLog = !!dayItem?.hasLog;
    const displayUnfinished = !!dayItem?.displayUnfinished;
    const displayUnfinishedDesc = dayItem?.displayUnfinishedDesc || dayItem?.unfinishedDesc || "";

    const d = Lunar.fromDate(date.toDate());
    const lunarMonth = d.getMonthInChinese();
    const lunarDay = d.getDayInChinese();
    const lunar = lunarDay === "初一" ? `${lunarMonth}月${lunarDay}` : lunarDay;

    return (
      <div className="calendar-cell">
        <div className="top">
          <div
            className="date-number"
            style={
              isToday
                ? {
                  borderRadius: "50%",
                  backgroundColor: "#2888f7",
                  color: "#fff",
                }
                : {}
            }
          >
            {date.date()}
          </div>
          <div className="lunar-date">{lunar}</div>
        </div>
        <div className="bottom">
          <div className="bottom-record">
            {displayUnfinished && (
              <Tooltip title={
                <div className="displayUnfinished-tip">
                  <div className="displayUnfinished-header"> 未办结事项简述：</div>
                  <div className="displayUnfinished-desc">{displayUnfinishedDesc}</div>
                </div>
              } placement="top" color="#fff">
                <div className="unfinished-text">未办结</div>
              </Tooltip>
            )}
            {<div className="schedule-text">{hasLog && "已记录"}</div>}
          </div>
        </div>
      </div>
    );
  };

  // 渲染右侧值班日志详情
  const renderScheduleDetail = () => {
    const sortedLogs = [...currentLogs].sort((a, b) => (b.recordTime || 0) - (a.recordTime || 0));
    return (
      <div className="no-schedule">
        <div className="schedule-header">
          <div className="text">日志记录</div>
          {(profile.roles?.includes("Admin") ||
            permList.includes("/sxxc/duty_log/add")) && (
              <PlusSquareFilled
                onClick={() => showModal("add")}
                style={{ fontSize: 13, color: "#2888f7" }}
              />
            )}
        </div>
        <div className="dates">{selectedDate.format("YYYY-MM-DD")}</div>
        <div className="content">
          {!sortedLogs || sortedLogs.length === 0 ? (
            <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无记录日志" />
          ) : (
            <Timeline>
              {sortedLogs.map((x) => (
                <Timeline.Item key={x.id || x.logDate}>
                  <div className="logs-time">
                    {x.recordTime ? moment.unix(x.recordTime).format("HH:mm:ss") : ''}
                  </div>
                  <div className="user-logs">
                    <div className="heads">
                      <div className="names">
                        <label className="name">{x.recorderName || '无'}</label>记录日志
                      </div>
                      <div className="icons">
                        <>
                          {(profile.roles?.includes("Admin") ||
                            permList.includes("/sxxc/duty_log/edit")) && (
                              <EditOutlined
                                style={{ color: "#2888f7" }}
                                title="编辑"
                                onClick={() => showModal("edit", x.id)}
                              />
                            )}
                          {(profile.roles?.includes("Admin") ||
                            permList.includes("/sxxc/duty_log/del")) && (
                              <DeleteOutlined
                                style={{ color: "#f5222d" }}
                                title="删除"
                                onClick={() => handleDeleteSchedule(x.id)}
                              />
                            )}
                        </>
                      </div>
                    </div>
                    <div className="log-cons">
                      {(x.dutyTypes || []).map((dt, idx) => (
                        <div key={idx} className="duty-type-log">
                          <div className="duty-type-title">
                            <span className={`duty-type-tag type-${dt.dutyType}`}>
                              {getDutyTypeLabel(dt.dutyType)}
                            </span>
                          </div>
                          <div className="duty-type-desc">
                            <div>当班整体运行状态：{getOverallStatusLabel(dt.overallStatus)}</div>
                            <div>当班整体简述：{dt.overallDesc || '无'}</div>
                            {dt.hasUnfinished && (
                              // <div className="unfinished-desc">
                              //   未办结事项简述：{dt.unfinishedDesc || '无'}
                              // </div>
                               <div>
                                未办结事项简述：{dt.unfinishedDesc || '无'}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </Timeline.Item>
              ))}
            </Timeline>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="schedule-management-page">
      <Row gutter={16} className="content-container">
        <Col span={16}>
          <Card className="calendar-card">
            <Spin spinning={loading}>
              <Calendar
                onSelect={onDateSelect}
                dateFullCellRender={dateCellRender}
                className="custom-calendar"
                headerRender={({ value, onChange }) => {
                  return (
                    <div className="calendar-header">
                      <div className="calendar-header-left">
                        <LeftCircleFilled
                          onClick={() => {
                            const newMonth = value.clone().subtract(1, "month");
                            onChange(newMonth);
                            setSelectedMonth(newMonth);
                          }}
                        />
                        <span>{value.format("YYYY-MM")}</span>
                        <RightCircleFilled
                          onClick={() => {
                            const newMonth = value.clone().add(1, "month");
                            onChange(newMonth);
                            setSelectedMonth(newMonth);
                          }}
                        />
                        <Button
                          onClick={() => {
                            onChange(moment());
                            setSelectedMonth(moment());
                          }}
                          size="small"
                        >
                          今天
                        </Button>
                      </div>
                      <div>
                        <Space>
                          {(profile.roles?.includes("Admin") ||
                            permList.includes("/sxxc/duty_log/export")) && (
                              <Button
                                icon={<UploadOutlined />}
                                onClick={handleExport}
                                loading={isExporting}
                                size="small"
                              >
                                导出
                              </Button>
                            )}
                          {(profile.roles?.includes("Admin") ||
                            permList.includes("/sxxc/duty_log/batch_delete")) && (
                              <Button
                                icon={<DeleteOutlined />}
                                onClick={() => setBatchDeleteVisible(true)}
                                size="small"
                              >
                                批量删除
                              </Button>
                            )}
                        </Space>
                      </div>
                    </div>
                  );
                }}
              />
            </Spin>
          </Card>
        </Col>

        <Col span={8}>
          <Card className="schedule-detail-card">
            <Spin spinning={detailLoading}>{renderScheduleDetail()}</Spin>
          </Card>
        </Col>
      </Row>

      {/* 新增/编辑值班日志弹窗 */}
      <Modal
        title={modalType === "edit" ? "编辑记录" : "新增记录"}
        visible={modalVisible}
        onCancel={() => {
          setModalVisible(false);
          form.resetFields();
        }}
        confirmLoading={confirmLoading}
        width={700}
        footer={[
          <Button
            key="cancel"
            onClick={() => {
              setModalVisible(false);
              form.resetFields();
            }}
          >
            取消
          </Button>,
          <Button
            key="submit"
            type="primary"
            loading={confirmLoading}
            onClick={handleSubmit}
          >
            确定
          </Button>,
        ]}
      >
        <div className="schedule-modal-content">
          <div className="log-no-row">
            <span className="log-no-label">日志编号：</span>
            <span className="log-no-value">{logNo}</span>
          </div>
          <Form
            form={form}
            layout="horizontal"
            initialValues={{}}
            labelAlign="right"
            labelCol={{ span: 6 }}
            wrapperCol={{ span: 18 }}
          >
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  name="logDate"
                  label="记录日期"
                  labelCol={{ span: 8 }}
                  rules={[{ required: true, message: "请选择记录日期" }]}
                >
                  {/* @ts-ignore */}
                  <DatePicker
                    disabledDate={disableDate}
                    disabled={modalType === "edit"}
                    style={{ width: "100%" }}
                    onChange={(date: Moment) => {
                      if (modalType === "add" && date) {
                        fetchLogNo(date);
                      }
                    }}
                  />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="recorderId"
                  label="记录人"
                  labelCol={{ span: 6 }}
                  rules={[{ required: true, message: "请选择记录人" }]}
                >
                  <Select
                    placeholder="请选择记录人"
                    showSearch
                    optionFilterProp="label"
                    filterOption={(input: string, option: any) =>
                      (option?.label ?? "")
                        .toString()
                        .toLowerCase()
                        .includes(input.toLowerCase())
                    }
                    options={personnelOptions.map((p) => ({
                      label: p.name,
                      value: p.id,
                    }))}
                    onChange={(value: number) => {
                      fetchRecorderDutyTypes(value);
                      if (modalType === "add") {
                        form.setFieldsValue({
                          dutyTypes: [{ hasUnfinished: false, unfinishedDesc: prevUnfinishedDesc }],
                        });
                      }
                    }}
                  />
                </Form.Item>
              </Col>
            </Row>

            <Form.List name="dutyTypes">
              {(dutyFields, { add: addDutyType, remove: removeDutyType }) => (
                <>
                  {dutyFields.map(({ key, name, ...restField }) => (
                    <div key={key} className="duty-type-card">
                      <Row gutter={12} align="middle">
                        <Col span={20}>
                          <Form.Item
                            {...restField}
                            name={[name, "dutyType"]}
                            label="值班类型"
                            labelCol={{ span: 6 }}
                            rules={[{ required: true, message: "请选择值班类型" }]}
                          >
                            <Select placeholder="请选择值班类型">
                              {(() => {
                                const currentDutyTypes = form.getFieldValue("dutyTypes") || [];
                                const usedTypes = currentDutyTypes
                                  .map((item: any, idx: number) =>
                                    idx !== name ? item?.dutyType : undefined
                                  )
                                  .filter((v: any) => v !== undefined);
                                return recorderDutyTypeOptions.map((dt) => (
                                  <Select.Option
                                    key={dt.value}
                                    value={dt.value}
                                    disabled={usedTypes.includes(dt.value)}
                                  >
                                    {dt.label}
                                  </Select.Option>
                                ));
                              })()}
                            </Select>
                          </Form.Item>
                        </Col>
                        <Col
                          span={4}
                          style={{
                            marginBottom: '18px',
                            textAlign: 'right',
                          }}
                        >
                          {dutyFields.length > 1 && (
                            <Button
                              type="link"
                              danger
                              size="small"
                              icon={<MinusSquareOutlined />}
                              onClick={() => removeDutyType(name)}
                            />
                          )}
                        </Col>
                      </Row>

                      <Form.Item
                        {...restField}
                        name={[name, "overallStatus"]}
                        label="当班整体运行状态"
                        labelCol={{ span: 5 }}
                        wrapperCol={{ span: 20 }}
                        rules={[{ required: true, message: "请选择当班整体运行状态" }]}
                      >
                        <Select placeholder="请选择当班整体运行状态">
                          {OVERALL_STATUS_OPTIONS.map((opt) => (
                            <Select.Option key={opt.value} value={opt.value}>
                              {opt.label}
                            </Select.Option>
                          ))}
                        </Select>
                      </Form.Item>

                      <Form.Item
                        {...restField}
                        name={[name, "overallDesc"]}
                        label="当班整体简述"
                        labelCol={{ span: 5 }}
                        wrapperCol={{ span: 20 }}
                        rules={[{ required: true, message: "请填写当班整体简述" }]}
                      >
                        <Input.TextArea
                          allowClear
                          placeholder="简要描述服务器、网络、业务、安全等当班整体情况"
                          autoSize={{ minRows: 4, maxRows: 10 }}
                        />
                      </Form.Item>

                      <Form.Item
                        {...restField}
                        name={[name, "hasUnfinished"]}
                        label="是否有未办结事项"
                        labelCol={{ span: 5 }}
                        wrapperCol={{ span: 20 }}
                        rules={[{ required: true, message: "请选择是否有未办结事项" }]}
                      >
                        <Radio.Group
                          options={UNFINISHED_OPTIONS}
                          onChange={(e) => {
                            // if (!e.target.value) {
                            //   const dutyTypes = form.getFieldValue("dutyTypes") || [];
                            //   dutyTypes[name] = {
                            //     ...dutyTypes[name],
                            //     unfinishedDesc: "",
                            //   };
                            //   form.setFieldsValue({ dutyTypes });
                            // }
                          }}
                        />
                      </Form.Item>

                      <Form.Item
                        noStyle
                        shouldUpdate={(prev, cur) =>
                          prev.dutyTypes?.[name]?.hasUnfinished !==
                          cur.dutyTypes?.[name]?.hasUnfinished
                        }
                      >
                        {({ getFieldValue }) => {
                          return getFieldValue(["dutyTypes", name, "hasUnfinished"]) ? (
                            <Form.Item
                              {...restField}
                              name={[name, "unfinishedDesc"]}
                              label="未办结事项简述"
                              labelCol={{ span: 5 }}
                              wrapperCol={{ span: 20 }}
                              rules={[{ required: true, message: "请填写未办结事项简述" }]}
                            >
                              <Input.TextArea
                                allowClear
                                placeholder="未闭环故障、待处理工单、潜在隐患及其他需交接的事项等"
                                autoSize={{ minRows: 4, maxRows: 10 }}
                              />
                            </Form.Item>
                          ) : null;
                        }}
                      </Form.Item>
                    </div>
                  ))}
                  <Form.Item style={{ padding: '0 12px' }}>
                    <Button
                      type="dashed"
                      block
                      icon={<PlusSquareFilled />}
                      onClick={() => {
                        const currentDutyTypes = form.getFieldValue("dutyTypes") || [];
                        const usedTypes = currentDutyTypes
                          .map((item: any) => item?.dutyType)
                          .filter((v: any) => v !== undefined);
                        const availableTypes = recorderDutyTypeOptions.filter(
                          (dt) => !usedTypes.includes(dt.value)
                        );
                        if (availableTypes.length === 0) {
                          message.warning("所有值班类型已添加，无法新增");
                          return;
                        }
                        addDutyType({
                          hasUnfinished: false,
                          unfinishedDesc: prevUnfinishedDesc,
                        });
                      }}
                    >
                      新增值班类型
                    </Button>
                  </Form.Item>
                </>
              )}
            </Form.List>
          </Form>
        </div>
      </Modal>

      {/* 批量删除弹窗 */}
      <BatchDeleteModal
        visible={batchDeleteVisible}
        onCancel={() => setBatchDeleteVisible(false)}
        onConfirm={handleBatchDelete}
      />
    </div>
  );
};

export default DutyLogs;
