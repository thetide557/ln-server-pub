import React, { useEffect, useState } from 'react';
import { getBusiGroups } from '@/services/common';
import { getPlatformMetrics } from '@/services/sxxc/portal';
import './index.less';

interface OverviewState {
  duration: {
    days: number;
    hours: number;
    minutes: number;
  };
  assetOnlineRate: number;
  todayAlertTotal: number;
  workOrderCloseRate: number;
}

const defaultOverviewState: OverviewState = {
  duration: {
    days: 0,
    hours: 0,
    minutes: 0,
  },
  assetOnlineRate: 0,
  todayAlertTotal: 0,
  workOrderCloseRate: 0,
};

function getResponseData(response: any) {
  return response?.dat || response?.data || response || {};
}

function readValue(source: any, paths: string[]) {
  for (const path of paths) {
    const value = path.split('.').reduce((current, key) => current?.[key], source);
    if (value !== undefined && value !== null && value !== '') {
      return value;
    }
  }
  return undefined;
}

function toNumber(value: any, fallback = 0) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : fallback;
  if (typeof value === 'string') {
    const parsed = Number(value.replace('%', ''));
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  return fallback;
}

function normalizeMetricValue(value: number) {
  return String(Math.round(value)).padStart(3, '0');
}

function parseDurationText(value: string) {
  return {
    days: toNumber(value.match(/(\d+)\s*天/)?.[1]),
    hours: toNumber(value.match(/(\d+)\s*小时/)?.[1]),
    minutes: toNumber(value.match(/(\d+)\s*分钟/)?.[1]),
  };
}

function normalizeDuration(data: any) {
  const durationSource =
    readValue(data, ['duration', 'runtime', 'runTime', 'platformRuntime', 'platformRunTime']) || data;
  const durationSeconds = readValue(data, [
    'durationSeconds',
    'runtimeSeconds',
    'runTimeSeconds',
    'platformRunSeconds',
    'platformRuntimeSeconds',
  ]);

  if (durationSeconds !== undefined) {
    const seconds = Math.max(0, toNumber(durationSeconds));
    return {
      days: Math.floor(seconds / 86400),
      hours: Math.floor((seconds % 86400) / 3600),
      minutes: Math.floor((seconds % 3600) / 60),
    };
  }

  if (durationSource !== data && (typeof durationSource === 'number' || typeof durationSource === 'string')) {
    if (typeof durationSource === 'string' && /天|小时|分钟/.test(durationSource)) {
      return parseDurationText(durationSource);
    }

    const seconds = Math.max(0, toNumber(durationSource));
    return {
      days: Math.floor(seconds / 86400),
      hours: Math.floor((seconds % 86400) / 3600),
      minutes: Math.floor((seconds % 3600) / 60),
    };
  }

  return {
    days: toNumber(readValue(durationSource, ['days', 'day', 'runDays', 'runningDays', 'run_days'])),
    hours: toNumber(readValue(durationSource, ['hours', 'hour', 'runHours', 'runningHours', 'run_hours'])),
    minutes: toNumber(readValue(durationSource, ['minutes', 'minute', 'runMinutes', 'runningMinutes', 'run_minutes'])),
  };
}

function normalizeOverviewData(data: any): OverviewState {
  const metricData = data?.metrics || data?.platformMetrics || data;

  return {
    duration: normalizeDuration(metricData),
    assetOnlineRate: toNumber(
      readValue(metricData, [
        'assetOnlineRate',
        'assetsOnlineRate',
        'asset_online_rate',
        'onlineRate',
        'online_rate',
        'onlinePercent',
        'online_percentage',
        'assetOnlinePercent',
      ]),
    ),
    todayAlertTotal: toNumber(
      readValue(metricData, [
        'todayAlertTotal',
        'todayAlertCount',
        'todayAlarmTotal',
        'todayAlarmCount',
        'alertTotal',
        'alarmTotal',
        'todayAlerts',
        'todayAlarms',
        'today_alert_total',
        'today_alarm_total',
      ]),
    ),
    workOrderCloseRate: toNumber(
      readValue(metricData, [
        'workOrderCloseRate',
        'workOrderCompletionRate',
        'work_order_close_rate',
        'ticketCloseRate',
        'ticketCompletionRate',
        'orderCloseRate',
        'orderClosePercent',
        'workOrderFinishRate',
      ]),
    ),
  };
}

function getGroupIds(groups: any[]) {
  return groups
    .map((item) => item?.id || item?.busi_group || item?.group_id || item?.groupId)
    .filter((id) => id !== undefined && id !== null && id !== '')
    .join(',');
}

function DigitGroup({ value }: { value: string }) {
  return (
    <div className='portal-overview-digits'>
      {value.split('').map((char, index) => (
        <span
          key={`${value}-${index}`}
          className={`portal-overview-digit ${char === '0' ? 'is-zero' : ''}`}
        >
          {char}
        </span>
      ))}
    </div>
  );
}

export default function OperationsOverview() {
  const [overviewData, setOverviewData] = useState<OverviewState>(defaultOverviewState);

  useEffect(() => {
    let isMounted = true;

    getBusiGroups()
      .then((groupRes) => {
        const groupIds = getGroupIds(groupRes?.dat || []);
        return getPlatformMetrics(groupIds ? { groupIds } : undefined);
      })
      .then((metricsRes) => {
        if (!isMounted) return;
        setOverviewData(normalizeOverviewData(getResponseData(metricsRes)));
      })
      .catch(() => {
        if (!isMounted) return;
        setOverviewData(defaultOverviewState);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const durationItems = [
    { value: String(overviewData.duration.days).padStart(2, '0'), unit: '天' },
    { value: String(overviewData.duration.hours).padStart(2, '0'), unit: '小时' },
    { value: String(overviewData.duration.minutes).padStart(2, '0'), unit: '分钟' },
  ];

  const overviewStats = [
    { label: '资产在线率(%)', value: normalizeMetricValue(overviewData.assetOnlineRate) },
    { label: '今日告警总数', value: normalizeMetricValue(overviewData.todayAlertTotal) },
    { label: '工单办结率(%)', value: normalizeMetricValue(overviewData.workOrderCloseRate) },
  ];

  return (
    <div className='portal-overview'>
      <div className='portal-section-header'>
        <span className='portal-section-title'>运维监控总览</span>
      </div>

      <div className='portal-overview-runtime'>
        <div className='portal-overview-runtime-inner'>
          <span className='portal-overview-runtime-label'>平台运行时长</span>
          <div className='portal-overview-runtime-values'>
            {durationItems.map((item) => (
              <span key={item.unit} className='portal-overview-runtime-item'>
                <span className='portal-overview-runtime-number'>{item.value}</span>
                <span className='portal-overview-runtime-unit'>{item.unit}</span>
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className='portal-overview-metrics'>
        {overviewStats.map((item) => (
          <div key={item.label} className='portal-overview-metric'>
            <DigitGroup value={item.value} />
            <div className='portal-overview-metric-label'>{item.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
