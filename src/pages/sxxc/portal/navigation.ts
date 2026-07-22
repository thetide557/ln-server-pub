export const ASSET_MONITOR_SCREEN_TITLE = '资产监控大屏';

const ASSET_MONITOR_SCREEN_CODE = 'bigScreen_p3UreLjhWD';
const ASSET_MONITOR_SCREEN_BASE_URL = '/dataroom/#/bigscreen/preview';

export function goAssetMonitorScreen() {
  window.location.href = `${ASSET_MONITOR_SCREEN_BASE_URL}?code=${ASSET_MONITOR_SCREEN_CODE}`;
}
