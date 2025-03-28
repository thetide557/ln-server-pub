import React, { useContext, useEffect, useMemo, useRef, useState } from "react";
import {
  Button,
  Dropdown,
  Input,
  Menu,
  message,
  Modal,
  Space,
  Table,
  Tag,
  Tree,
  Switch,
  Popover,
  Checkbox,
  Row,
  Col,
  Select,
  Tooltip,
} from "antd";
import {
  PlusSquareOutlined,
  MinusSquareOutlined,
  FileOutlined,
  PlusOutlined,
  EyeOutlined,
} from "@ant-design/icons";
import PageLayout from "@/components/pageLayout";
import { useTranslation } from "react-i18next";
import { useAntdResizableHeader } from "use-antd-resizable-header";
import moment from "moment";

import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  DeleteOutlined,
  DownOutlined,
  EditOutlined,
  FileSearchOutlined,
  FundOutlined,
  GroupOutlined,
  LeftOutlined,
  RightOutlined,
  SearchOutlined,
  SyncOutlined,
  UnorderedListOutlined,
  VideoCameraOutlined,
  StopOutlined,
} from "@ant-design/icons";
import "./locale";
import "./style.less";
import _ from "lodash";
import { Resizable } from "re-resizable";
import AccordionModal from "./Accordion/accordionModal";
import ColumnConfig from "./ColumnConfig";
import { assetsType, metricsUnitEnum } from "@/store/assetsInterfaces";
import { CommonStateContext } from "@/App";

import RefreshIcon from "@/components/RefreshIcon";
import { Link, useHistory } from "react-router-dom";
import { OperationModal } from "./OperationModal";
import { useInterval, useLocalStorage } from "react-use";
import {
  getIotPage,
  getIotDeviceList,
  getIotTreeList,
  delIotTreeNode
} from "@/services/sxxc/iotAssets";

export enum OperateType {
  BindTag = "bindTag",
  UnbindTag = "unbindTag",
  AssetBatchImport = "assetBatchImport",
  AssetBatchExport = "assetBatchExport",
  UpdateBusi = "updateBusi",
  RemoveBusi = "removeBusi",
  UpdateNote = "updateNote",
  Delete = "delete",
  ChangeOrganize = "changeOrganize",
  None = "none",
}

