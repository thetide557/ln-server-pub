import React, { useState, useEffect, useContext, useRef, useMemo, useCallback } from "react";
import {
  Calendar,
  Card,
  Row,
  Col,
  Button,
  Spin,
  message,
  Tag,
  Modal,
  Form,
  Select,
  DatePicker,
  Space,
  Tooltip,
  Timeline
} from "antd";
import {
  PlusSquareFilled,
  EditOutlined,
  DeleteOutlined,
  UploadOutlined,
  LeftCircleFilled,
  RightCircleFilled,
  ImportOutlined,
  MinusSquareOutlined
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
  autoSchedule,
  getSchedulePersonnel
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
  details?: ScheduleDetailItem[];
  hasSchedule?: boolean;
  dutyTypes?: number[];
}

interface ScheduleDetailItem {
  dutyType: number;
  roles: ScheduleRoleItem[];
}

interface ScheduleRoleItem {
  role: number;
  personnelIds: number[];
  personnelList?: Array<{ id: number; name: string }>;
}

// 定义人员选项接口
interface PersonnelOption {
  id: number;
  value?: number;
  name: string;
  label?: string;
  role: number;
  status?: number;
  duty_type_configs?: Array<{ dutyType: number; busiGroupIds?: number[] }>;
}

// 值班类型选项（与 DutyList.tsx 保持一致）
const DUTY_TYPE_OPTIONS = [
  { label: "日常常规", value: 1 },
  { label: "备班值班", value: 2 },
  { label: "重保专项", value: 3 },
];

// 角色选项（与 DutyList.tsx 保持一致）
const ROLE_OPTIONS = [
  { label: "值班负责人", value: 1 },
  { label: "一线值班", value: 2 },
  { label: "二线值班", value: 3 },
  { label: "三线值班", value: 4 },
];

const getDutyTypeLabel = (value?: number) =>
  DUTY_TYPE_OPTIONS.find((opt) => opt.value === value)?.label || "未知类型";

const getRoleLabel = (value?: number) =>
  ROLE_OPTIONS.find((opt) => opt.value === value)?.label || "未知角色";

// 将后端数据统一归一化为按值班类型分组的 details 结构
const normalizeScheduleDetails = (item: any): ScheduleDetailItem[] => {
  if (item?.details && Array.isArray(item.details)) {
    return item.details;
  }
  return [];
};

// 人员名字悬浮展示值班业务组
interface BusinessGroupItem {
  dutyType: string;
  groups: string[];
}

interface PersonnelHoverTagProps {
  personnelId: number;
  date: string;
  children: React.ReactNode;
}

