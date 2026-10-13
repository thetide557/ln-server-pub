/**
 * 左侧分组组织树
 * 对应原型：地址段清单（关键词搜索 + 分组列表 + 组下IP段 + "..."操作菜单）
 * 分组支持最多 3 层嵌套；地址段挂在任意层分组下
 */
import React, { useMemo, useState } from 'react';
import { Dropdown, Input, Menu } from 'antd';
import { CaretDownOutlined, CaretRightOutlined, HomeOutlined, SearchOutlined } from '@ant-design/icons';
import _ from 'lodash';
import { IpGroup, IpSegment, MAX_GROUP_LEVEL } from '../types';
import { hostCount } from '../mock';

interface GroupTreeProps {
  groups: IpGroup[];
  segments: IpSegment[];
  selectedGroupId?: number;
  selectedSegmentId?: number;
  /** 挂载时需要展开的分组 id（如从明细页返回时，传入选中分组及其祖先链） */
  defaultExpandGroupIds?: number[];
  onSelectGroup: (group: IpGroup) => void;
  onSelectSegment: (segment: IpSegment) => void;
  /** 顶部按钮：新增一级分组 */
  onAddGroup: () => void;
  /** 菜单项：在某分组下新增子分组（仅层级 < 3 的分组显示） */
  onAddSubGroup: (group: IpGroup) => void;
  onEditGroup: (group: IpGroup) => void;
  onDeleteGroup: (group: IpGroup) => void;
  onAddSegment: (group: IpGroup) => void;
  onShowRules: (group: IpGroup) => void;
  /** IP段节点菜单：编辑地址段 / 删除地址段 / 回收规则 */
  onEditSegment: (segment: IpSegment) => void;
  onDeleteSegment: (segment: IpSegment) => void;
  onShowSegmentRules: (segment: IpSegment) => void;
}

interface TreeNodeData extends IpGroup {
  /** 该分组下的子分组 */
  subGroups: TreeNodeData[];
  /** 该分组直属地址段 */
  segmentList: IpSegment[];
  level: number;
  /** 已用（已分配+预留）/ 总IP数（含子孙分组聚合） */
  usedCount: number;
  totalCount: number;
}

