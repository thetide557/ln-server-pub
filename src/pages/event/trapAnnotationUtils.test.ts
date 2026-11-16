import {
  buildEventAnnotationRows,
  isHuaweiTrapAnnotations,
  isRedundantTrapDescription,
  parseTrapKvPairs,
} from './trapAnnotationUtils';

describe('trapAnnotationUtils SRE deduplication and dynamic kv splitting', () => {
  it('parses comma and semicolon delimited key=value pairs without splitting ordinary commas inside values', () => {
    const commaRes = parseTrapKvPairs(
      '门限值=出网带宽使用率 >= 75, 当前值=83.07, 阈值规则名称=[预置]FusionSphere, OpenStack带宽规则',
    );
    expect(commaRes.hasKvStructure).toBe(true);
    expect(commaRes.pairs).toEqual([
      { key: '门限值', value: '出网带宽使用率 >= 75' },
      { key: '当前值', value: '83.07' },
      { key: '阈值规则名称', value: '[预置]FusionSphere, OpenStack带宽规则' },
    ]);

    const semiRes = parseTrapKvPairs(
      'Key=391519_https://172.18.8.149:26335;ServiceName=ManageOne;MicroServiceName=MOA Console Website;',
    );
    expect(semiRes.hasKvStructure).toBe(true);
    expect(semiRes.pairs).toEqual([
      { key: 'Key', value: '391519_https://172.18.8.149:26335' },
      { key: 'ServiceName', value: 'ManageOne' },
      { key: 'MicroServiceName', value: 'MOA Console Website' },
    ]);

    const plainRes = parseTrapKvPairs('证书将于 7 天后过期，请及时更换');
    expect(plainRes.hasKvStructure).toBe(false);
    expect(plainRes.pairs).toEqual([]);
  });

  it('deduplicates legacy event 141171 annotations: merges identical 设备名称/设备IP, deduplicates synonyms, drops raw kv strings and redundant 描述', () => {
    const event141171 = {
      设备名称: '61.185.218.225',
      设备IP: '61.185.218.225',
      trap来源IP: '20.25.224.12',
      告警流水号: '29387997',
      所属区域: '陕西国资云_互联网区',
      弹性IP名称: '61.185.218.225',
      弹性IPID: 'AF2184B0EFC13709B539C33DB6CEF111',
      阈值规则名称: '[预置]FusionSphere OpenStack_1.0_出网带宽使用率阈值规则',
      门限值: '出网带宽使用率 >= 75',
      触发当前值: '83.07',
      附加信息: '门限值=出网带宽使用率 >= 75, 当前值=83.07, 阈值规则名称=[预置]FusionSphere OpenStack_1.0_出网带宽使用率阈值规则',
      扩展定位信息:
        '区域=陕西国资云_互联网区, 弹性IP名称=61.185.218.225, 弹性IPID=AF2184B0EFC13709B539C33DB6CEF111, IP地址=61.185.218.225',
      告警类型: '1 (通信告警)',
      源端告警级别: '1 (紧急)',
      源端确认状态: '0 (未确认)',
      设备自报时间: '2026-11-16 01:28:50',
      Trap接收时间: '2026-11-16 09:28:50',
      '告警ID(整型)': '-1',
      'Trap OID': '1.3.6.1.4.1.2011.2.15.2.4.3.3.0.1',
      SNMP引擎ID: '80001370011419e00c',
      SNMP版本: '3',
      描述: '设备 61.185.218.225（区域：陕西国资云_互联网区）上报 1 (通信告警)，告警流水号 29387997，源端级别 1 (紧急)；门限值=出网带宽使用率 >= 75。',
    };

    const rows = buildEventAnnotationRows(event141171);
    const keys = rows.map((r) => r.key);

    expect(keys).not.toContain('设备名称');
    expect(keys[0]).toBe('设备IP');
    expect(keys).not.toContain('附加信息');
    expect(keys).not.toContain('扩展定位信息');
    expect(keys).not.toContain('区域');
    expect(keys).not.toContain('当前值');
    expect(keys).not.toContain('描述');
    // 动态拆出的新键 IP地址 排在 告警流水号 之后、告警类型 之前
    expect(keys).toContain('IP地址');
    expect(keys.indexOf('IP地址')).toBeGreaterThan(keys.indexOf('告警流水号'));
    expect(keys.indexOf('IP地址')).toBeLessThan(keys.indexOf('告警类型'));
  });

  it('handles slimmed 55B ManageOne service Trap: keeps distinct 设备名称 & 设备IP, filters "-" placeholders, splits ";" kv, and keeps 可能原因/修复建议', () => {
    const serviceTrap = {
      设备名称: 'ManageOne',
      设备IP: '172.18.8.149',
      trap来源IP: '172.18.0.155',
      告警流水号: '29387998',
      弹性IP名称: '-',
      门限值: '-',
      附加信息: 'Key=391519_https://172.18.8.149:26335;ServiceName=ManageOne;MicroServiceName=MOA Console Website',
      扩展定位信息: 'region=sa-fb-1',
      告警类型: '2 (设备告警)',
      源端告警级别: '2 (重要)',
      可能原因: '证书文件已过期或即将过期。',
      修复建议: '登录ManageOne维护面更换证书。',
      描述: '设备 ManageOne 上报 2 (设备告警)（告警流水号 29387998，源端级别 2 (重要)）',
    };

    const rows = buildEventAnnotationRows(serviceTrap);
    expect(rows).toEqual([
      { key: '设备名称', value: 'ManageOne' },
      { key: '设备IP', value: '172.18.8.149' },
      { key: 'trap来源IP', value: '172.18.0.155' },
      { key: '告警流水号', value: '29387998' },
      { key: 'Key', value: '391519_https://172.18.8.149:26335' },
      { key: 'ServiceName', value: 'ManageOne' },
      { key: 'MicroServiceName', value: 'MOA Console Website' },
      { key: 'region', value: 'sa-fb-1' },
      { key: '告警类型', value: '2 (设备告警)' },
      { key: '源端告警级别', value: '2 (重要)' },
      { key: '可能原因', value: '证书文件已过期或即将过期。' },
      { key: '修复建议', value: '登录ManageOne维护面更换证书。' },
    ]);
  });

  it('preserves plain-text 附加信息 and genuine non-redundant 描述, and leaves non-Trap annotations untouched', () => {
    const customTrap = {
      设备IP: '10.0.0.1',
      告警流水号: '10001',
      附加信息: '远端光模块收光功率偏低告警说明',
      描述: '光衰超过阈值，请检查尾纤弯曲半径。',
    };
    expect(buildEventAnnotationRows(customTrap)).toEqual([
      { key: '设备IP', value: '10.0.0.1' },
      { key: '告警流水号', value: '10001' },
      { key: '附加信息', value: '远端光模块收光功率偏低告警说明' },
      { key: '描述', value: '光衰超过阈值，请检查尾纤弯曲半径。' },
    ]);

    const normalPromEvent = {
      原末尾属性: '原末尾属性值',
      空属性: '-',
    };
    expect(isHuaweiTrapAnnotations(normalPromEvent)).toBe(false);
    expect(buildEventAnnotationRows(normalPromEvent)).toEqual([
      { key: '原末尾属性', value: '原末尾属性值' },
      { key: '空属性', value: '-' },
    ]);
    expect(isRedundantTrapDescription('设备 1.1.1.1 上报 通信告警')).toBe(true);
    expect(isRedundantTrapDescription('CPU 使用率持续高于 90%')).toBe(false);
  });
});