const PersonnelHoverTag: React.FC<PersonnelHoverTagProps> = ({
  personnelId,
  date,
  children,
}) => {
  const [businessGroups, setBusinessGroups] = useState<BusinessGroupItem[]>([]);
  const [loading, setLoading] = useState(false);
  const cacheRef = useRef<Record<string, BusinessGroupItem[]>>({});

  const getNameText = (node: React.ReactNode): string => {
    if (node === null || node === undefined) return "";
    if (typeof node === "string" || typeof node === "number") return String(node);
    if (React.isValidElement(node)) {
      return getNameText((node.props as any).children);
    }
    if (Array.isArray(node)) {
      return node.map(getNameText).join("");
    }
    return "";
  };
  const nameText = getNameText(children);

  const handleMouseEnter = () => {
    if (!personnelId || !date) return;
    const key = `${date}_${personnelId}`;
    if (cacheRef.current[key]) {
      setBusinessGroups(cacheRef.current[key]);
      return;
    }
    if (loading) return;
    setLoading(true);
    getSchedulePersonnel({ date, personnelId })
      .then(({ dat }) => {
        const dutyTypes = dat?.duty_types || dat?.dutyTypes || [];
        const normalizedGroups: BusinessGroupItem[] = dutyTypes
          .filter((dt: any) => dt && typeof dt === "object")
          .map((dt: any) => {
            const raw =
              typeof dt.busi_groups === "string"
                ? dt.busi_groups
                : typeof dt.busiGroups === "string"
                ? dt.busiGroups
                : "";
            const groups = raw
              .split(/[,，]/)
              .map((s: string) => s.trim())
              .filter(Boolean);
            return {
              dutyType: getDutyTypeLabel(Number(dt.duty_type || dt.dutyType)),
              groups,
            };
          })
          .filter((item: BusinessGroupItem) => item.groups.length > 0);
        cacheRef.current[key] = normalizedGroups;
        setBusinessGroups(normalizedGroups);
      })
      .catch(() => {
        cacheRef.current[key] = [];
        setBusinessGroups([]);
      })
      .finally(() => {
        setLoading(false);
      });
  };

  const title = (
    <div style={{ color: "#666" }}>
      {nameText && (
        <div style={{ fontWeight: 600, marginBottom: 8 }}>{nameText}</div>
      )}
      {businessGroups.length > 0 ? (
        businessGroups.map((item, index) => (
          <div
            key={index}
            style={{ marginBottom: index < businessGroups.length - 1 ? 8 : 0 }}
          >
            <span className={`hover-duty-type type-${DUTY_TYPE_OPTIONS.find((o) => o.label === item.dutyType)?.value}`}>
              {item.dutyType}
            </span>
            <div style={{ fontWeight: 600, marginTop: 4 }}>值班业务组：</div>
            {item.groups.map((group, gIndex) => (
              <div key={gIndex}>{group}</div>
            ))}
          </div>
        ))
      ) : loading ? (
        ""
      ) : (
        "暂无值班业务组"
      )}
    </div>
  );

  return (
    <Tooltip title={title} color="#fff" placement="top" onVisibleChange={(visible) => {
      if (visible) handleMouseEnter();
    }}>
      <span className="personnel-hover-name">{children}</span>
    </Tooltip>
  );
};

// 角色行组件（值班类型下的一个角色）
interface RoleRowProps {
  dutyName: number;
  roleName: number;
  roleRestField: any;
  currentDutyType: number | undefined;
  personnelOptionsMap: Record<string, PersonnelOption[]>;
  fetchPersonnelOptions: (dutyType: number, role: number) => void;
  onRemoveRole: () => void;
}

const RoleRow: React.FC<RoleRowProps> = ({
  dutyName,
  roleName,
  roleRestField,
  currentDutyType,
  personnelOptionsMap,
  fetchPersonnelOptions,
  onRemoveRole,
}) => {
  const form = Form.useFormInstance();
  const currentRole = Form.useWatch(
    ["details", dutyName, "roles", roleName, "role"],
    form
  );

  useEffect(() => {
    if (currentDutyType && currentRole) {
      fetchPersonnelOptions(currentDutyType, currentRole);
    }
  }, [currentDutyType, currentRole]);

  const pKey = `${currentDutyType}_${currentRole}`;
  const personnelOptions = personnelOptionsMap[pKey] || [];

  const handleRemoveRole = () => {
    const roles = form.getFieldValue(["details", dutyName, "roles"]) || [];
    if (roles.length <= 1) {
      message.warning("同一值班类型至少保留一种角色");
      return;
    }
    Modal.confirm({
      title: "确认删除",
      content: "确认删除该角色及值班人员？",
      okText: "确认",
      cancelText: "取消",
      onOk: () => {
        onRemoveRole();
      },
    });
  };

  return (
    <div
      style={{
        border: "1px dashed #d9d9d9",
        borderRadius: 4,
        padding: "8px 8px 0",
        marginBottom: 8,
        background: "#fff",
      }}
    >
      <Row gutter={12} align="middle">
        <Col span={10}>
          <Form.Item
            noStyle
            shouldUpdate={(prev, cur) =>
              JSON.stringify(prev.details?.[dutyName]?.roles) !==
              JSON.stringify(cur.details?.[dutyName]?.roles)
            }
          >
            {() => {
              const usedRoles = form
                .getFieldValue(["details", dutyName, "roles"])
                ?.map((item: any) => item?.role)
                .filter((v: any) => v !== undefined);
              return (
                <Form.Item
                  {...roleRestField}
                  name={[roleName, "role"]}
                  label="角色"
                  labelCol={{ span: 8 }}
                  rules={[{ required: true, message: "请选择角色" }]}
                >
                  <Select placeholder="请选择角色">
                    {ROLE_OPTIONS.map((role) => (
                      <Select.Option
                        key={role.value}
                        value={role.value}
                        disabled={
                          form.getFieldValue([
                            "details",
                            dutyName,
                            "roles",
                            roleName,
                            "role",
                          ]) !== role.value &&
                          usedRoles?.includes(role.value)
                        }
                      >
                        {role.label}
                      </Select.Option>
                    ))}
                  </Select>
                </Form.Item>
              );
            }}
          </Form.Item>
        </Col>
        <Col span={11}>
          <Form.Item
            {...roleRestField}
            name={[roleName, "personnelIds"]}
            label="值班人员"
            labelCol={{ span: 8 }}
            rules={[{ required: true, message: "请选择值班人员" }]}
          >
            <Select
              placeholder="请选择值班人员"
              mode="multiple"
              showSearch
              filterOption={(input, option) =>
                (option?.label ?? "")
                  .toString()
                  .toLowerCase()
                  .includes(input.toLowerCase())
              }
              options={personnelOptions.map((person) => ({
                label: person.name,
                value: person.id,
              }))}
            />
          </Form.Item>
        </Col>
        <Col
          span={3}
          style={{
            marginBottom: '18px',
          }}
        >
          <Button type="link" icon={<MinusSquareOutlined />} danger size="small" onClick={handleRemoveRole}>
          </Button>
        </Col>
      </Row>
    </div>
  );
};

