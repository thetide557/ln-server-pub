import './style.less';
import React, { useEffect, useState } from 'react';

import { Card, Form, Modal, Space, Tag } from 'antd';
import { CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';
import _ from 'lodash';

import { factories } from '../../assetmgt/catalog';
import { Link, useLocation } from 'react-router-dom';
import { getAssetBoard, getXhAsset } from '@/services/assets';
import queryString from 'query-string';
import { getAssetstypes } from '@/services/assets';
import Board from '@/pages/dashboard/Detail/Board';

const loadImages = (cn_name) => {
  let imageName = '/image/factory/other.png';
  for (let factor in factories) {
    let image = factories[factor];
    if (image.value == cn_name) {
      imageName = '/image/factory/' + image.key + '.png';
    }
  }
  return imageName;
};

export default function () {
  const [itemButton, setItemButton] = useState<string>(localStorage.getItem('asset_item_ctr_button') ? '' + localStorage.getItem('asset_item_ctr_button') : '收起');
  const [accessoriesVisable, setAccessoriesVisable] = useState(false);
  const [accessories, setAccessories] = useState<any>({
    title: '其他信息名称',
    label: '',
    name: '',
    items: [],
    properties: [],
  });
  const [assetTypes, setAssetTypes] = useState<any[]>([]);
  const { search } = useLocation();
  const { id, action } = queryString.parse(search);
  const [assetInfo, setAssetInfo] = useState<any>({});
  const [assetItems, setAssetItems] = useState<any[]>([]);
  const [boardId, setBoardId] = useState('');
  const [form] = Form.useForm();

  const panelBaseProps: any = {
    size: 'small',
  };

  const genForm = (type: string, theme: string) => {
    const assetType: any = assetTypes.find((v) => v.name === type);
    let items = {};
    if (assetType) {
      //TODO：处理分组属性
      let extra_props = assetType.extra_props;
      let map = new Map();
      for (let property in extra_props) {
        let group = extra_props[property];
        map.set(group.sort, property);
      }
      var arrayObj = Array.from(map);
      arrayObj.sort(function (a, b) {
        return a[0] - b[0];
      });

      for (var [key, value] of arrayObj) {
        let group = extra_props[value];
        if (group != null && theme == value && group.props) {
          let baseItems = new Array();
          let listItems = new Array();
          group.props.map((item, index) => {
            if (item.type === 'list') {
              item.items.forEach((element) => {
                listItems.push(element);
              });
            } else {
              baseItems.push(item);
            }
          });
          items = {
            name: value,
            label: group.label,
            base: baseItems,
            list: listItems,
          };
        }
      }
    }
    return items;
  };

  useEffect(() => {
    if (action == 'asset' && id != null && id.length > 0 && id != 'null') {
      //资产信息
      getAssetstypes().then((res) => {
        const types = res.dat.map((v) => {
          return {
            value: v.name,
            label: v.name,
            ...v,
          };
        });
        loadAssetInfo(id, types);
        setAssetTypes(types);
      });
    }
  }, [action]);

  useEffect(() => {
    getAssetBoard(id as string).then((res) => {
      setBoardId(res.dat.id.toString());
    });
  }, [id]);

  const loadAssetInfo = (id, assetTypes) => {
    getXhAsset('' + id).then(({ dat }) => {
      let typeGroup = new Array();
      let expands = dat.exps;
      if (assetTypes != null) {
        const assetType: any = assetTypes.find((v) => v.name === dat.type);
        if (assetType) {
          //TODO：处理分组属性
          let extra_props = assetType.extra_props;
          let map = new Map();
          for (let property in extra_props) {
            let group = extra_props[property];
            map.set(group.sort, property);
          }
          var arrayObj = Array.from(map);
          arrayObj.sort(function (a, b) {
            return a[0] - b[0];
          });
          for (var [key, value] of arrayObj) {
            let group = extra_props[value];
            if (group != null && group.props) {
              typeGroup.push({
                name: value,
                label: group.label,
              });
            }
          }
        }
      }
      let typeValues = {};
      if (expands != null && expands.length > 0) {
        const map = new Map();
        expands.forEach((item, index, arr) => {
          if (!map.has(item.config_category)) {
            map.set(
              item.config_category,
              arr.filter((a) => a.config_category == item.config_category),
            );
          }
        });
        //以上分组加载数据
        map.forEach(function (value, key) {
          const formDataMap = new Map();
          value.forEach((item, index, arr) => {
            if (!formDataMap.has(item.group_id)) {
              formDataMap.set(
                item.group_id,
                arr.filter((a) => a.group_id == item.group_id),
              );
            }
          });
          let group: any = [];
          formDataMap.forEach(function (value, i) {
            let itemsChars = '';
            value.forEach((item, index, arr) => {
              itemsChars += '"' + item.name + '":"' + item.value + '",';
            });
            itemsChars = '{' + itemsChars.substring(0, itemsChars.length - 1) + '}';
            group.push(JSON.parse(itemsChars));
          });
          typeValues[key] = group;
        });
        delete dat.exps;
      }
      let everyTypeValues = new Array();
      typeGroup.forEach((type) => {
        if (typeValues[type.name]) {
          everyTypeValues.push({
            type: type.name,
            label: type.label,
            items: typeValues[type.name],
          });
        }
      });
      setAssetItems(everyTypeValues);
      setAssetInfo(dat);
    });
  };

  return (
    <Form name='asset' form={form} layout='vertical'>
      <div className='view-form'>
        <div className='card-wrapper'>
          <Card {...panelBaseProps} title={'基本信息'}>
            <div className='asset_info'>
              <div className='image_name'>{assetInfo.manufacturers ? <img src={loadImages(assetInfo.manufacturers)}></img> : <div className='image_not'>没有厂商信息</div>}</div>
              <div className='info'>
                <div className='row'>
                  <div className='theme1'>
                    <div className='title'>资产名称：</div>
                    <Link
                      to={{
                        pathname: '/xh/monitor/add',
                        search: `type=monitor&asset_id=${assetInfo.id}&id=${assetInfo.id}&action=asset`,
                        hash: '#the-hash',
                      }}
                    >
                      {assetInfo.name}
                    </Link>
                  </div>
                  <div className='theme1'>
                    <div className='title'>资产类型：</div>
                    {assetInfo.type}
                  </div>
                  <div className='theme1'>
                    <div className='title'>IP地址: </div>
                    {assetInfo.ip}
                  </div>
                  <div className='theme1'>
                    <div className='title'>厂商：</div>
                    {assetInfo.manufacturers}
                  </div>
                </div>
                <div className='row'>
                  <div className='theme1'>
                    <div className='title'>资产位置：</div>
                    <span title={assetInfo.position}>{assetInfo.position}</span>
                  </div>
                  <div className='theme1'>
                    <div className='title'>运行状态：</div>
                    {assetInfo.health == 1 ? (
                      <Tag icon={<CheckCircleOutlined />} color='success'>
                        在线
                      </Tag>
                    ) : (
                      <Tag icon={<CloseCircleOutlined />} color='error'>
                        离线
                      </Tag>
                    )}
                  </div>
                  <div className='theme1'></div>
                  <div className='theme1'></div>
                </div>
              </div>
            </div>
            {assetItems != null && assetItems.length > 0 && (
              <div className='party_info'>
                <div
                  className='asset_item_ctr_button'
                  onClick={(e) => {
                    if (itemButton == '收起') {
                      localStorage.setItem('asset_item_ctr_button', '查看部件');
                      setItemButton('查看部件');
                    } else {
                      localStorage.setItem('asset_item_ctr_button', '收起');
                      setItemButton('收起');
                    }
                  }}
                >
                  {itemButton}
                </div>
                {itemButton == '收起' && (
                  <div className='party_show'>
                    {assetItems.length > 0 &&
                      assetItems.map((element, index) => {
                        return (
                          <div
                            className='assembly show_image'
                            key={`assetitem-${index}`}
                            onClick={(e) => {
                              let formItems: any = genForm(assetInfo.type, element.type);
                              setAccessoriesVisable(true);
                              setAccessories({
                                label: formItems.label,
                                title: element.label,
                                name: formItems.name,
                                items: element.items,
                                properties: formItems.list,
                              });
                            }}
                          >
                            <div className='title'>
                              {element.label}({element.items.length})
                            </div>
                            <div className={'image ' + element.type}></div>
                          </div>
                        );
                      })}
                  </div>
                )}
              </div>
            )}
          </Card>
        </div>
        <div className='card-wrapper'>
          <Board id={boardId}></Board>
        </div>
        <Modal
          visible={accessoriesVisable}
          title={accessories.title}
          destroyOnClose
          confirmLoading={false}
          className='accessories_modal'
          mask={true}
          width={360 * (accessories.items.length >= 4 ? 4 : accessories.items.length) + 'px'}
          onCancel={() => {
            setAccessoriesVisable(false);
          }}
        >
          <Space className='accessories_body'>
            {accessories.items.map((item, pos) => {
              return (
                <div className='accessories_every_group show_image' key={pos}>
                  <div className='title' style={{ fontWeight: '600' }}>
                    {accessories.label.toUpperCase()}({pos + 1})
                  </div>
                  <div className={'image ' + accessories.name} style={{ marginLeft: '30%' }}></div>
                  <div className='properties'>
                    {accessories.properties.map((property, index) => {
                      return (
                        <div className='accessories' key={index}>
                          <div className='title' title={property.label}>
                            {property.label}:
                          </div>
                          <div className='content' title={item[property.name]}>
                            {item[property.name] && item[property.name].slice(0, 40)}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </Space>
        </Modal>
      </div>
    </Form>
  );
}
