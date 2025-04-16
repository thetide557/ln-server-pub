import React, { useEffect, useState, useRef } from "react";
import { Modal, message, Select, Tooltip } from "antd";
import { CloseOutlined } from "@ant-design/icons";
import {
  getAlertEventsById,
  getHistoryEventsById,
  getWarningChart,
  setAlartMutes,
  updataprocess,
} from "@/pages/sxxc/screenView/alarmApi";
import "./index.less";
import AlarmChartLine from "@/pages/sxxc/screenView/alarmChartLine";

const WarnModal = (props) => {
  const { alertId, visible, onClose } = props;
  const [curWarn, setCurWarn] = useState<any>({});
  const [open1, setOpen1] = useState(false);
  const timeLensDefault = [
    {
      label: "1h",
      value: 3600,
    },
    {
      label: "2h",
      value: 7200,
    },
    {
      label: "3h",
      value: 10800,
    },
    {
      label: "6h",
      value: 21600,
    },
    {
      label: "12h",
      value: 43200,
    },
    {
      label: "1d",
      value: 86400,
    },
    {
      label: "2d",
      value: 172800,
    },
    {
      label: "3d",
      value: 259200,
    },
    {
      label: "5d",
      value: 432000,
    },
    {
      label: "7d",
      value: 604800,
    },
    {
      label: "14d",
      value: 1209600,
    },
    {
      label: "30d",
      value: 2592000,
    },
    {
      label: "60d",
      value: 5184000,
    },
    {
      label: "90d",
      value: 7776000,
    },
    {
      label: "99y",
      value: 3122064000,
    },
  ];
  const [query1, setQuery1] = useState("");

  // 屏蔽时长
  let time1 = 3600;
  const handleAlarm = () => {
    setCurWarn({});
    getAlertEventsById(alertId)
      .then((res) => {
        // console.log(1111, res.dat);
        setCurWarn(res.dat);
        let query = "";
        if (
          res.dat.rule_replay &&
          res.dat.rule_replay.queries &&
          res.dat.rule_replay.queries.length > 0
        ) {
          query = res.dat.rule_replay.queries[0].prom_ql.replace(
            /\$asset_id/g,
            res.dat.asset_id
          );
          setQuery1(query);
        } else {
          query = res.dat.rule_config.queries[0].prom_ql;
          setQuery1(query);
        }
      })
      .catch((_) => onClose());
  };

  // 小数位数判断
  const getDecimalPlaces = (num) => {
    // 将数字转换为字符串
    const numStr = num.toString();

    // 查找小数点的位置
    const decimalIndex = numStr.indexOf(".");

    // 如果小数点不存在，返回0
    if (decimalIndex === -1) {
      return 0;
    }

    // 返回小数点后的字符长度
    return numStr.substring(decimalIndex + 1).length;
  };

  // 处理
  const handleDeal = () => {
    Modal.confirm({
      title: "提示",
      content: "该告警是否已被处理?",
      keyboard: false,
      className: "handle-warn",
      centered: true,
      closable: true,
      onOk() {
        const params = {
          id: alertId,
        };
        updataprocess(params).then(() => {
          message.success("处理成功");
          handleAlarm();
        });
      },
      onCancel() {
        // console.log('Cancel');
      },
    });
  };

  // 屏蔽
  const handlePb = () => {
    setOpen1(true);
  };

  // 时间戳转换时间
  const convertTime = (timestamp, type) => {
    if (!timestamp) return "";
    const date = new Date(parseInt(timestamp) * 1000);
    const Year = date.getFullYear();
    const Moth =
      date.getMonth() + 1 < 10
        ? "0" + (date.getMonth() + 1)
        : date.getMonth() + 1;
    const Day = date.getDate() < 10 ? "0" + date.getDate() : date.getDate();
    const Hour = date.getHours() < 10 ? "0" + date.getHours() : date.getHours();
    const Minute =
      date.getMinutes() < 10 ? "0" + date.getMinutes() : date.getMinutes();
    const Sechond =
      date.getSeconds() < 10 ? "0" + date.getSeconds() : date.getSeconds();
    if (type == "year") {
      return `${Year}-${Moth}-${Day} ${Hour}:${Minute}:${Sechond}`;
    } else {
      return `${Hour}:${Minute}`;
    }
  };

  const handleChange = (val) => {
    // console.log(val);
    time1 = val;
    // console.log(time1);
  };

  // 告警屏蔽
  const saveWarnig = () => {
    // console.log(111, curWarn);
    const timestamp = Math.floor(new Date().getTime() / 1000);
    let tags: any = [];
    if (curWarn.tags.length > 0) {
      curWarn.tags.forEach((item) => {
        let arr = item.split("=");
        tags.push({
          func: "==",
          key: arr[0],
          value: arr[1],
        });
      });
    }
    const params = {
      note: curWarn.rule_name + timestamp,
      group_id: curWarn.group_id,
      prod: curWarn.rule_prod,
      cate: curWarn.cate,
      datasource_ids: [curWarn.datasource_id],
      severities: [curWarn.severity],
      mute_time_type: 0,
      btime: timestamp,
      etime: timestamp + Number(time1),
      periodic_mutes: [
        {
          enable_days_of_week: "1 2 3 4 5 6 0",
          enable_stime: "00:00",
          enable_etime: "00:00",
        },
      ],
      cluster: curWarn.cluster,
      tags,
    };
    setAlartMutes(params, curWarn.group_id).then((res) => {
      setOpen1(false);
      message.success("屏蔽成功");
    });
  };

  useEffect(() => {
    if (visible) {
      handleAlarm();
    }
  }, [visible]);

  return (
    <>
      {/* 大屏告警弹窗 */}
      <Modal
        className="warn-dialog"
        width={850}
        visible={visible}
        destroyOnClose
        footer={null}
      >
        <div className="warn-header">
          <CloseOutlined
            className="el-icon-close"
            onClick={() => {
              onClose();
            }}
          />
        </div>
        <div className="warn-cont">
          <div className="asset1">
            <div className="row t-row">
              <div className="col col1">
                <div>告警规则名称：</div>
                <Tooltip
                  placement="bottom"
                  title={curWarn.rule_name}
                  color="#fff"
                  overlayInnerStyle={{ color: "#000" }}
                >
                  <div className="w-title">{curWarn.rule_name}</div>
                </Tooltip>
              </div>
              {curWarn.id && (
                <div className="col2">
                  {curWarn.processe == 1 ? (
                    <div>已处理</div>
                  ) : (
                    <div onClick={handleDeal}>是否已处理</div>
                  )}
                  <div onClick={handlePb}>屏蔽</div>
                </div>
              )}
            </div>
            {curWarn.asset_id ? (
              <div className="row">
                <div className="col col-zc">
                  <img className="dian" src="/image/alarm/dian.png" alt="" />
                  <span>资产名称：{curWarn.asset_name}</span>
                </div>
              </div>
            ) : null}
            <div className="row">
              {curWarn.asset_id ? (
                <div className="col">
                  <img className="dian" src="/image/alarm/dian.png" alt="" />
                  <span>IP地址：{curWarn.asset_ip}</span>
                </div>
              ) : null}
              <div className="col">
                <img className="dian" src="/image/alarm/dian.png" alt="" />
                <span>告警ID：{curWarn.id}</span>
              </div>
            </div>
            <div className="row">
              <div className="col">
                <img className="dian" src="/image/alarm/dian.png" alt="" />
                <div className="serverity">
                  <span>告警级别：</span>
                  <div className="s-img">
                    {curWarn.severity && (
                      <img
                        src={`/image/alarm/s${curWarn.severity}.png`}
                        alt=""
                      />
                    )}
                  </div>
                </div>
              </div>
              <div className="col">
                <img className="dian" src="/image/alarm/dian.png" alt="" />
                <span>
                  触发时间：{convertTime(curWarn.trigger_time, "year")}
                </span>
              </div>
            </div>
            <div className="row">
              <div className="col">
                <img className="dian" src="/image/alarm/dian.png" alt="" />
                <span>
                  触发值：
                  {getDecimalPlaces(Number(curWarn.trigger_value)) > 3
                    ? Number(curWarn.trigger_value).toFixed(3)
                    : curWarn.trigger_value}
                </span>
              </div>
              <div className="col">
                <img className="dian" src="/image/alarm/dian.png" alt="" />
                <span>
                  告警状态：
                  <span
                    style={{
                      color: curWarn.is_recovered ? "#39E9A4" : "#F26464",
                    }}
                  >
                    {curWarn.is_recovered == 1
                      ? "已恢复"
                      : curWarn.is_recovered == 0
                      ? "未恢复"
                      : ""}
                  </span>
                </span>
              </div>
            </div>
            <div className="row last-row">
              <div className="col last-col1">
                <img className="dian" src="/image/alarm/dian.png" alt="" />
                <div className="last-title">
                  <span>回放PromQL： </span>
                  <Tooltip
                    placement="bottom"
                    title={query1}
                    color="#fff"
                    overlayInnerStyle={{ color: "#000" }}
                  >
                    <span className="reproml">{query1}</span>
                  </Tooltip>
                </div>
              </div>
              <div className="col">
                <img className="dian" src="/image/alarm/dian.png" alt="" />
                <span>
                  处理状态：{" "}
                  {curWarn.processe == 1
                    ? "已处理"
                    : curWarn.processe == 0
                    ? "未处理"
                    : ""}
                </span>
              </div>
            </div>
          </div>
          <div className="chart1">
            {curWarn.id && <AlarmChartLine curWarn={curWarn} />}
          </div>
        </div>
        {/* 屏蔽 */}
        <Modal
          className="warn-dialog warn-dialog1"
          visible={open1}
          footer={null}
        >
          <div className="header">
            <CloseOutlined
              className="el-icon-close"
              onClick={() => {
                setOpen1(false);
              }}
            />
          </div>
          <div className="icont">
            <span style={{ marginRight: "10px", fontSize: "18px" }}>
              屏蔽时长：
            </span>
            <Select
              dropdownClassName="warn-sel"
              className="alarm-select"
              defaultValue={3600}
              style={{ width: 200 }}
              onChange={handleChange}
              options={timeLensDefault}
            />
          </div>
          <div className="dialog-footer">
            <div onClick={() => setOpen1(false)}>取 消</div>
            <div onClick={saveWarnig}>确 定</div>
          </div>
        </Modal>
      </Modal>
    </>
  );
};

export default WarnModal;
