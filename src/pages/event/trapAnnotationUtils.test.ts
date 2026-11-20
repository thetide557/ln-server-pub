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

    const semiRes = parseTrapKvPairs('K1=V1;K2=V2_https://10.0.0.1:8443;K3=V3 Value;');
    expect(semiRes.hasKvStructure).toBe(true);
    expect(semiRes.pairs).toEqual([
      { key: 'K1', value: 'V1' },
      { key: 'K2', value: 'V2_https://10.0.0.1:8443' },
      { key: 'K3', value: 'V3 Value' },
    ]);

    const plainRes = parseTrapKvPairs('plain-non-kv-text');
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

  it('handles slimmed 16-key Trap format: keeps distinct 设备名称 & 设备IP, filters "-" placeholders, and splits ";" kv pairs', () => {
    const slimTrap = {
      设备名称: 'dev-node-01',
      设备IP: '10.10.0.10',
      trap来源IP: '10.10.0.1',
      告警流水号: '27401495',
      弹性IP名称: '-',
      门限值: '-',
      附加信息: 'K1=V1;K2=V2',
      扩展定位信息: 'K3=V3;K4=-',
      告警类型: '4 (业务质量告警)',
      源端告警级别: '2 (重要)',
      描述: '设备 dev-node-01 上报 4 (业务质量告警)（告警流水号 27401495，源端级别 2 (重要)）',
    };

    const rows = buildEventAnnotationRows(slimTrap);
    expect(rows).toEqual([
      { key: '设备名称', value: 'dev-node-01' },
      { key: '设备IP', value: '10.10.0.10' },
      { key: 'trap来源IP', value: '10.10.0.1' },
      { key: '告警流水号', value: '27401495' },
      { key: 'K1', value: 'V1' },
      { key: 'K2', value: 'V2' },
      { key: 'K3', value: 'V3' },
      { key: '告警类型', value: '4 (业务质量告警)' },
      { key: '源端告警级别', value: '2 (重要)' },
    ]);
  });

  it('preserves plain-text 附加信息 and non-redundant 描述, and leaves non-Trap annotations untouched', () => {
    const customTrap = {
      设备IP: '10.0.0.1',
      告警流水号: '10001',
      附加信息: 'raw-additional-note',
      描述: 'custom-note-text',
    };
    expect(buildEventAnnotationRows(customTrap)).toEqual([
      { key: '设备IP', value: '10.0.0.1' },
      { key: '告警流水号', value: '10001' },
      { key: '附加信息', value: 'raw-additional-note' },
      { key: '描述', value: 'custom-note-text' },
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
    expect(isRedundantTrapDescription('CPU > 90%')).toBe(false);
  });
});
