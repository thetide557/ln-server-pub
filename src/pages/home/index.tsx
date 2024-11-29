import { Col, Row } from 'antd';
import React, { useEffect, useState } from 'react';
import './index.less';
import RingGraph from "@/components/Echart/ringGraph"
import AssetMonitoring from "@/components/Echart/assetMonitoring"
import OverallProcess from "@/components/Echart/overallProcess"
import Alarm7day from "@/components/Echart/alarm7day"
import CpuTop10 from "@/components/Echart/cpuTop10"
import StoreTop10 from "@/components/Echart/storeTop10"
import AssetdistributionStatus from "@/components/Echart/assetdistributionStatus"
import NetworkNodePing from "@/components/Echart/networkNodePing"
import ServiceTcp from "@/components/Echart/serviceTcp"
import { listApiService } from '@/services/api_service';
export default function index() {
  const [items, setItems] = useState([]);
  useEffect(() => {
    let isMounted = true;
    const getData = (() => {
      listApiService().then((res) => {
        setItems(res.dat.list);
      }).catch(error => {
        console.error('Fetch error:', error);
      });
    })
    getData()
    return () => {
      isMounted = false;
    };
  }, []);
  return (
    <div className="container">
      <Row gutter={16}>
        <Col span={9}>
          <div className='card'>
            <div className='card-title'>资产健康度</div>
            {
              items.length && (
                <RingGraph id={items.filter(x => x.name == '资产健康度')[0].id}></RingGraph>
              )
            }
          </div>
        </Col>
        <Col span={6}>
          <div className='card'>
            <div className='card-title'>资产监控状态</div>
            {
              items.length && (
                <AssetMonitoring id={items.filter(x => x.name == '资产监控状态')[0].id}></AssetMonitoring>
              )
            }
          </div>
        </Col>
        <Col span={9}>
          <div className='card'>
            <div className='card-title'>总进程数</div>
            <OverallProcess></OverallProcess>
          </div>
        </Col>
      </Row>
      <Row gutter={16} style={{ marginTop: '1rem', marginBottom: '1rem' }}>
        <Col span={6}>
          <div className='card'>
            <div className='card-title'>近7日告警趋势</div>
            {
              items.length && (
                <Alarm7day id={items.filter(x => x.name == '7日内告警统计')[0].id}></Alarm7day>
              )
            }
          </div>
        </Col>
        <Col span={6}>
          <div className='card'>
            <div className='card-title'>服务器CPU利用率Top10</div>
            <CpuTop10></CpuTop10>
          </div>
        </Col>
        <Col span={6}>
          <div className='card'>
            <div className='card-title'>服务器内存利用率Top10</div>
            <StoreTop10></StoreTop10>
          </div>
        </Col>
        <Col span={6}>
          <div className='card'>
            <div className='card-title'>资产分布状态</div>
            <AssetdistributionStatus></AssetdistributionStatus>
          </div>
        </Col>
      </Row>
      <Row gutter={16}>
        <Col span={12}>
          <div className='card'>
            <div className='card-title'>网络节点ping测(单位:ms)</div>
            <NetworkNodePing></NetworkNodePing>
          </div>
        </Col>
        <Col span={12}>
          <div className='card'>
            <div className='card-title'>服务器TCP连接数</div>
            <ServiceTcp></ServiceTcp>
          </div>
        </Col>
      </Row>
    </div>
  )
}
