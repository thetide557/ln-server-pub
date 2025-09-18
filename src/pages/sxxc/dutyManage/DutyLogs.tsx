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
  getScheduleList,
  getDutyPersonnelOptions,
  addSchedule,
  updateSchedule,
  getScheduleDetail,
  deleteSchedule,
} from "@/services/sxxc/dutyManage";
import { exportTemplet } from "@/services/assets/asset";
import "./DutyLogs.less";
import { CommonStateContext } from "@/App";
import { OperateType } from "./DutyList";
import { OperationModal } from "./OperationModal";
import _ from "lodash";
import TextArea from "antd/lib/input/TextArea";

// 定义排班数据接口
interface ScheduleItem {
  id?: string;
  duty_date?: number;
  director_id?: string;
  first_line_ids?: string[];
  second_line_ids?: string[];
  third_line_ids?: string[];
  createTime?: number;
  director?: object;
  first_lines?: Array<{ Name: string, id: string }>;
  second_lines?: Array<{ Name: string, id: string }>;
  third_lines?: Array<{ Name: string, id: string }>;
}

// 定义人员选项接口
interface PersonnelOption {
  id: string;
  name: string;
  role: string;
}

const DutyLogs: React.FC = () => {
  // 状态管理
  const [selectedDate, setSelectedDate] = useState<Moment>(moment());
  const [selectedMonth, setSelectedMonth] = useState<Moment>(moment());
  const [showScheduleDetail, setShowScheduleDetail] = useState(false);  //控制是否显示排班详情

  const [scheduleData, setScheduleData] = useState<ScheduleItem[]>([]);
  const [currentSchedule, setCurrentSchedule] = useState<ScheduleItem>({});

  const [detailLoading, setDetailLoading] = useState(false);
  const [directorPersonnelList, setDirectorPersonnelList] = useState<
    PersonnelOption[]
  >([]);
  const [firstLinePersonnelList, setFirstLinePersonnelList] = useState<
    PersonnelOption[]
  >([]);
  const [secondLinePersonnelList, setSecondLinePersonnelList] = useState<
    PersonnelOption[]
  >([]);
  const [thirdLinePersonnelList, setThirdLinePersonnelList] = useState<
    PersonnelOption[]
  >([]);
  const [isExporting, setIsExporting] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalType, setModalType] = useState<"add" | "edit">("add");
  const [initData, setInitData] = useState({});
  const { profile, permList } = useContext(CommonStateContext);
  const [operateType, setOperateType] = useState<OperateType>(OperateType.None);
  const [refreshKey, setRefreshKey] = useState(_.uniqueId("refreshKey_"));
  // 只可选登录当天及以后日期
  const disableDate = (current: Moment) => {
    const today = moment().startOf("day");
    // 只有当current存在且小于今天时才禁用（允许选择今天）
    return current && current < today;
  };

  useEffect(() => {
    getDutyPersonnelList();
    // getData();
  }, []);
  useEffect(() => {
    getCurrentSchedule();
  }, [selectedDate]);
  useEffect(() => {
    getData();
  }, [selectedMonth, refreshKey]);

  // 获取排班列表数据
  const getData = useCallback(async () => {
    try {
      const param = { month: selectedMonth.format("YYYY-MM") };
      setLoading(true);
      const { dat } = await getScheduleList(param);
      const processedData = dat.map(item => ({
        ...item,
        first_lines: item.first_lines ?? [],
        second_lines: item.second_lines ?? [],
        third_lines: item.third_lines ?? []
      }));
      setScheduleData(processedData);
    } catch (error) {
      message.error("获取排班数据失败");
      setScheduleData([]); 
    } finally {
      // 重置加载状态
      setLoading(false);
    }
  }, [selectedMonth]);

  // 获取值班人员列表（用于排班选择）
  const getDutyPersonnelList = () => {
    getDutyPersonnelOptions({ role: "值班主任" }).then(({ dat }) => {
      setDirectorPersonnelList(dat.options);
    });
    getDutyPersonnelOptions({ role: "一线运维" }).then(({ dat }) => {
      setFirstLinePersonnelList(dat.options);
    });
    getDutyPersonnelOptions({ role: "二线运维" }).then(({ dat }) => {
      setSecondLinePersonnelList(dat.options);
    });
    getDutyPersonnelOptions({ role: "三线运维" }).then(({ dat }) => {
      setThirdLinePersonnelList(dat.options);
    });
  };

  // 处理日期选择
  const onDateSelect = (date: Moment) => {
    setSelectedDate(date);
    // console.log("选中日期", date.format("YYYY-MM-DD"));
    // 检查月份是否发生变化，如果是则更新selectedMonth
    if (!selectedMonth.isSame(date, 'month')) {
      setSelectedMonth(date);
    }
  };

  // 获取当日排班数据
  const getCurrentSchedule = () => {
    // setLoading(true);
    setDetailLoading(true);
    getScheduleDetail({
      date: selectedDate.format("YYYY-MM-DD"),
    }).then(({ dat }) => {
      // setLoading(false);
      setDetailLoading(false);
      if (dat && typeof dat === "object" && Object.keys(dat).length > 0) {
        const processedData = {
          ...dat,
          first_line_ids: dat.first_line_ids
            ? JSON.parse(dat.first_line_ids)
            : [],
          second_line_ids: dat.second_line_ids
            ? JSON.parse(dat.second_line_ids)
            : [],
          third_line_ids:
            dat.third_line_ids && dat.third_line_ids !== "null"
              ? JSON.parse(dat.third_line_ids)
              : [],
        };
        setCurrentSchedule(processedData);
      } else {
        // 如果dat是空对象或无效，则设置为空对象
        setCurrentSchedule({});
      }
    });
  };

  // 处理新增/编辑日志
  const showModal = (type: "add" | "edit", id?: string) => {
    setModalType(type);
    setModalVisible(true);
    form.resetFields();
    getDutyPersonnelList();
    if (type === "edit") {
      try {
        setConfirmLoading(true);
        if (currentSchedule) {
          const {
            director_id,
            first_line_ids,
            second_line_ids,
            third_line_ids,
            duty_date,
          } = currentSchedule;
          const formData = {
            director_id,
            first_line_ids,
            second_line_ids,
            third_line_ids,
            duty_date: duty_date ? moment.unix(duty_date) : moment(),
          };
          form.setFieldsValue(formData);
          setInitData(currentSchedule);
        }
      } catch (error) {
        message.error("获取数据失败");
      } finally {
        setConfirmLoading(false);
      }
    } else if (type === "add") {
      // 新增模式下，设置值班日期默认值为左边日历选择的日期
      form.setFieldsValue({
        duty_date: selectedDate,
      });
    }
  };
  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setConfirmLoading(true);
      // 提交数据
      const scheduleData = {
        duty_date: values.duty_date.format("YYYY-MM-DD"),
        director_id: values.director_id,
        first_line_ids: values.first_line_ids,
        second_line_ids: values.second_line_ids,
        third_line_ids: values.third_line_ids,
        ...(modalType === "edit" && { id: (initData as any)?.id }),
      };

      let apiurl = modalType === "add" ? addSchedule : updateSchedule;
      await apiurl(scheduleData)
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

  // 处理删除排班
  const handleDeleteSchedule = (id) => {
    Modal.confirm({
      title: "确认删除",
      content: "排班表将清除，确认删除吗？",
      okText: "确认",
      cancelText: "取消",
      onOk: () => {
        deleteSchedule(id).then(() => {
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
        const url = `/api/n9e/xh/schedule/export-xls?month=${selectedMonth.format("YYYY-MM")}`;
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
    // const hasSch =
    //   scheduleData &&
    //   scheduleData.some((item) => item.duty_date && moment.unix(item.duty_date).isSame(date, "day"));
    const scheduleItem = scheduleData && scheduleData.find(
      item => item.duty_date && moment.unix(item.duty_date).isSame(date, "day")
    );
    const hasSch = !!scheduleItem;
    // console.log("是否有排班", date.format("YYYY-MM-DD"),hasSch);
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
      // 详情模式：显示一线和二线运维人员
      // 获取一线运维人员列表
      const firstLinePersonnel = scheduleItem?.first_lines || [];
      // 获取二线运维人员列表
      const secondLinePersonnel = scheduleItem?.second_lines || [];
      const firstLineNames = firstLinePersonnel.map(p => p.Name || '');
      const secondLineNames = secondLinePersonnel.map(p => p.Name || '');
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
            {hasSch && <div className="schedule-detail-info">
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

  // 渲染排班详情
  const renderScheduleDetail = () => {
    return (
      <div className="no-schedule">
        <div className="schedule-header">
          <div className="text">记录日志</div>
          {(profile.roles?.includes("Admin") ||
            permList.includes("/sxxc/schedule_list/add")) && (
              <PlusSquareFilled
                onClick={() => showModal("add")}
                style={{ fontSize: 13, color: "#2888f7" }}
              />
            )}
        </div>

        {
          !currentSchedule || JSON.stringify(currentSchedule) === "{}" ? <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无记录日志" /> :
            <div className="content">
              <div className="dates">{selectedDate.format("YYYY-MM-DD")}</div>
              <Timeline>
                {
                  scheduleData.map((x) => (
                    <Timeline.Item key={x.id || x.duty_date}>
                      <span>
                        {x.duty_date ? moment.unix(x.duty_date).format("YYYY-MM-DD") : ''}
                      </span>
                      <div className="user-logs">
                        <div className="heads">
                          <div className="names">
                            <label className="name">王大锤</label>记录日志
                          </div>
                          <div className="icons">
                            <>
                              {(profile.roles?.includes("Admin") ||
                                permList.includes("/sxxc/schedule_list/edit")) && (
                                  <EditOutlined
                                    style={{ color: "#2888f7" }}
                                    title="编辑"
                                    onClick={() => {
                                      showModal("edit", currentSchedule.id);
                                    }}
                                  />
                                )}
                              {(profile.roles?.includes("Admin") ||
                                permList.includes("/sxxc/schedule_list/del")) && (
                                  <DeleteOutlined
                                    style={{ color: "#f5222d" }}
                                    title="删除"
                                    onClick={() => handleDeleteSchedule(currentSchedule.id)}
                                  />
                                )}
                            </>
                          </div>
                        </div>
                        <div className="log-cons">
                          的深V的深V的是但是不v但是不都舍不得谁所代表的是 的深V的深V的是但是不v但是不都舍不得谁所代表的是 的深V的深V的是但是不v但是不都舍不得谁所代表的是 的深V的深V的是但是不v但是不都舍不得谁所代表的是 的深V的深V的是但是不v但是不都舍不得谁所代表的是
                        </div>
                      </div>
                    </Timeline.Item>
                  ))
                }
              </Timeline>
            </div>
        }
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

      {/* 新增/编辑排班弹窗 */}
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
                name="duty_date"
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
                name="director_id"
                label="记录人"
                labelCol={{ span: 10 }}
                rules={[{ required: true }]}
              >
                <Input placeholder="请输入记录人" />
              </Form.Item>
            </Col>
            <Col span={24}>
              <Form.Item name="third_line_ids" label="详情描述" rules={[{ required: true }]}>
                <Input.TextArea
                  allowClear
                  placeholder="请输入问题及处理过程等"
                />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>

      {/* 导入排班弹窗 */}
      <OperationModal
        operateType={operateType}
        setOperateType={setOperateType}
        reloadList={() => {
          setRefreshKey(_.uniqueId("refreshKey_"));
        }}
        importConfig={{
          templateUrl: "/api/n9e/busi-group/schedule/template",
          importUrl: "/api/n9e/xh/schedule/import-xls",
          templateTitle: "排班数据",
        }}
      />
    </div>
  );
};

export default DutyLogs;
