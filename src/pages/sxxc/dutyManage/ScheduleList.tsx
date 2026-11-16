import React, { useState, useEffect, useContext } from "react";
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
  Tooltip
} from "antd";
import {
  PlusSquareFilled,
  EditOutlined,
  DeleteOutlined,
  UploadOutlined,
  LeftCircleFilled,
  RightCircleFilled,
  ImportOutlined,
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
  batchDeleteSchedule,
  autoSchedule
} from "@/services/sxxc/dutyManage";
import { exportTemplet } from "@/services/assets/asset";
import "./ScheduleList.less";
import { CommonStateContext } from "@/App";
import { OperateType } from "./DutyList";
import { OperationModal } from "./OperationModal";
import _ from "lodash";
import BatchDeleteModal, { TimeRange } from './BatchDeleteModal';
import AutoScheduleModal from './AutoScheduleModal';

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

const ScheduleList: React.FC = () => {
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
  const [batchDeleteVisible, setBatchDeleteVisible] = useState(false); // 批量删除弹框
  const [autoScheduleVisible, setAutoScheduleVisible] = useState(false); // 自动排班弹框
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
  const getData = () => {
    // 当月排班数据
    const param = { month: selectedMonth.format("YYYY-MM") };
    setLoading(true);
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
      setScheduleData(processedData);
    });
  };

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

  // 处理新增/编辑排班
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

      if (modalType === "add") {
        await addSchedule(scheduleData);
        getCurrentSchedule();
        message.success("新增成功");
      } else if (modalType === "edit") {
        await updateSchedule(scheduleData);
        getCurrentSchedule();
        message.success("编辑成功");
      }
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
  // 导入排班
  const handleImport = () => {
    setOperateType(OperateType.Import);
  };

  // 处理导出排班
  const handleExport = () => {
    // 弹框
    Modal.confirm({
      title: "确认导出",
      content: "确认导出排班表吗？",
      okText: "确认",
      cancelText: "取消",
      onOk: () => {
        setIsExporting(true);
        let url =
          "/api/takin/xh/schedule/export-xls?month=" +
          selectedMonth.format("YYYY-MM");
        let params = {};
        let exportTitle = `${selectedMonth.format("YYYY-MM")}月排班表`;

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
            const fileName =
              exportTitle + "数据_" + moment().format("MMDDHHmmss") + ".xls"; //decodeURI(res.headers['filename']);
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
            {hasSch && <div className="schedule-text">已排班</div>}
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
    const isFuture =
      selectedDate.isAfter(moment(), "day") ||
      selectedDate.isSame(moment(), "day");
    // console.log("currentSchedule", currentSchedule);
    if (!currentSchedule || JSON.stringify(currentSchedule) === "{}") {
      return (
        <div className="no-schedule">
          <div className="schedule-header">
            <div className="text">排班表</div>
            {(profile.roles?.includes("Admin") ||
              permList.includes("/sxxc/schedule_list/add")) && (
                <PlusSquareFilled
                  onClick={() => showModal("add")}
                  style={{ fontSize: 13, color: "#2888f7" }}
                />
              )}
          </div>
          <div>{selectedDate.format("YYYY-MM-DD")}</div>

          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无排班" />
        </div>
      );
    }

    return (
      <div className="has-schedule-detail">
        <div className="schedule-header">
          <div className="text">排班表</div>
          <div className="schedule-actions">
            {isFuture && (
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
            )}
          </div>
        </div>
        <div>{selectedDate.format("YYYY-MM-DD")}</div>
        <div className="content">
          <Timeline>
            <Timeline.Item dot={<IconFont type="icon-zhibanrenyuan" />}>
              值班主任
              <div className="personnel-list">
                <Tag color="#5eaaf2">
                  {
                    directorPersonnelList.find(
                      (p) => p.id === currentSchedule.director_id
                    )?.name
                  }
                </Tag>
              </div>
            </Timeline.Item>
            <Timeline.Item
              dot={<IconFont type="icon-zhibanrenyuan" />}
              color="#007afd"
            >
              一线值班人员
              <div className="personnel-list">
                {(currentSchedule.first_line_ids || []).map((id) => {
                  const person = firstLinePersonnelList.find(
                    (p) => p.id === id
                  );
                  return person ? (
                    <Tag key={id} color="#5eaaf2">
                      {person.name}
                    </Tag>
                  ) : null;
                })}
              </div>
            </Timeline.Item>
            <Timeline.Item
              dot={<IconFont type="icon-zhibanrenyuan" />}
              color="#007afd"
            >
              二线值班人员
              <div className="personnel-list">
                {(currentSchedule.second_line_ids || []).map((id) => {
                  const person = secondLinePersonnelList.find(
                    (p) => p.id === id
                  );
                  return person ? (
                    <Tag key={id} color="#5eaaf2">
                      {person.name}
                    </Tag>
                  ) : null;
                })}
              </div>
            </Timeline.Item>

            <Timeline.Item
              dot={<IconFont type="icon-zhibanrenyuan" />}
              color="#007afd"
            >
              三线值班人员
              <div className="personnel-list">
                {(currentSchedule.third_line_ids || []).map((id) => {
                  const person = thirdLinePersonnelList.find(
                    (p) => p.id === id
                  );
                  return person ? (
                    <Tag key={id} color="#5eaaf2">
                      {person.name}
                    </Tag>
                  ) : null;
                })}
              </div>
            </Timeline.Item>
          </Timeline>
        </div>
      </div>
    );
  };


  // 确认批量删除
  const handleBatchDelete = async (timeRanges: TimeRange[]) => {
    try {
      // 转换为字符串格式发送给后端
      const apiData = {
        time_ranges: timeRanges.map((range) => {
          return {
            start_time: range.start ? range.start.format("YYYY-MM-DD") : "",
            end_time: range.end ? range.end.format("YYYY-MM-DD") : "",
          };
        }),
      };
      await batchDeleteSchedule(apiData);
      message.success(`成功删除 ${timeRanges.length} 个时间段的排班`);
      getData();
      getCurrentSchedule();
    } catch (error: any) {
      throw error;
    }
  };

  // 处理自动排班
  const handleAutoSchedule = async (values: any) => {
    try {
      // 转换为字符串格式发送给后端
      const apiData = {
        mode: values.mode,
        start_date: values.dateRange ? values.dateRange[0].format("YYYY-MM-DD") : null,
        end_date: values.dateRange ? values.dateRange[1].format("YYYY-MM-DD") : null,
      };
      await autoSchedule(apiData);
      message.success(`排班成功`);
      getData();
      getCurrentSchedule();
    } catch (error: any) {
      throw error;
    }
  };

  const setSchedule = () => {
    Modal.confirm({
      title: "确认自动排班吗？",
      content: "系统将从首个未排班的工作日起，生成未来30天的排班。",
      okText: "确认",
      okType: "primary",
      onOk: () => {
       autoSchedule({}).then(()=>{
        message.success(`排班成功`);
        getData();
        getCurrentSchedule();
       })
      },
    });
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
                        {/* <LeftCircleFilled  /> */}
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
                            permList.includes("/sxxc/schedule_list/import")) && (
                              <Button
                                icon={<ImportOutlined />}
                                onClick={handleImport}
                                size="small"
                              >
                                导入
                              </Button>
                            )}
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
                            permList.includes("/sxxc/schedule_list/batch_delete")) && (
                              <Button
                                icon={<DeleteOutlined />}
                                onClick={() => setBatchDeleteVisible(true)}
                                size="small"
                              >
                                批量删除
                              </Button>
                            )}
                          {/* {(profile.roles?.includes("Admin") ||
                            permList.includes("/sxxc/schedule_list/auto_schedule")) && (
                              <Button
                                icon={<EditOutlined />}
                                onClick={() => setAutoScheduleVisible(true)}
                                size="small"
                              >
                                自动排班
                              </Button>
                            )} */}
                            {(profile.roles?.includes("Admin") ||
                            permList.includes("/sxxc/schedule_list/auto_schedule")) && (
                              <Button
                                icon={<EditOutlined />}
                                onClick={setSchedule}
                                size="small"
                              >
                                自动排班
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
        title={modalType === "edit" ? "编辑排班" : "新增排班"}
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
                label="值班日期"
                labelCol={{ span: 12 }}
                rules={[{ required: true, message: "请选择值班日期" }]}
              >
                {/* @ts-ignore */}
                <DatePicker
                  disabledDate={disableDate}
                  disabled={modalType === "edit"}
                  style={{ width: "100%" }}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="director_id"
                label="值班主任"
                labelCol={{ span: 10 }}
                rules={[{ required: true, message: "请选择" }]}
              >
                <Select
                  showSearch
                  placeholder="请选择值班主任"
                  filterOption={(input, option) =>
                    (option?.label ?? "").includes(input)
                  }
                  options={directorPersonnelList.map((person) => ({
                    label: person.name,
                    value: person.id,
                  }))}
                />
              </Form.Item>
            </Col>
            <Col span={24}>
              <Form.Item
                name="first_line_ids"
                label="一线值班人员"
                rules={[{ required: true, message: "请选择" }]}
              >
                <Select
                  placeholder="请选择一线值班人员"
                  mode="multiple"
                  showSearch
                  filterOption={(input, option) =>
                    (option?.label ?? "").includes(input)
                  }
                  options={firstLinePersonnelList.map((person) => ({
                    label: person.name,
                    value: person.id,
                  }))}
                />
              </Form.Item>
            </Col>
            <Col span={24}>
              <Form.Item
                name="second_line_ids"
                label="二线值班人员"
                rules={[{ required: true, message: "请选择" }]}
              >
                <Select
                  placeholder="请选择二线值班人员"
                  mode="multiple"
                  showSearch
                  filterOption={(input, option) =>
                    (option?.label ?? "").includes(input)
                  }
                  options={secondLinePersonnelList.map((person) => ({
                    label: person.name,
                    value: person.id,
                  }))}
                />
              </Form.Item>
            </Col>
            <Col span={24}>
              <Form.Item name="third_line_ids" label="三线值班人员">
                <Select
                  placeholder="请选择三线值班人员"
                  mode="multiple"
                  showSearch
                  filterOption={(input, option) =>
                    (option?.label ?? "").includes(input)
                  }
                  options={thirdLinePersonnelList.map((person) => ({
                    label: person.name,
                    value: person.id,
                  }))}
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
          templateUrl: "/api/takin/busi-group/schedule/template",
          importUrl: "/api/takin/xh/schedule/import-xls",
          templateTitle: "排班数据",
        }}
      />

      {/* 批量删除弹窗 */}
      <BatchDeleteModal
        visible={batchDeleteVisible}
        onCancel={() => setBatchDeleteVisible(false)}
        onConfirm={handleBatchDelete}
      />

      {/* 自动排班弹窗 */}
      <AutoScheduleModal
        visible={autoScheduleVisible}
        onCancel={() => setAutoScheduleVisible(false)}
        onConfirm={handleAutoSchedule}
      />

    </div>
  );
};

export default ScheduleList;
