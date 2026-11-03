import React, { useState, useEffect, useContext, useMemo, useCallback } from "react";
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
import useIsMounted from "@/hooks/useIsMounted";
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
  getSupportOptions,
  addProdectSchedule,
  getProjectScheduleDetail,
  getProjectScheduleList,
  deleteProjectScheduleById,
  updateProjectSchedule,
  batchDeleteProjectSchedule,
  autoProjectSchedule
} from "@/services/sxxc/dutyManage";
import { exportTemplet } from "@/services/assets/asset";
import "./ProjectSupport.less";
import { CommonStateContext } from "@/App";
import { OperateType } from "./DutyList";
import { OperationModal } from "./OperationModal";
import _ from "lodash";
import BatchDeleteModal, { TimeRange } from './BatchDeleteModal';


// 定义排班数据接口
interface ScheduleItem {
  id?: string;
  duty_date?: number;
  support_ids?: string;
  createTime?: number;
  supports?: Personnel[];
}

// 定义人员数据接口
interface Personnel {
  Name?: string;
}

// 定义人员选项接口
interface PersonnelOption {
  id: string;
  name: string;
  role: string;
}

const ProjectSupport: React.FC = () => {
  // 状态管理
  const [selectedDate, setSelectedDate] = useState<Moment>(moment());
  const [selectedMonth, setSelectedMonth] = useState<Moment>(moment());
  const [showScheduleDetail, setShowScheduleDetail] = useState(false);  //控制是否显示排班详情

  const [scheduleData, setScheduleData] = useState<ScheduleItem[]>([]);
  const [currentSchedule, setCurrentSchedule] = useState<ScheduleItem>({});

  const [detailLoading, setDetailLoading] = useState(false);
  const [projectPersonnelList, setProjectPersonnelList] = useState<
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
  
  // 使用 useIsMounted Hook 来跟踪组件挂载状态，防止内存泄漏
  const isMounted = useIsMounted();

  // 缓存排班数据查找表（key: "YYYY-MM-DD" -> ScheduleItem），O(1) 查找，避免每月渲染 30+ 次遍历
  const scheduleMap = useMemo(() => {
    const map: Record<string, ScheduleItem> = {};
    scheduleData.forEach((item) => {
      if (item.duty_date) {
        map[moment.unix(item.duty_date).format("YYYY-MM-DD")] = item;
      }
    });
    return map;
  }, [scheduleData]);

  // 缓存 disableDate 回调引用
  const disableDate = useCallback((current: Moment) => {
    const today = moment().startOf("day");
    return current && current < today;
  }, []);

  // useEffect(() => {
  //   getPersonnelList();
  //   getCurrentSchedule();
  // }, []);
  useEffect(() => {
    getPersonnelList();
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
    getProjectScheduleList(param).then(({ dat }) => {
      if (!isMounted()) return;
      setLoading(false);
        if(!dat) {
          setScheduleData([]);
          return;
        };
      // 处理数据格式
      const processedData = dat.map(item => ({
        ...item,
      }));
      setScheduleData(processedData);
    }).catch((err) => {
      if (!isMounted()) return;
      setLoading(false);
      message.error(err?.message || "获取排班数据失败");
    });
  };

  // 获取值班人员列表（用于排班选择）
  const getPersonnelList = (): Promise<void> => {
    return getSupportOptions().then(({ dat }) => {
      if (!isMounted()) return;
      setProjectPersonnelList(dat.options || []);
    }).catch((err) => {
      if (!isMounted()) return;
      message.error(err?.message || "获取人员列表失败");
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
    setDetailLoading(true);
    getProjectScheduleDetail({
      date: selectedDate.format("YYYY-MM-DD"),
    }).then(({ dat }) => {
      const datas = dat.dat
      if (!isMounted()) return;
      setDetailLoading(false);
      if (datas && typeof datas === "object" && Object.keys(datas).length > 0) {
        setCurrentSchedule(datas);
      } else {
        setCurrentSchedule({});
      }
    }).catch((err) => {
      if (!isMounted()) return;
      setDetailLoading(false);
      setCurrentSchedule({});
      message.error(err?.message || "获取排班详情失败");
    });
  };

  // 处理新增/编辑排班
  const showModal = async (type: "add" | "edit", id?: string) => {
    setModalType(type);
    setModalVisible(true);
    await getPersonnelList();
    if (type === "edit") {
      try {
        setConfirmLoading(true);
        const scheduleItem = scheduleData.find((item: any) => {
          if (!item.duty_date) return false;
          let itemDate: string;
          if (typeof item.duty_date === "number") {
            itemDate = item.duty_date > 4102444800
              ? moment(item.duty_date).format("YYYY-MM-DD")
              : moment.unix(item.duty_date).format("YYYY-MM-DD");
          } else {
            itemDate = moment(item.duty_date).format("YYYY-MM-DD");
          }
          return itemDate === selectedDate.format("YYYY-MM-DD");
        });
        const source = scheduleItem
          || scheduleMap[selectedDate.format("YYYY-MM-DD")]
          || (Object.keys(currentSchedule).length > 0 ? currentSchedule : null);

        if (source) {
          const idList = normalizeSupportIds((source as any).support_ids);
          setInitData(source);
          setTimeout(() => {
            if (!isMounted()) return;
            form.resetFields();
            form.setFieldsValue({
              support_ids: idList.length > 0 ? idList[0] : undefined,
              duty_date: selectedDate,
            });
          }, 0);
        }
      } catch (error) {
        message.error("获取数据失败");
      } finally {
        setConfirmLoading(false);
      }
    } else if (type === "add") {
      setTimeout(() => {
        if (!isMounted()) return;
        form.resetFields();
        form.setFieldsValue({ duty_date: selectedDate });
      }, 0);
    }
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      if (!isMounted()) return;
      setConfirmLoading(true);
      // 提交数据
      const scheduleData = {
        duty_date: values.duty_date.format("YYYY-MM-DD"),
        support_ids: [Number(values.support_ids)],
     
      };

      if (modalType === "add") {
        const { dat } = await addProdectSchedule(scheduleData);
        if (!isMounted()) return;
        getCurrentSchedule();
        message.success(dat.message);
      } else if (modalType === "edit") {
        const { dat } =  await updateProjectSchedule(scheduleData);
        if (!isMounted()) return;
        getCurrentSchedule();
        message.success(dat.message);
      }
      setModalVisible(false);
      getData();
    } catch (error: any) {
      if (!isMounted()) return;
      message.error(error?.message || "操作失败，请重试");
    } finally {
      if (isMounted()) {
        setConfirmLoading(false);
      }
    }
  };

  // 处理删除排班
  const handleDeleteSchedule = (id) => {
    Modal.confirm({
      title: "确认删除",
      content: "排班表将清除，确认删除吗？",
      okText: "确认",
      cancelText: "取消",
      onOk: async () => {
        try {
          await deleteProjectScheduleById(id);
          if (!isMounted()) return;
            message.success("删除成功");
            setCurrentSchedule({}); // 立即清空详情面板
            getData();             // 刷新月度列表
            getCurrentSchedule();  // 确认详情为空
        } catch (err: any) {
          if (!isMounted()) return;
          message.error(err?.message || "删除失败");
        }
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
          "/api/n9e/xh/schedule/export-xls?month=" +
          selectedMonth.format("YYYY-MM");
        let params = {};
        let exportTitle = `${selectedMonth.format("YYYY-MM")}月排班表`;

        exportTemplet(url, params)
          .then((res) => {
            if (!isMounted()) return;
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
            if (!isMounted()) return;
            setIsExporting(false);
          });
      },
      onCancel: () => {
        setIsExporting(false);
      },
    });
  };

  // 自定义日历单元格（使用 useCallback + memoized scheduleMap 提升性能）
  const dateCellRender: CalendarProps<Moment>["dateFullCellRender"] = useCallback((
    date
  ) => {
    const isToday = moment().isSame(date, "day");
    const dateKey = date.format("YYYY-MM-DD");
    const scheduleItem = scheduleMap[dateKey];
    const hasSch = !!scheduleItem;

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
      // 获取支撑人员名称：优先使用 supports 字段，否则用 support_ids 查人员列表
      let firstLineNames: string[] = [];
      const supports = scheduleItem?.supports;
      if (supports && Array.isArray(supports) && supports.length > 0 && typeof supports[0] === "object" && "Name" in supports[0]) {
        // API 直接返回了人员对象数组 [{ Name: "张三" }, ...]
        firstLineNames = supports.map((p: any) => p.Name || "");
      } else {
        // 回退：通过 support_ids 从 projectPersonnelList 查找
        const idList = normalizeSupportIds(scheduleItem?.support_ids);
        firstLineNames = idList
          .map((id) => {
            const person = projectPersonnelList.find((p) => String(p.id) === String(id));
            return person?.name || "";
          })
          .filter(Boolean);
      }
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
              {firstLineNames.length > 0 && (
                <div className="personnel-line">
                  <Tooltip title={firstLineNames.join(', ')}>
                    支撑人员：{firstLineNames.join('、')}
                  </Tooltip>
                </div>
              )}
            </div>}
          </div>
        </div>
      );


    }
  }, [scheduleMap, showScheduleDetail, projectPersonnelList]);

  // 将 support_ids 标准化为字符串 ID 数组（兼容 string | number[] | string[] | JSON string）
  const normalizeSupportIds = (ids: any): string[] => {
    if (!ids) return [];
    if (Array.isArray(ids)) return ids.map((id) => String(id));
    if (typeof ids === "string") {
      // 尝试 JSON 解析（如 "[86]"" → [86]）
      try {
        const parsed = JSON.parse(ids);
        if (Array.isArray(parsed)) return parsed.map((id: any) => String(id));
        return [String(parsed)];
      } catch {}
      return ids.split(",").map((id) => id.trim()).filter(Boolean);
    }
    if (typeof ids === "number") return [String(ids)];
    return [];
  };

  // 渲染排班详情
  const renderScheduleDetail = () => {
    const isFuture =
      selectedDate.isAfter(moment(), "day") ||
      selectedDate.isSame(moment(), "day");
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

    // 获取支撑人员名称列表
    type PersonnelName = { id: string; name: string };
    let personList: PersonnelName[] = [];

    // ① 优先从 supports 数组直接取 Name（月度/详情 API 可能直接返回人员对象）
    const extractNamesFromSupports = (supports: any): PersonnelName[] => {
      if (!Array.isArray(supports) || supports.length === 0) return [];
      // supports 元素可能是 { Name: "严彪" } 或 { name: "严彪", id: "xxx" }
      if (typeof supports[0] === "object" && supports[0] !== null) {
        return supports
          .map((p: any) => ({
            id: String(p.id || p.Id || p.ID || ""),
            name: p.Name || p.name || "",
          }))
          .filter((p) => p.name);
      }
      return [];
    };

    // 按优先级尝试获取人员数据
    personList = extractNamesFromSupports(currentSchedule.supports);
    if (personList.length === 0) {
      const dateKey = selectedDate.format("YYYY-MM-DD");
      const monthlyItem = scheduleMap[dateKey];
      if (monthlyItem) {
        personList = extractNamesFromSupports(monthlyItem.supports);
      }
    }

    // ② 如果 supports 没数据，用 support_ids 从人员列表查找
    if (personList.length === 0) {
      let supportIdList = normalizeSupportIds(currentSchedule.support_ids);
      if (supportIdList.length === 0) {
        const dateKey = selectedDate.format("YYYY-MM-DD");
        const monthlyItem = scheduleMap[dateKey];
        if (monthlyItem) {
          supportIdList = normalizeSupportIds(monthlyItem.support_ids);
        }
      }
      personList = supportIdList
        .map((id) => {
          const person = projectPersonnelList.find((p) => String(p.id) === String(id));
          return { id, name: person?.name || "" };
        })
        .filter((p) => p.name);
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
              支撑人员
              <div className="personnel-list">
                {personList.length === 0 && (
                  <span className="no-personnel">未安排</span>
                )}
                {personList.map((p) => (
                  <Tag key={p.id || p.name} color="#5eaaf2">
                    {p.name}
                  </Tag>
                ))}
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
      await batchDeleteProjectSchedule({
        time_ranges: timeRanges.map((range) => ({
          start_time: range.start ? calculateTime(range.start, "start").format("YYYY-MM-DD") : "",
          end_time: range.end ? calculateTime(range.end, "end").format("YYYY-MM-DD") : "",
        })),
      });
      if (!isMounted()) return;
      message.success(`成功删除 ${timeRanges.length} 个时间段的排班`);
      setCurrentSchedule({}); // 立即清空详情面板
      getData();
      getCurrentSchedule();
    } catch (error: any) {
      if (!isMounted()) return;
      throw error;
    }
  };
  
  // 根据给定日期计算其所属周的周一
  // type="start": 若周一早于今天则取今天；type="end": 直接返回对应周一
  // type="start": 返回周一（若早于今天则取今天）；type="end": 直接返回周日
  const calculateTime = (date: Moment, type: "start" | "end"): Moment => {
    if (type === "end") return date.clone().endOf("isoWeek");
    const monday = date.clone().startOf("isoWeek");
    if (monday.isBefore(moment(), "day")) {
      return moment();
    }
    return monday;
  };


  // 自动排班（与排班管理模块保持一致：简单确认弹窗）
  const setSchedule = () => {
    Modal.confirm({
      title: "确认自动排班吗？",
      content: "系统将从首个未排班日起，生成未来30天的排班，结束日期将自动调整至当周周日，以保证完整的周排班。",
      okText: "确认",
      okType: "primary",
      onOk: async () => {
        try {
          await autoProjectSchedule({});
          if (!isMounted()) return;
          message.success("排班成功");
          getData();
          getCurrentSchedule();
        } catch (err: any) {
          if (!isMounted()) return;
          message.error(err?.message || "排班失败");
        }
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
                          {/* {(profile.roles?.includes("Admin") ||
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
                            )} */}
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
                          {/* 自动排班：与排班管理模块保持一致，简单确认弹窗 */}
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
          labelCol={{ span: 5 }}
          wrapperCol={{ span: 19 }}
        >
          <Row gutter={16}>
            <Col span={24}>
              <Form.Item
                name="duty_date"
                label="值班日期"
                tooltip="排班按周分配，自动调整为所选日期所在的完整周"
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
            <Col span={24}>
              <Form.Item
                name="support_ids"
                label="支撑人员"
                rules={[{ required: true, message: "请选择" }]}
              >
                <Select
                  showSearch
                  placeholder="请选择支撑人员"
                  filterOption={(input, option) =>
                    (option?.label ?? "").includes(input)
                  }
                  options={projectPersonnelList.map((person) => ({
                    label: person.name,
                    value: String(person.id),
                  }))}
                />
              </Form.Item>
            </Col>
            {/* <Col span={24}>
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
            </Col> */}
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

      {/* 批量删除弹窗 */}
      <BatchDeleteModal
        visible={batchDeleteVisible}
        onCancel={() => setBatchDeleteVisible(false)}
        onConfirm={handleBatchDelete}
      />

    </div>
  );
};

export default ProjectSupport;