// 值班类型组组件（外层 Form.List 的一项）
interface ScheduleDetailRowProps {
  name: number;
  restField: any;
  totalDutyTypes: number;
  personnelOptionsMap: Record<string, PersonnelOption[]>;
  fetchPersonnelOptions: (dutyType: number, role: number) => void;
  onRemove: (name: number) => void;
}

const ScheduleDetailRow: React.FC<ScheduleDetailRowProps> = ({
  name,
  restField,
  totalDutyTypes,
  personnelOptionsMap,
  fetchPersonnelOptions,
  onRemove,
}) => {
  const form = Form.useFormInstance();
  const currentDutyType = Form.useWatch(
    ["details", name, "dutyType"],
    form
  );

  const handleRemoveDutyType = () => {
    // if (totalDutyTypes <= 1) {
    //   message.warning("至少保留一种值班类型");
    //   return;
    // }
    Modal.confirm({
      title: "确认删除",
      content: "确认删除该值班类型及相关角色与值班人员？",
      okText: "确认",
      cancelText: "取消",
      onOk: () => {
        onRemove(name);
      },
    });
  };

  return (
    <div
      style={{
        border: "1px solid #e8e8e8",
        borderRadius: 6,
        padding: "12px 12px 0",
        marginBottom: 16,
        background: "#fafafa",
      }}
    >
      <Row gutter={12} align="middle">
        <Col span={10}>
          <Form.Item
            noStyle
            shouldUpdate={(prev, cur) =>
              JSON.stringify(prev.details) !== JSON.stringify(cur.details)
            }
          >
            {() => {
              const usedDutyTypes = form
                .getFieldValue("details")
                ?.map((item: any) => item?.dutyType)
                .filter((v: any) => v !== undefined);
              return (
                <Form.Item
                  {...restField}
                  name={[name, "dutyType"]}
                  label="值班类型"
                  labelCol={{ span: 8 }}
                  rules={[{ required: true, message: "请选择值班类型" }]}
                >
                  <Select placeholder="请选择值班类型">
                    {DUTY_TYPE_OPTIONS.map((dt) => (
                      <Select.Option
                        key={dt.value}
                        value={dt.value}
                        disabled={
                          form.getFieldValue(["details", name, "dutyType"]) !==
                          dt.value && usedDutyTypes?.includes(dt.value)
                        }
                      >
                        {dt.label}
                      </Select.Option>
                    ))}
                  </Select>
                </Form.Item>
              );
            }}
          </Form.Item>
        </Col>
        {
          totalDutyTypes > 1 && (
            <Col
              span={10}
              style={{
                marginBottom: '18px',
              }}
            >
              <Button type="link" icon={<MinusSquareOutlined />} danger onClick={handleRemoveDutyType}>
              </Button>
            </Col>
          )
        }
      </Row>

      <Form.List name={[name, "roles"]}>
        {(roleFields, { add: addRole, remove: removeRole }) => (
          <>
            {roleFields.map(
              ({ key: roleKey, name: roleName, ...roleRestField }) => (
                <RoleRow
                  key={roleKey}
                  dutyName={name}
                  roleName={roleName}
                  roleRestField={roleRestField}
                  currentDutyType={currentDutyType}
                  personnelOptionsMap={personnelOptionsMap}
                  fetchPersonnelOptions={fetchPersonnelOptions}
                  onRemoveRole={() => removeRole(roleName)}
                />
              )
            )}
            <Form.Item>
              <Button
                type="dashed"
                onClick={() => {
                  const currentRoles =
                    form.getFieldValue(["details", name, "roles"]) || [];
                  const usedRoles = currentRoles
                    .map((item: any) => item?.role)
                    .filter((v: any) => v !== undefined);
                  const availableRoles = ROLE_OPTIONS.filter(
                    (r) => !usedRoles.includes(r.value)
                  );
                  if (availableRoles.length === 0) {
                    message.warning("所有角色已添加，无法新增");
                    return;
                  }
                  addRole({});
                }}
                block
                size="small"
                icon={<PlusSquareFilled />}
              >
                新增角色
              </Button>
            </Form.Item>
          </>
        )}
      </Form.List>
    </div>
  );
};