export default function GroupTree(props: GroupTreeProps) {
  const { groups, segments, selectedGroupId, selectedSegmentId, defaultExpandGroupIds } = props;
  const [keyword, setKeyword] = useState<string>('');
  // 展开状态：初始含挂载时需展开的分组（含选中分组的祖先链），此后由用户点击自行维护
  const [expandedIds, setExpandedIds] = useState<Set<number>>(() => new Set(defaultExpandGroupIds || []));

  // 平铺分组 → 树形结构（递归聚合各组的已用/总IP数）
  const treeData = useMemo<TreeNodeData[]>(() => {
    const build = (list: IpGroup[], parentId: number | undefined, level: number): TreeNodeData[] => {
      return _.chain(list)
        .filter((item) => (item.parentId ?? undefined) === parentId)
        .map((item) => {
          const subGroups = build(list, item.id, level + 1);
          const segmentList = _.filter(segments, { groupId: item.id });
          return {
            ...item,
            level,
            subGroups,
            segmentList,
            // 已用/总IP数：直接取树接口返回的分组数值（不再前端聚合孙代段）
            usedCount: item.usedCount || 0,
            totalCount: item.totalCount || 0,
          };
        })
        .value();
    };
    return build(groups, undefined, 1);
  }, [groups, segments]);

  // 关键词过滤：分组名或其下（含子孙）地址段名命中时保留该分支
  const filteredTree = useMemo<TreeNodeData[]>(() => {
    if (!keyword) return treeData;
    const filterNode = (nodes: TreeNodeData[]): TreeNodeData[] => {
      const result: TreeNodeData[] = [];
      _.forEach(nodes, (node) => {
        const selfMatch = node.name.indexOf(keyword) > -1;
        const segMatch = _.some(node.segmentList, (seg) => seg.fullSegment.indexOf(keyword) > -1);
        const subGroups = filterNode(node.subGroups);
        const subMatch = subGroups.length > 0;
        if (selfMatch || segMatch || subMatch) {
          result.push({
            ...node,
            segmentList: selfMatch || subMatch ? node.segmentList : _.filter(node.segmentList, (seg) => seg.fullSegment.indexOf(keyword) > -1),
            subGroups,
          });
        }
      });
      return result;
    };
    return filterNode(treeData);
  }, [treeData, keyword]);

  const toggleExpand = (id: number) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const renderGroupMenu = (group: TreeNodeData) => (
    <Menu
      style={{ width: '110px' }}
      onClick={({ key }) => {
        if (key === 'add-sub') {
          props.onAddSubGroup(group);
        } else if (key === 'edit') {
          props.onEditGroup(group);
        } else if (key === 'add-segment') {
          props.onAddSegment(group);
        } else if (key === 'del') {
          props.onDeleteGroup(group);
        } else if (key === 'rules') {
          props.onShowRules(group);
        }
      }}
      items={[
        // 层级达到上限时不再提供"新增分组"
        ...(group.level < MAX_GROUP_LEVEL ? [{ key: 'add-sub', label: '新增分组' }] : []),
        { key: 'edit', label: '编辑分组' },
        { key: 'add-segment', label: '新增地址段' },
        { key: 'del', label: '删除分组' },
        { key: 'rules', label: '回收规则' },
      ]}
    />
  );

  /** IP 段节点菜单：编辑地址段 / 删除地址段 / 回收规则 */
  const renderSegmentMenu = (segment: IpSegment) => (
    <Menu
      style={{ width: '110px' }}
      onClick={({ key }) => {
        if (key === 'edit-seg') {
          props.onEditSegment(segment);
        } else if (key === 'del-seg') {
          props.onDeleteSegment(segment);
        } else if (key === 'rules') {
          props.onShowSegmentRules(segment);
        }
      }}
      items={[
        { key: 'edit-seg', label: '编辑地址段' },
        { key: 'del-seg', label: '删除地址段' },
        { key: 'rules', label: '回收规则' },
      ]}
    />
  );

  const renderNode = (node: TreeNodeData) => {
    const isExpanded = expandedIds.has(node.id);
    const isGroupActive = selectedGroupId === node.id && !selectedSegmentId;
    return (
      <div key={node.id} className='tree-row'>
        <div className='tree-group' style={{ marginLeft: `${(node.level - 1) * 16}px` }}>
          <span
            className='tree-toggle'
            onClick={() => {
              toggleExpand(node.id);
            }}
          >
            {isExpanded ? <CaretDownOutlined /> : <CaretRightOutlined />}
          </span>
          <span
            className={`g-name ${isGroupActive ? 'active' : ''}`}
            onClick={() => {
              props.onSelectGroup(node);
            }}
          >
            {/* <HomeOutlined className='g-icon' /> */}
            <span className='g-label'>{node.name}</span>
            <span className={`g-count ${isGroupActive ? 'active' : ''}`}>
              {node.usedCount}/{node.totalCount}
            </span>
          </span>
          <Dropdown overlay={renderGroupMenu(node)} trigger={['click']}>
            <span
              className='more'
              onClick={(e) => {
                e.stopPropagation();
              }}
            >
              ...
            </span>
          </Dropdown>
        </div>
        {isExpanded && (
          <div className='tree-content'>
            {/* 子分组与直属 IP 段同级：缩进量一致（(level+1-1)*16） */}
            {_.map(node.subGroups, (sub) => renderNode(sub))}
            {node.segmentList.length === 0 && node.subGroups.length === 0 && <div className='group-empty-tip'>（暂无地址段）</div>}
            {_.map(node.segmentList, (segment) => {
              const isSegActive = selectedSegmentId === segment.id;
              // 段节点数值：直接取树接口返回值（缺省时回退按掩码/已分配+预留计算）
              const segTotal = segment.treeTotal ?? hostCount(segment.mask);
              const segUsed = segment.treeUsed ?? (segment.allocatedCount + segment.reservedIpCount);
              return (
                <div
                  key={segment.id}
                  className='tree-asset tree-group'
                  style={{ marginLeft: `${node.level * 16}px` }}
                >
                  {/* IP 段无子级，占位对齐三角图标宽度 */}
                  <span className='tree-toggle-placeholder' />
                  <span className={`seg-icon ${isSegActive ? 'active' : ''}`}>@</span>
                  <div
                    className={`asset-name ${isSegActive ? 'active' : ''}`}
                    onClick={() => {
                      props.onSelectSegment(segment);
                    }}
                  >
                    <span className='g-label'>IP-{segment.fullSegment}</span>
                    <span className={`g-count ${isSegActive ? 'active' : ''}`}>
                      {segUsed}/{segTotal}
                    </span>
                  </div>
                  <Dropdown overlay={renderSegmentMenu(segment)} trigger={['click']}>
                    <span
                      className='more'
                      onClick={(e) => {
                        e.stopPropagation();
                      }}
                    >
                      ...
                    </span>
                  </Dropdown>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className='ip-left-area'>
      <div className='left-tree-header'>
        <span>地址段清单</span>
        <span
          className='add-group-btn'
          onClick={() => {
            props.onAddGroup();
          }}
        >
          + 新增分组
        </span>
      </div>
      <div className='left-tree-search'>
        <Input
          allowClear
          prefix={<SearchOutlined style={{ color: '#999' }} />}
          placeholder='输入关键词'
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
        />
      </div>
      <div className='left_tree'>
        {_.map(filteredTree, (node) => renderNode(node))}
        {filteredTree.length === 0 && <div className='group-empty-tip'>（无匹配结果）</div>}
      </div>
    </div>
  );
}