export default function () {
  const { t } = useTranslation("iotassets");
  const history = useHistory();

  const [list, setList] = useState<any[]>([]); // 资产清单表格列表数据
  const [operateType, setOperateType] = useState<OperateType>(OperateType.None); // 批量操作类型
  const [selectedAssets, setSelectedAssets] = useState<number[]>([]); // 选中资产
  const [selectedAssetsName, setSelectedAssetsName] = useState<string[]>([]);
  const [current, setCurrent] = useLocalStorage("iotasset_current_from", 1); // 当前页码
  const [pageSize, setPageSize] = useLocalStorage("iotasset_current_page", 10); // 每页条数
  const [queryFilter, setQueryFilter] = useState<any>([]); // 资产清单过滤条件下拉列表
  const [searchVal, setSearchVal] = useLocalStorage<any>(
    "iotasset_filter_value",
    null
  ); // 资产清单过滤 模糊搜索关键字
  const [filterParam, setFilterParam] = useLocalStorage<any>(
    "iotasset_filter_param",
    ""
  ); // 资产清单过滤条件
  const [refreshKey, setRefreshKey] = useState(_.uniqueId("refreshKey_"));
  const [total, setTotal] = useState<number>(0);

  const { busiGroups, profile, permList } = useContext(CommonStateContext);
  const groupIds = busiGroups?.map((item) => item.id); // 业务组id

  const [collapse, setCollapse] = useState(
    localStorage.getItem("left_iotasset_list") === "1"
  ); // 左侧资产树折叠
  const [width, setWidth] = useState(
    _.toNumber(localStorage.getItem("left_iotasset_width") || 200)
  ); // 左侧资产树宽度
  const [typeId, setTypeId] = useLocalStorage<number>(
    "current_iotasset_type_id",
    1
  ); // 左侧资产树选中的资产类型
  const [open, setOpen] = useState<boolean>(false); // 新增分组模态框是否显示
  const [title, setTitle] = useState<any>(""); // 新增分组模态框标题
  // 资产分组
  let treeQuery = {}; // 资产树查询条件
  const [treeList, setTreeList] = useState<any>([]); // 资产树列表数据
  const [curGroup, setCurGroup] = useState<any>({}); // 当前编辑的分组
  const [level, setLevel] = useState<number | undefined>(undefined);
  const [parentId, setParentId] = useState(-1);
  // const [parId, setParId] = useLocalStorage("left_iotparId", "1"); // 选中的资产类型的父级id
  const [tissueId, setTissueId] = useLocalStorage("left_tissueId", Number(-1)); // ??左侧资产树选中的分组的id
  const [configOpen, setConfigOpen] = useState<boolean>(false); // 字段配置模态框是否显示

  // 资产清单表列固定列
  const fixColumns: any[] = [
    {
      title: "请配置",
      align: "center",
      width: 120,
    },
    {
      title: "请配置",
      align: "center",
      width: 120,
    },
    {
      title: "请配置",
      align: "center",
      width: 120,
    },
    {
      title: "数据更新时间",
      dataIndex: "create_at",
      align: "center",
      ellipsis: true,
      width: 130,
      // render(text, record, index) {
      //   return moment.unix(text).format("YYYY-MM-DD HH:mm:ss");
      // },
      sorter: (a, b) => {
        return a.create_at > b.create_at ? 1 : -1;
      },
    },
    {
      title: "配置更新人",
      dataIndex: "create_by",
      align: "center",
      ellipsis: true,
      width: 130,
    },
    {
      title: "操作",
      width: 200,
      align: "center",
      fixed: "right",
      render: (text, record) => (
        <Space>
          {(profile.roles?.includes("Admin") ||
            permList.includes("/xh/iotassetmgt/detail")) && (
            <span
              onClick={(e) => {
                showModal("view", record);
              }}
            >
              <EyeOutlined style={{ color: "#1890FF" }} />
              <span style={{ marginLeft: 4 }}>查看</span>
            </span>
          )}
        </Space>
      ),
    },
  ];

  // 列处理
  const [selectColumns, setSelectColumns] = useState<any[]>(fixColumns); // 选中列
  const { resizableColumns, components, tableWidth } = useAntdResizableHeader({
    columns: useMemo(() => selectColumns, [selectColumns]),
    columnsState: {
      persistenceType: "localStorage",
      persistenceKey: `dashboard-table-resizable-iotasset-management`,
    },
  }); // 列宽度调整

  // 根据选择资产类型生成显示列
  useEffect(() => {
    getPagesByType(typeId);
  }, [typeId]);

  // 处理显示列和过滤字段
  function processDataAndFilter(data) {
    let selectedColumn: any[] = [];
    let filterArr: any[] = [];
    let diaplayAttributes: any[] = [];
    data?.map((page) => {
      const filteredAttributes = page.Attributes.filter(
        (attr) =>
          attr.pageId !== -1 &&
          attr.DisplayOrder !== null &&
          attr.DisplayOrder !== 0
      );
      diaplayAttributes = [...diaplayAttributes, ...filteredAttributes];
    });
    const sortedAttributes = diaplayAttributes.sort(
      (a, b) => a.DisplayOrder - b.DisplayOrder
    );
    console.log("显示列", sortedAttributes);
    const columnData = sortedAttributes.map((attr) => ({
      title: attr.Name,
      dataIndex: attr.Name,
      align: "center",
      width: 120,
      ellipsis: true,
      sorter: (a, b) => {
        return a[attr.Name].localeCompare(b[attr.Name]);
      },
    }));

    const filterData = sortedAttributes.map((attr) => ({
      name: attr.Name,
      label: attr.Name,
    }));

    selectedColumn = selectedColumn.concat(columnData);
    filterArr = filterArr.concat(filterData);
    return { selectedColumn, filterArr };
  }

  const getPagesByType = (typeId) => {
    getIotPage({ typeId }).then((res) => {
      const { dat } = res;
      const { selectedColumn, filterArr } = processDataAndFilter(dat);
      // 显示列
      if (selectedColumn.length > 0) {
        // 过滤掉 fixColumns 中标题为 "请配置" 的项
        setSelectColumns(
          selectedColumn.concat(
            fixColumns.filter((column) => column.title !== "请配置")
          )
        );
      }

      // 过滤字段
      setQueryFilter(filterArr);
    });
  };

  // 获取资产分组树列表
  const getAssetTree = () => {
    // console.log('treeQuery', treeQuery);
    // treeQuery["status"] = 0;
    // treeQuery["groupIds"] = groupIds?.toString();
    // treeQuery["query"] = searchVal ? searchVal : undefined;
    // treeQuery["filter"] = filterParam ? filterParam : undefined;
    getIotTreeList().then((res) => {
      const { dat } = res;
      setTreeList(dat);
    });
  };

  useEffect(() => {
    getTableData();
  }, [searchVal, typeId, refreshKey, tissueId]);

  useEffect(() => {
    getAssetTree();
  }, [searchVal]);

  // TODO:定时刷新
  // useInterval(() => {
  //   setRefreshKey(_.uniqueId("refreshKey_"));
  // }, 1000 * 30);

  // 资产清单表格数据获取
  const getTableData = () => {
    // const parentId = localStorage.getItem("left_iotparId");
    const param = {
      pageNum: current,
      pageSize: pageSize,
    };
    if (searchVal != null && searchVal.length > 0) {
      param["queryValue"] = searchVal;
    }
    if (typeId != null) {
      param["typeId"] = typeId;
    }
    if (
      filterParam != null &&
      filterParam.length > 0 &&
      searchVal != null &&
      searchVal.length > 0
    ) {
      param["queryAttribute"] = filterParam;
    }

    getIotDeviceList(param).then(({ dat }) => {
      setList(dat.list || []);
      setTotal(dat.total);
    });
  };

  // 资产清单表格操作：查看
  const showModal = (action: string, formData: any) => {
    if (action == "view") {
      history.push(
        "/xh/iotassetmgt/view?mode=view&id=" + formData.id + "&typeId=" + typeId
      );
    }
  };
  // 资产清单表格分页
  const onPageChange = (page: number, pageSize: number) => {
    setCurrent(page);
    setPageSize(pageSize);
    setRefreshKey(_.uniqueId("refreshKey_"));
  };

  // 新增分组弹窗关闭
  const handleClose = (value: any) => {
    if (value == "sure") {
      getAssetTree();
    }
    setOpen(false);
  };

  // 左侧资产组织树点击
  const handleClickTree = (node: any) => {
    console.log("handleClickTree", node);
    setTypeId(node.nodeId);
    //资产类型操作
    setCurrent(1);
    localStorage.setItem("left_iotasset_type", node.nodeId);
    // localStorage.setItem("left_iotasset_nodeId", node.nodeId);
    setRefreshKey(_.uniqueId("refreshKey_"));
  };

  /** 左侧资产树组件 */
  // 递归查找父级节点
  const findParentId = (nodes, targetId) => {
    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];
      if (node.subNode && node.subNode.some(child => child.nodeId === targetId)) {
        return node.nodeId;
      }
      const parentId = findParentId(node.subNode || [], targetId);
      if (parentId) {
        return parentId;
      }
    }
    return null;
  };
  // isAllAssets：一个布尔值，用于标记当前节点是否是"全部资产"的子节点。
  const TreeNode = ({
    node,
    level,
    expandedIds,
    onToggle,
    isAllAssets = false,
  }) => {
    const isExpanded = expandedIds.has(level + "_" + node.nodeId);
    // const hasGroupDevice = (subNodes) => {
    //   return subNodes?.some((child) => child.LeafId !== -1) || false;
    // };
    const hasGroupDevice = (subNodes) => {
      return subNodes?.some((child) => child.TypeIds === "") || false;
    };

    const canAddGroup = level < 3 && !hasGroupDevice(node.subNode);

    return (
      <div key={node.nodeId}>
        {/* 分组名称 */}
        {/* {node.LeafId === -1 && ( */}
        {node.TypeIds !== "" && (
          <div key={node.nodeId} className="tree-row">
            <div
              className="tree-group"
              style={{ marginLeft: `${(level - 1) * 20}px` }}
            >
              <span
                onClick={() => {
                  onToggle(level + "_" + node.nodeId);
                }}
              >
                {isExpanded ? (
                  <MinusSquareOutlined style={{ fontSize: 13 }} />
                ) : (
                  <PlusSquareOutlined style={{ fontSize: 13 }} />
                )}
              </span>
              <span className="g-name">{node.nodeName}</span>
              {node.nodeId != -1 && !isAllAssets && (
                <Dropdown
                  // trigger={['click']}
                  overlay={
                    <Menu
                      style={{ width: "100px" }}
                      // TODO:新增、编辑、删除分组
                      onClick={({ key }) => {
                        // console.log(key);
                        if (key === "edit") {
                          setTitle("编辑分组");
                          setCurGroup(node);
                          setOpen(true);
                          setLevel(level-1);
                          const parentId = findParentId(treeList, node.nodeId);
                          setParentId(parentId); // 父级id
                        } else if (key === "del") {
                          Modal.confirm({
                            title: "是否确认删除该分组？",
                            onOk: async () => {
                              delIotTreeNode({nodeId:node.nodeId}).then((res) => {
                                message.success("删除成功");
                                getAssetTree();
                                setRefreshKey(_.uniqueId("refreshKey_"));
                              });
                            },
                            onCancel() {},
                          });
                        } else if (key === "add-sub") {
                          setTitle("新增分组");
                          setOpen(true);
                          setCurGroup({});
                          setLevel(level); // 分组层级
                          setParentId(node.nodeId); // 父级id
                        }
                      }}
                      items={[
                        ...(canAddGroup
                          ? [
                              {
                                key: "add-sub",
                                label: "新增分组",
                                icon: <PlusOutlined />,
                              },
                            ]
                          : []),
                        { key: "edit", label: "编辑", icon: <EditOutlined /> },
                        { key: "del", label: "删除", icon: <DeleteOutlined /> },
                      ]}
                    ></Menu>
                  }
                >
                  <span className="more">...</span>
                </Dropdown>
              )}
            </div>
          </div>
        )}
        {/* 分组内设备类型列表 */}
        {node.TypeIds === "" && (
          <div
            className="tree-content"
            style={{ marginLeft: `${(level - 1) * 20}px` }}
          >
            <div key={node.nodeId} className="tree-asset">
              <FileOutlined style={{ fontSize: 13 }} />
              <div
                style={{
                  backgroundColor:
                  node.nodeId == localStorage.getItem("left_iotasset_type") 
                      ? "#92b7d1"
                      : "",
                }}
                className="asset-name"
                onClick={() => handleClickTree(node)}
              >
                <span>{node.nodeName}</span>
                {/* <span>{node.number}</span> */}
              </div>
            </div>
          </div>
        )}
        {isExpanded &&
          node.subNode?.map((child) => (
            <TreeNode
              key={child.nodeId}
              node={child}
              level={level + 1}
              expandedIds={expandedIds}
              onToggle={onToggle}
              isAllAssets={node.nodeId === -1 || isAllAssets}
            />
          ))}
      </div>
    );
  };

  const AssetTree = ({ data }) => {
    //  展开的节点列表
    const [expandedIds, setExpandedIds] = useState(() => {
      try {
        const saved = localStorage.getItem("iotasset_expandedIds");
        return new Set(JSON.parse(saved || "[]"));
      } catch {
        return new Set();
      }
    });

    useEffect(() => {
      localStorage.setItem(
        "iotasset_expandedIds",
        JSON.stringify([...expandedIds])
      );
    }, [expandedIds]);

    const handleToggle = (nodeId) => {
      setExpandedIds((prev) => {
        const newSet = new Set(prev);
        newSet.has(nodeId) ? newSet.delete(nodeId) : newSet.add(nodeId);
        return newSet;
      });
    };

    return (
      <div>
        {data.map((node) => (
          <TreeNode
            key={node.nodeId}
            node={node}
            level={1}
            expandedIds={expandedIds}
            onToggle={handleToggle}
          />
        ))}
      </div>
    );
  };

  // 字段配置弹窗关闭
  const handleConfigClose = (value: any) => {
    if (value == "sure") {
      getPagesByType(typeId);
      getTableData();
    }
    setConfigOpen(false);
  };

  return (
    <PageLayout icon={<GroupOutlined />} title={"物联网资产清单"}>
      <div style={{ display: "inline-flex" }} className="asset_list_view">
        <Resizable
          style={{
            marginRight: collapse ? 0 : 10,
          }}
          size={{ width: collapse ? 0 : width, height: "100%" }}
          enable={{
            right: collapse ? false : true,
          }}
          onResizeStop={(e, direction, ref, d) => {
            let curWidth = width + d.width;
            if (curWidth < 200) {
              curWidth = 200;
            }
            setWidth(curWidth);
            localStorage.setItem("left_iotasset_width", curWidth.toString());
          }}
        >
          <div className={collapse ? "left-area collapse" : "left-area"}>
            <div
              className="collapse-btn"
              onClick={() => {
                localStorage.setItem(
                  "left_iotasset_list",
                  !collapse ? "1" : "0"
                );
                setCollapse(!collapse);
              }}
            >
              {!collapse ? <LeftOutlined /> : <RightOutlined />}
            </div>
            <div className="left_tree" style={{ display: "inline-block" }}>
              <div className="asset_organize_cls">
                <span>组织树列表</span>
                <span
                  className="add_group"
                  onClick={() => {
                    setOpen(true);
                    setCurGroup({});
                    setTitle("新增分组");
                    setLevel(0);
                    setParentId(-1);
                  }}
                >
                  新增分组
                </span>
              </div>
              <div className="tree-list">
                <AssetTree data={treeList} />
              </div>
            </div>
          </div>
        </Resizable>
        <div className="asset-operate_xh">
          <div className="table-content_xh">
            <Space>
              <RefreshIcon
                onClick={() => {
                  setRefreshKey(_.uniqueId("refreshKey_"));
                }}
              />
              <div className="table-handle-search">
                <Space>
                  {/* 资产清单过滤条件 */}
                  <Select
                    defaultValue={filterParam}
                    placeholder="选择过滤器"
                    style={{ width: 120 }}
                    // allowClear
                    onChange={(value) => {
                      setFilterParam(value);
                      setSearchVal(null);
                      setCurrent(1);
                    }}
                  >
                    {queryFilter.map((item, index) => (
                      <Select.Option value={item.name} key={index}>
                        {item.label}
                      </Select.Option>
                    ))}
                  </Select>
                  {
                    <Input
                      className={"searchInput"}
                      value={searchVal}
                      allowClear
                      onChange={(e) => {
                        if (e != undefined) {
                          setSearchVal(e.target.value);
                        } else {
                          setSearchVal(null);
                        }
                        setCurrent(1);
                      }}
                      suffix={<SearchOutlined />}
                      placeholder={"输入模糊检索关键字"}
                    />
                  }
                </Space>
              </div>
            </Space>
            <div className="tool_right">
              <Space>
                {(profile.roles?.includes("Admin") ||
                  permList.includes("/xh/assetmgt/add")) && (
                  <div>
                    <Button
                      onClick={() => {
                        setConfigOpen(true);
                      }}
                      type="primary"
                    >
                      字段配置
                    </Button>
                  </div>
                )}
                {(profile.roles?.includes("Admin") ||
                  permList.includes("/xh/assetmgt/ops")) && (
                  <div>
                    <Dropdown
                      trigger={["click"]}
                      overlay={
                        <Menu
                          style={{ width: "100px" }}
                          onClick={({ key }) => {
                            if (key == OperateType.AssetBatchExport) {
                              setOperateType(key as OperateType);
                            }
                          }}
                          items={[
                            {
                              key: OperateType.AssetBatchExport,
                              label: "导出设备",
                            },
                          ]}
                        ></Menu>
                      }
                    >
                      <Button>
                        {t("common:btn.batch_operations")} <DownOutlined />
                      </Button>
                    </Dropdown>
                  </div>
                )}
              </Space>
            </div>
          </div>
          <div className="renderer-table-container">
            <div className="assets-list-1 renderer-table-container-box">
              <Table
                dataSource={list}
                className="table-view"
                scroll={{ x: tableWidth }}
                components={components}
                columns={resizableColumns}
                bordered
                rowSelection={{
                  onChange: (_, rows) => {
                    setSelectedAssets(rows ? rows.map(({ id }) => id) : []);
                    setSelectedAssetsName(
                      rows ? rows.map(({ name }) => name) : []
                    );
                  },
                }}
                pagination={{
                  showSizeChanger: true,
                  showQuickJumper: true,
                  total: total,
                  onChange: onPageChange,
                  current: current,
                  pageSize: pageSize,
                  showTotal: (total) => `总共 ${total} 条`,
                  pageSizeOptions: [10, 20, 50, 100],
                }}
                rowKey="id"
                size="small"
              ></Table>
              {/* 批量操作模态框 */}
              <OperationModal
                operateType={operateType}
                setOperateType={setOperateType}
                assets={selectedAssets}
                names={selectedAssetsName}
                reloadList={() => {
                  setRefreshKey(_.uniqueId("refreshKey_"));
                }}
                typeId={Number(typeId)}
              />
            </div>
          </div>
        </div>
        {/* 新增分组弹窗 */}
        {open && (
          <AccordionModal
            title={title}
            open={open}
            curGroup={curGroup}
            closeOpen={handleClose}
            level={level}
            parentId={parentId}
          />
        )}
        {/* 字段配置弹窗 */}
        {configOpen && (
          <ColumnConfig
            open={configOpen}
            closeOpen={handleConfigClose}
            typeId={Number(typeId)}
          />
        )}
      </div>
    </PageLayout>
  );
}
