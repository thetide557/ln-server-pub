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
  Tag,
  Modal,
  Timeline,
  Form,
  Select,
  DatePicker,
  Space,
  Tooltip,
  Input
} from "antd";
import {
  PlusSquareFilled,
  EditOutlined,
  DeleteOutlined,
  UploadOutlined,
  LeftCircleFilled,
  RightCircleFilled,
} from "@ant-design/icons";
import IconFont from "@/components/IconFont";
import moment, { Moment } from "moment";
import type { CalendarProps } from "antd";
import { Lunar } from "lunar-typescript";
import {
  getDutyLogList,
  getDutyLogDetail,
  addDutyLog,
  updateDutyLog,
  deleteDutyLog,
  getScheduleList,
  batchDeleteDutyLog
} from "@/services/sxxc/dutyManage";
import { exportTemplet } from "@/services/assets/asset";
import "./DutyLogs.less";
import { CommonStateContext } from "@/App";
import { OperateType } from "./DutyList";
import { OperationModal } from "./OperationModal";
import _ from "lodash";
import TextArea from "antd/lib/input/TextArea";
import BatchDeleteModal, { TimeRange } from './BatchDeleteModal';

// 定义值班日志接口
interface ScheduleItem {
  id: number;
  logDate: number;
  recorderName: string;
  recordTime: number;
  description: string;
}
interface ScheduleListItem {
  id?: string;
  duty_date?: number;
  director_id?: string;
  first_line_ids?: string[];
  second_line_ids?: string[];
  third_line_ids?: string[];
  createTime?: number;
  director?: object;
  first_lines?: Array<{Name: string, id: string}>;
  second_lines?: Array<{Name: string, id: string}>;
  third_lines?: Array<{Name: string, id: string}>;
}


