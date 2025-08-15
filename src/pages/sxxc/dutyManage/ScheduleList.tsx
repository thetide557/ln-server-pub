import React, { useState, useEffect } from "react";
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
import "./ScheduleList.less";

// 定义排班数据接口
interface ScheduleItem {
  id?: string;
  duty_date?: string;
  director_id?: string;
  first_line_ids?: string[];
  second_line_ids?: string[];
  third_line_ids?: string[];
  createTime?: string;
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
  // 只可选登录当天及以后日期
  const disableDate = (current: Moment) => {
    const today = moment().startOf("day");
    // 只有当current存在且小于今天时才禁用（允许选择今天）
    return current && current < today;
  };

  useEffect(() => {
    getDutyPersonnelList();
    getData();
  }, []);
  useEffect(() => {
    getCurrentSchedule();
  }, [selectedDate]);
  useEffect(() => {
    getData();
  }, [selectedMonth]);
  // 获取排班列表数据
  const getData = () => {
    // 当月排班数据
    const param = { month: selectedMonth.format("YYYY-MM") };
    setLoading(true);
    getScheduleList(param).then(({ dat }) => {
      setLoading(false);
      setScheduleData(dat);
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
    console.log("选中日期", date.format("YYYY-MM-DD"));
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
            duty_date: moment(duty_date),
          };
          form.setFieldsValue(formData);
          setInitData(currentSchedule);
        }
      } catch (error) {
        message.error("获取数据失败");
      } finally {
        setConfirmLoading(false);
      }
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
    } catch (error) {
      message.error("操作失败，请重试");
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
          "/api/n9e/xh/schedule/export-xls?month=" +
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
    const hasSch =
      scheduleData &&
      scheduleData.some((item) => moment(item.duty_date).isSame(date, "day"));
    // console.log("是否有排班", date.format("YYYY-MM-DD"),hasSch);
    // 获取农历日期
    const d = Lunar.fromDate(date.toDate());
    const lunarMonth = d.getMonthInChinese();
    const lunarDay = d.getDayInChinese();
    // 初一显示完整农历月份和日期，其他日期只显示日期
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
          {hasSch && <div className="schedule-text">已排班</div>}
        </div>
      </div>
    );
  };

  // 渲染排班详情
  const renderScheduleDetail = () => {
    const isFuture =
      selectedDate.isAfter(moment(), "day") ||
      selectedDate.isSame(moment(), "day");
    console.log("currentSchedule", currentSchedule);
    if (!currentSchedule || JSON.stringify(currentSchedule) === "{}") {
      return (
        <div className="no-schedule">
          <div className="schedule-header">
            <div className="text">排班表</div>
            <PlusSquareFilled
              onClick={() => showModal("add")}
              style={{ fontSize: 13, color: "#2888f7" }}
            />
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
                <EditOutlined
                  style={{ color: "#2888f7" }}
                  title="编辑"
                  onClick={() => {
                    showModal("edit", currentSchedule.id);
                  }}
                />
                <DeleteOutlined
                  style={{ color: "#f5222d" }}
                  title="删除"
                  onClick={() => handleDeleteSchedule(currentSchedule.id)}
                />
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
                        <Button onClick={() => onChange(moment())} size="small">
                          今天
                        </Button>
                      </div>
                      <div>
                        <Button
                          icon={<UploadOutlined />}
                          onClick={handleExport}
                          loading={isExporting}
                          size="small"
                        >
                          导出
                        </Button>
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
    </div>
  );
};

export default ScheduleList;