const ScheduleList: React.FC = () => {
  // 状态管理
  const [selectedDate, setSelectedDate] = useState<Moment>(moment());
  const [selectedMonth, setSelectedMonth] = useState<Moment>(moment());

  const [scheduleData, setScheduleData] = useState<ScheduleItem[]>([]);
  const [currentSchedule, setCurrentSchedule] = useState<ScheduleItem>({});

  const [detailLoading, setDetailLoading] = useState(false);
  // 旧版详情展示用
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
  // 全局人员名称映射，用于在 details 没有 personnelList 时查找姓名
  const [personnelNameMap, setPersonnelNameMap] = useState<Record<string, string>>({});
  // 人员选项缓存，key为 "dutyType_role"
  const [personnelOptionsMap, setPersonnelOptionsMap] = useState<
    Record<string, PersonnelOption[]>
  >({});
  const personnelFetchingRef = useRef<Set<string>>(new Set());
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
    // getDutyPersonnelList();
    // getData();
  }, []);
  useEffect(() => {
    getCurrentSchedule();
  }, [selectedDate]);
  useEffect(() => {
    getData();
  }, [selectedMonth, refreshKey]);

  // 解析后端返回的 personnelIds（可能是 JSON 字符串或数组）
  const parsePersonnelIds = (raw: any): number[] => {
    try {
      const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
      return Array.isArray(parsed) ? parsed.map(Number).filter((n: any) => !isNaN(n)) : [];
    } catch (e) {
      return [];
    }
  };

  // 从月度/详情角色数据中提取人员列表
  const extractPersonnelList = (r: any): Array<{ id: number; name: string }> => {
    const ids = parsePersonnelIds(r.personnelIds);
    return ids.map((id) => {
      const fromList = Array.isArray(r.personnelList)
        ? r.personnelList.find((p: any) => Number(p.id) === id)
        : null;
      return {
        id,
        name: fromList?.name || "",
      };
    });
  };

  // 获取排班列表数据
  const getData = () => {
    // 当月排班数据
    const param = { year: selectedMonth.format("YYYY"), month: selectedMonth.format("MM") };
    setLoading(true);
    getScheduleList(param).then(({ dat }) => {
      setLoading(false);
      const rawCalendar = dat?.calendar;
      const days = Array.isArray(rawCalendar)
        ? rawCalendar
        : rawCalendar?.days || [];
      const processedData: ScheduleItem[] = days.map((day: any) => {
        const details: ScheduleDetailItem[] = (day.details || []).map(
          (dt: any) => ({
            dutyType: dt.dutyType,
            roles: (dt.roles || []).map((r: any) => {
              const ids: number[] = r.personnel
                ? r.personnel.map((p: any) => Number(p.id))
                : parsePersonnelIds(r.personnelIds);
              const personnelList = r.personnel
                ? r.personnel.map((p: any) => ({
                    id: Number(p.id),
                    name: p.name,
                  }))
                : extractPersonnelList(r);
              return { role: r.role, personnelIds: ids, personnelList };
            }),
          })
        );
        const dutyTypes = Array.isArray(day.duty_types)
          ? day.duty_types
              .map((dt: any) => Number(dt))
              .filter((n: any) => !isNaN(n))
          : Array.isArray(day.dutyTypes)
          ? day.dutyTypes.map((dt: any) =>
              typeof dt === "number" ? dt : dt?.dutyType
            ).filter(Boolean)
          : [];
        const dateStr = day.duty_date || day.date;
        return {
          duty_date: dateStr ? moment(dateStr).unix() : undefined,
          hasSchedule: day.has_schedule || day.hasSchedule,
          dutyTypes,
          details,
        };
      });
      setScheduleData(processedData);
    });
  };

  // 获取值班人员列表（用于排班选择）
  const getDutyPersonnelList = () => {
    const allOptions: PersonnelOption[] = [];
    const collect = (
      role: string,
      setter: React.Dispatch<React.SetStateAction<PersonnelOption[]>>
    ) => {
      return getDutyPersonnelOptions({ role }).then(({ dat }) => {
        const options = dat || [];
        setter(options);
        allOptions.push(...options);
      });
    };
    Promise.all([
      collect("值班主任", setDirectorPersonnelList),
      collect("一线运维", setFirstLinePersonnelList),
      collect("二线运维", setSecondLinePersonnelList),
      collect("三线运维", setThirdLinePersonnelList),
    ]).then(() => {
      const map: Record<string, string> = {};
      allOptions.forEach((p) => {
        if (p.id) {
          map[p.id] = p.name;
        }
      });
      setPersonnelNameMap(map);
    });
  };

  // 获取值班人员列表（按值班类型和角色筛选，用于新增/编辑弹窗）
  const fetchPersonnelOptions = useCallback(
    (dutyType: number, role: number) => {
      const key = `${dutyType}_${role}`;
      if (personnelFetchingRef.current.has(key)) return; // 正在请求中则跳过

      personnelFetchingRef.current.add(key);
      getDutyPersonnelOptions({ dutyType, role })
        .then(({ dat }) => {
          const options = (dat || []).filter((p: PersonnelOption) => {
            // 仅保留已启用的人员
            if (p.status !== undefined && p.status !== 1) return false;
            // 仅保留拥有所选值班类型和角色属性的人员
            const hasDutyType = Array.isArray(p.duty_type_configs)
              ? p.duty_type_configs.some((c) => c.dutyType === dutyType)
              : true;
            const roleMatched = p.role ? p.role === role : true;
            return hasDutyType && roleMatched;
          });
          setPersonnelOptionsMap((prev) => ({
            ...prev,
            [key]: options,
          }));
        })
        .finally(() => {
          personnelFetchingRef.current.delete(key);
        });
    },
    []
  );

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
    getScheduleDetail({
      date: selectedDate.format("YYYY-MM-DD"),
    }).then(({ dat }) => {
      setDetailLoading(false);
      if (dat && typeof dat === "object" && (dat.hasSchedule || dat.has_schedule)) {
        const optionsMap: Record<string, PersonnelOption[]> = {};
        const details: ScheduleDetailItem[] = (dat.details || []).map((dt: any) => ({
          dutyType: dt.dutyType,
          roles: (dt.roles || []).map((r: any) => {
            const ids: number[] = r.personnel
              ? r.personnel.map((p: any) => Number(p.id))
              : parsePersonnelIds(r.personnelIds);
            const personnelList = r.personnel
              ? r.personnel.map((p: any) => ({ id: Number(p.id), name: p.name }))
              : ids.map((id) => ({
                  id,
                  name: dat.personnel?.[id]?.name || personnelNameMap[String(id)] || "",
                }));
            const key = `${dt.dutyType}_${r.role}`;
            if (!optionsMap[key]) optionsMap[key] = [];
            if (r.personnel) {
              r.personnel.forEach((p: any) => {
                const id = Number(p.id);
                if (!optionsMap[key].some((opt) => opt.id === id)) {
                  optionsMap[key].push({
                    id,
                    name: p.name,
                    label: p.name,
                    value: id,
                    role: r.role,
                  });
                }
              });
            } else {
              ids.forEach((id) => {
                const name = dat.personnel?.[id]?.name || personnelNameMap[String(id)] || "";
                if (!optionsMap[key].some((opt) => opt.id === id)) {
                  optionsMap[key].push({
                    id,
                    name,
                    label: name,
                    value: id,
                    role: r.role,
                  });
                }
              });
            }
            return {
              role: r.role,
              personnelIds: ids,
              personnelList,
            };
          }),
        }));
        // 预填充人员选项，确保编辑回显能正确显示名字
        setPersonnelOptionsMap((prev) => ({ ...prev, ...optionsMap }));
        const dutyDate = dat.dutyDate || dat.duty_date;
        setCurrentSchedule({
          id: dat.id,
          duty_date: dutyDate ? moment(dutyDate).unix() : undefined,
          details,
        });
      } else {
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
          const { duty_date, details } = currentSchedule as any;
          // 将后端返回的 details[{ dutyType, roles[{ role, personnelIds }] }]
          // 转为嵌套表单结构
          const nestedDetails: any[] = [];
          if (details) {
            details.forEach((dt: any) => {
              const roles = (dt.roles || []).map((r: any) => {
                const ids = r.personnel
                  ? r.personnel.map((p: any) => Number(p.id))
                  : parsePersonnelIds(r.personnelIds);
                return {
                  role: r.role,
                  personnelIds: ids,
                };
              });
              nestedDetails.push({
                dutyType: dt.dutyType,
                roles: roles.length > 0 ? roles : [{}],
              });
              // 预加载人员选项
              (dt.roles || []).forEach((r: any) => {
                fetchPersonnelOptions(dt.dutyType, r.role);
              });
            });
          }
          const formData = {
            duty_date: duty_date ? moment.unix(duty_date) : moment(),
            details: nestedDetails.length > 0 ? nestedDetails : [{ roles: [{}] }],
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
        details: [{ roles: [{}] }],
      });
    }
  };
  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setConfirmLoading(true);

      // 将嵌套结构扁平化并校验 (dutyType, role) 去重
      const nestedDetails: any[] = values.details || [];
      const flatDetails: any[] = [];
      const seen = new Set<string>();
      for (const dt of nestedDetails) {
        const roles = dt.roles || [];
        for (const r of roles) {
          if (!r.role) continue;
          const key = `${dt.dutyType}_${r.role}`;
          if (seen.has(key)) {
            message.error("同一值班类型下角色不能重复，请调整");
            setConfirmLoading(false);
            return;
          }
          seen.add(key);
          flatDetails.push({
            dutyType: dt.dutyType,
            role: r.role,
            personnelIds: (r.personnelIds || []).map((id: any) =>
              typeof id === "number" ? id : Number(id)
            ).filter((id: number) => !isNaN(id)),
          });
        }
      }

      if (modalType === "add") {
        await addSchedule({
          dutyDate: values.duty_date.format("YYYY-MM-DD"),
          details: flatDetails,
        });
        getCurrentSchedule();
        message.success("新增成功");
      } else if (modalType === "edit") {
        await updateSchedule(
          { details: flatDetails },
          (initData as any)?.id
        );
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
      content: "排班表将清除，确认删除？",
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
          "/api/takin/schedule/export?month=" +
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
    const scheduleItem = scheduleData && scheduleData.find(
      item => item.duty_date && moment.unix(item.duty_date).isSame(date, "day")
    );
    const hasSch = !!scheduleItem?.hasSchedule;
    const details = normalizeScheduleDetails(scheduleItem);
    const dateStr = date.format("YYYY-MM-DD");

    // 获取农历日期
    const d = Lunar.fromDate(date.toDate());
    const lunarMonth = d.getMonthInChinese();
    const lunarDay = d.getDayInChinese();
    // 初一显示完整农历月份和日期，其他日期只显示日期
    const lunar = lunarDay === "初一" ? `${lunarMonth}月${lunarDay}` : lunarDay;

    return (
      <div className="calendar-cell">
        <div className="top">
          <div className="date-left">
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
          <div className={`schedule-status ${hasSch ? "scheduled" : "empty"}`}>
            {hasSch ? "已排班" : ""}
          </div>
        </div>
        <div className="bottom">
          {hasSch && details.length > 0 ? (
            <div className="schedule-detail-scroll">
              {details.map((dt, dtIndex) => {
                const allPersonnel = dt.roles
                  .flatMap((role) =>
                    role.personnelList?.length
                      ? role.personnelList
                      : role.personnelIds.map((id) => ({ id, name: "" }))
                  )
                  .filter((p, idx, arr) => {
                    const firstIndex = arr.findIndex((item) => item.id === p.id);
                    return firstIndex === idx;
                  });
                if (allPersonnel.length === 0) return null;
                return (
                  <div key={dtIndex} className="duty-type-block">
                    <div className={`duty-type-title type-${dt.dutyType}`}>
                      {getDutyTypeLabel(dt.dutyType)}
                    </div>
                    <div className="duty-type-personnel-list">
                      {allPersonnel.map((p, pIndex) => {
                        const displayName = p.name || personnelNameMap[String(p.id)] || p.id;
                        return (
                          <span key={p.id || pIndex} className="personnel-name">
                            {pIndex > 0 && <span className="name-separator"> </span>}
                            <PersonnelHoverTag personnelId={p.id} date={dateStr}>
                              {displayName}
                            </PersonnelHoverTag>
                          </span>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="no-schedule-cell">
              <img src="/image/portal/no-data.png" alt="暂无排班" />
              <div className="no-schedule-text">暂无排班</div>
            </div>
          )}
        </div>
      </div>
    );
  };

  // 根据 role 找到对应人员列表并返回姓名
  const getPersonnelNameByRole = (role: number, id: number) => {
    let list: PersonnelOption[] = [];
    if (role === 1) list = directorPersonnelList;
    else if (role === 2) list = firstLinePersonnelList;
    else if (role === 3) list = secondLinePersonnelList;
    else if (role === 4) list = thirdLinePersonnelList;
    return list.find((p) => p.id === id)?.name;
  };

  // 渲染排班详情
  const renderScheduleDetail = () => {
    const today = moment().startOf("day");
    const isFuture = selectedDate.isSameOrAfter(today, "day");
    const dateStr = selectedDate.format("YYYY-MM-DD");
    const details = normalizeScheduleDetails(currentSchedule);

    if (!currentSchedule || JSON.stringify(currentSchedule) === "{}" || details.length === 0) {
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
          <div className="schedule-date">{dateStr}</div>
          <div className="no-data-content">
            <img src="/image/portal/no-data.png" alt="暂无排班" />
            <div className="no-data-text">暂无排班</div>
          </div>
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
        <div className="schedule-date">{dateStr}</div>
        <div className="content">
          {details.map((dt, dtIndex) => (
            <div key={dtIndex} className="duty-type-section">
              <div className={`duty-type-section-title type-${dt.dutyType}`}>
                {getDutyTypeLabel(dt.dutyType)}
              </div>
              {dt.dutyType === 1 ? (
                <Timeline>
                  {dt.roles.map((role, roleIndex) => {
                    const list = role.personnelList?.length
                      ? role.personnelList
                      : role.personnelIds.map((id) => ({
                          id,
                          name: getPersonnelNameByRole(role.role, id) || personnelNameMap[String(id)] || "",
                        }));
                    const validList = list.filter((p) => p.name || p.id);
                    if (validList.length === 0) return null;
                    return (
                      <Timeline.Item
                        key={roleIndex}
                        className={role.role === 1 ? "director-role-item" : ""}
                        dot={
                          <IconFont
                            type="icon-zhibanrenyuan"
                            className="timeline-person-icon"
                          />
                        }
                      >
                        <div className="timeline-role-name">{getRoleLabel(role.role)}</div>
                        <div className="timeline-role-personnel">
                          {validList.map((p, pIndex) => (
                            <span key={p.id || pIndex}>
                              {pIndex > 0 && <span className="name-separator">、</span>}
                              <PersonnelHoverTag personnelId={p.id} date={dateStr}>
                                <Tag color="#5eaaf2" style={{ cursor: "pointer" }}>{p.name || p.id}</Tag>
                              </PersonnelHoverTag>
                            </span>
                          ))}
                        </div>
                      </Timeline.Item>
                    );
                  })}
                </Timeline>
              ) : (
                <div className="simple-personnel-list">
                  {(() => {
                    const allPersonnel = dt.roles
                      .flatMap((role) => {
                        const list = role.personnelList?.length
                          ? role.personnelList
                          : role.personnelIds.map((id) => ({
                              id,
                              name: getPersonnelNameByRole(role.role, id) || personnelNameMap[String(id)] || "",
                            }));
                        return list.filter((p) => p.name || p.id);
                      })
                      .filter((p, index, self) => self.findIndex((item) => item.id === p.id) === index);
                    if (allPersonnel.length === 0) return null;
                    return allPersonnel.map((p, pIndex) => (
                      <span key={p.id || pIndex}>
                        {pIndex > 0 && <span className="name-separator">、</span>}
                        <PersonnelHoverTag personnelId={p.id} date={dateStr}>
                          <Tag color="#5eaaf2" style={{ cursor: "pointer" }}>{p.name || p.id}</Tag>
                        </PersonnelHoverTag>
                      </span>
                    ));
                  })()}
                </div>
              )}
            </div>
          ))}
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
        autoSchedule({}).then(() => {
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
        <Form
          form={form}
          layout="horizontal"
          initialValues={{}}
          labelAlign="left"
          labelCol={{ span: 6 }}
          wrapperCol={{ span: 18 }}
        >
          <Form.Item
            name="duty_date"
            label="值班日期"
            labelCol={{ span: 3 }}
            rules={[{ required: true, message: "请选择值班日期" }]}
          >
            {/* @ts-ignore */}
            <DatePicker
              disabledDate={disableDate}
              disabled={modalType === "edit"}
              style={{ width: "100%" }}
            />
          </Form.Item>

          <Form.List name="details">
            {(dutyFields, { add: addDuty, remove: removeDuty }) => (
              <>
                {dutyFields.map(({ key, name, ...restField }) => (
                  <ScheduleDetailRow
                    key={key}
                    name={name}
                    restField={restField}
                    totalDutyTypes={dutyFields.length}
                    personnelOptionsMap={personnelOptionsMap}
                    fetchPersonnelOptions={fetchPersonnelOptions}
                    onRemove={removeDuty}
                  />
                ))}
                <Form.Item>
                  <Button
                    type="dashed"
                    onClick={() => {
                      const currentDetails = form.getFieldValue("details") || [];
                      const usedTypes = currentDetails
                        .map((item: any) => item?.dutyType)
                        .filter((v: any) => v !== undefined);
                      const availableTypes = DUTY_TYPE_OPTIONS.filter(
                        (dt) => !usedTypes.includes(dt.value)
                      );
                      if (availableTypes.length === 0) {
                        message.warning("所有值班类型已添加，无法新增");
                        return;
                      }
                      addDuty({ roles: [{}] });
                    }}
                    block
                    icon={<PlusSquareFilled />}
                  >
                    新增值班类型
                  </Button>
                </Form.Item>
              </>
            )}
          </Form.List>
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
          templateUrl: "/api/takin/schedule/template",
          importUrl: "/api/takin/schedule/import",
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