const DutyLogs: React.FC = () => {
  // 状态管理
  const [selectedDate, setSelectedDate] = useState<Moment>(moment());
  const [selectedMonth, setSelectedMonth] = useState<Moment>(moment());
  const [scheduleData, setScheduleData] = useState<ScheduleItem[]>([]);
  const [currentSchedule, setCurrentSchedule] = useState<ScheduleItem[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalType, setModalType] = useState<"add" | "edit">("add");
  const [initData, setInitData] = useState({});
  const { profile, permList } = useContext(CommonStateContext);
  const [refreshKey, setRefreshKey] = useState(_.uniqueId("refreshKey_"));
  const [showScheduleDetail, setShowScheduleDetail] = useState(false);  //控制是否显示排班详情
  const [scheduleList, setScheduleList] = useState<ScheduleListItem[]>([]); //排班数据
  const [batchDeleteVisible, setBatchDeleteVisible] = useState(false);  //批量删除弹窗是否显示

  // 处理批量删除确认
  const handleBatchDelete = async (timeRanges: TimeRange[]) => {
    try {
      // console.log('要删除的时间范围:', timeRanges);
      // 转换为字符串格式发送给后端
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
      // 刷新值班日志数据
      getData();
      getCurrentSchedule();
    } catch (error) {
      throw error
    }
  };
  // 只可选登录当天及以后日期
  const disableDate = (current: Moment) => {
    const today = moment().startOf("day");
    // 只有当current存在且小于今天时才禁用（允许选择今天）
    return current && current < today;
  };


  useEffect(() => {
    getCurrentSchedule();
  }, [selectedDate]);
  useEffect(() => {
    getData();
  }, [selectedMonth, refreshKey]);

  // 获取值班日志数据
  const getData = useCallback(async () => {
    try {
      const param = { month: selectedMonth.format("YYYY-MM") };
      setLoading(true);
      const { dat } = await getDutyLogList(param);
      setScheduleData(dat);
      // 排班数据
      getScheduleList(param).then(({ dat }) => {
      setLoading(false);
      // setScheduleData(dat);
      // 处理数据格式，确保first_lines和second_lines数组正确解析
      const processedData = dat.map(item => ({
        ...item,
        first_lines: item.first_lines || [],
        second_lines: item.second_lines || [],
        third_lines: item.third_lines || []
      }));
      setScheduleList(processedData);
    });
    } catch (error) {
      message.error("获取值班日志失败");
      setScheduleData([]); 
    } finally {
      // 重置加载状态
      setLoading(false);
    }
  }, [selectedMonth]);


  // 处理日期选择
  const onDateSelect = (date: Moment) => {
    setSelectedDate(date);
    // console.log("选中日期", date.format("YYYY-MM-DD"));
    // 检查月份是否发生变化，如果是则更新selectedMonth
    if (!selectedMonth.isSame(date, 'month')) {
      setSelectedMonth(date);
    }
  };

  // 获取当日值班日志
  const getCurrentSchedule = () => {
    // setLoading(true);
    setDetailLoading(true);
    getDutyLogDetail({
      date: selectedDate.format("YYYY-MM-DD"),
    }).then(({ dat: { logs } }) => {
      // setLoading(false);
      setDetailLoading(false);
      setCurrentSchedule(logs);
    }).catch(() => {
      setDetailLoading(false);
    });
  };

  // 处理新增/编辑日志
  const showModal = (type: "add" | "edit", id?: number) => {
    setModalType(type);
    setModalVisible(true);
    form.resetFields();
    if (type === "edit") {
      try {
        setConfirmLoading(true);
        // 编辑时，根据id从currentSchedule中找到对应数据
        const current = currentSchedule.find((item) => item.id === id);
        if (current) {
          const {
            logDate,      
            recorderName,
            description
          } = current;
          const formData = {
            recorderName,
            description,
            logDate: logDate ? moment.unix(logDate) : moment(),
          };
          form.setFieldsValue(formData);
          setInitData(current);
        }
      } catch (error) {
        message.error("获取数据失败");
      } finally {
        setConfirmLoading(false);
      }
    } else if (type === "add") {
      // 新增模式下，设置值班日期默认值为左边日历选择的日期
      form.setFieldsValue({
        logDate: selectedDate,
      });
    }
  };
  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setConfirmLoading(true);
      // 提交数据
      const dutyLogData = {
        logDate: values.logDate.format("YYYY-MM-DD"),
        recorderName: values.recorderName,
        description: values.description,
      };

      let apiurl = modalType === "add" ? addDutyLog : updateDutyLog;
      await apiurl(modalType === "add" ? [dutyLogData] : { ...dutyLogData, id: (initData as any)?.id });
      getCurrentSchedule();
      message.success(`${modalType === "add" ? "新增成功" : "编辑成功"}`);
      setModalVisible(false);
      getData();
    } catch (error: any) {
      message.error(error?.message || "操作失败，请重试");
    } finally {
      setConfirmLoading(false);
    }
  };

  // 处理删除值班日志
  const handleDeleteSchedule = (id) => {
    Modal.confirm({
      title: "确认删除",
      content: "值班日志将清除，确认删除吗？",
      okText: "确认",
      cancelText: "取消",
      onOk: () => {
        deleteDutyLog([id]).then(() => {
          message.success("删除成功");
          getCurrentSchedule();
          getData();
        });
      },
    });
  };


  // 处理导出日志
  const handleExport = () => {
    // 弹框
    Modal.confirm({
      title: "确认导出",
      content: "确认导出值班日志吗？",
      okText: "确认",
      cancelText: "取消",
      onOk: () => {
        setIsExporting(true);
        const url = `/api/takin/xh/dutylog/export-xls?month=${selectedMonth.format("YYYY-MM")}`;
        let params = {};
        let exportTitle = `${selectedMonth.format("YYYY-MM")}月值班日志`;

        exportTemplet(url, params)
          .then((res) => {
            const url = window.URL.createObjectURL(
              new Blob(
                [res],
                // 设置该文件的mime类型，这里对应的mime类型对应为.xlsx格式
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
  const dateCellRender: CalendarProps<Moment>["dateFullCellRender"] = (
    date
  ) => {
    const isToday = moment().isSame(date, "day");
    // 值班日志
    const scheduleItem = scheduleData && scheduleData.find(
      item => item.logDate && moment.unix(item.logDate).isSame(date, "day")
    );
    const hasSch = !!scheduleItem;
    // 排班详情
    const scheduleDetailItem = scheduleList && scheduleList.find(
      item => item.duty_date && moment.unix(item.duty_date).isSame(date, "day")
    );
    const hasScheduleDetail = !!scheduleDetailItem;

    // 获取农历日期
    const d = Lunar.fromDate(date.toDate());
    const lunarMonth = d.getMonthInChinese();
    const lunarDay = d.getDayInChinese();
    // 初一显示完整农历月份和日期，其他日期只显示日期
    const lunar = lunarDay === "初一" ? `${lunarMonth}月${lunarDay}` : lunarDay;
    // 如果不是详情模式，显示简单的"已排班"标记
    if (!showScheduleDetail) {
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
            {hasSch && <div className="schedule-text">已记录</div>}
          </div>
        </div>
      );
    } else {
      // 排班详情模式：显示一线和二线运维人员
      // 获取一线运维人员列表
      const firstLinePersonnel = scheduleDetailItem?.first_lines || [];
      // 获取二线运维人员列表
      const secondLinePersonnel = scheduleDetailItem?.second_lines || [];
      const firstLineNames = firstLinePersonnel.map(p =>p.Name || '');
      const secondLineNames = secondLinePersonnel.map(p =>p.Name || '');
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
            {hasScheduleDetail && <div className="schedule-detail-info">
              {/* 一线运维 */}
              {firstLineNames.length > 0 && (
                <div className="personnel-line">
                  <Tooltip title={firstLineNames.join(', ')}>
                    一线运维：{firstLineNames.join('、')}
                  </Tooltip>
                  
                </div>
              )}
              {/* 二线运维 */}
              {secondLineNames.length > 0 && (
                <div className="personnel-line">
                  <Tooltip title={secondLineNames.join(', ')}>
                    二线运维：{secondLineNames.join('、')}
                  </Tooltip>
                </div>
              )}
            </div>}
          </div>
        </div>
      );

    }

  };

  // 渲染右侧值班日志详情
  const renderScheduleDetail = () => {
    return (
      <div className="no-schedule">
        <div className="schedule-header">
          <div className="text">日志记录</div>
          { (profile.roles?.includes("Admin") ||
            permList.includes("/sxxc/schedule_list/add")) && (
              <PlusSquareFilled
                onClick={() => showModal("add")}
                style={{ fontSize: 13, color: "#2888f7" }}
              />
            )}
        </div>
        <div className="dates">{selectedDate.format("YYYY-MM-DD")}</div>
        <div className="content">
        {
          !currentSchedule || currentSchedule.length === 0 ? <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无记录日志" /> :
              <Timeline>
                {
                  currentSchedule.map((x) => (
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
                                permList.includes("/sxxc/schedule_list/edit")) && (
                                  <EditOutlined
                                    style={{ color: "#2888f7" }}
                                    title="编辑"
                                    onClick={() => {
                                      showModal("edit", x.id);
                                    }}
                                  />
                                )}
                              {(profile.roles?.includes("Admin") ||
                                permList.includes("/sxxc/schedule_list/del")) && (
                                  <DeleteOutlined
                                    style={{ color: "#f5222d" }}
                                    title="删除"
                                    onClick={() => handleDeleteSchedule(x.id)}
                                  />
                                )}
                            </>
                          </div>
                        </div>
                        <div className="log-cons" style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                          {x.description || '无'}
                        </div>
                      </div>
                    </Timeline.Item>
                  ))
                }
              </Timeline>
          
        }
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
                        <Button
                          onClick={() => {
                            setShowScheduleDetail(!showScheduleDetail);
                          }}
                          size="small"
                          style={{
                            backgroundColor: '#5eaaf2',
                            color: 'white',
                            borderColor: '#5eaaf2'
                          }}
                        >
                          {showScheduleDetail ? "返回" : "排班详情"}
                        </Button>
                      </div>
                      <div>
                        <Space>
                          {(profile.roles?.includes("Admin") ||
                            permList.includes("/sxxc/schedule_list/export")) && (
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
                labelCol={{ span: 12 }}
                rules={[{ required: true }]}
              >
                {/* @ts-ignore */}
                <DatePicker
                  // disabledDate={disableDate}
                  // disabled={modalType === "edit"}
                  style={{ width: "100%" }}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="recorderName"
                label="记录人"
                labelCol={{ span: 10 }}
                rules={[{ required: true }]}
              >
                <Input placeholder="请输入记录人" />
              </Form.Item>
            </Col>
            <Col span={24}>
              <Form.Item name="description" label="详情描述" rules={[{ required: true }]}>
                <Input.TextArea
                  allowClear
                  placeholder="请输入问题及处理过程等"
                  autoSize={{ minRows: 4, maxRows: 10 }}
                />
              </Form.Item>
            </Col>
          </Row>
        </Form>
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
