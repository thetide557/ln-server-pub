import React, { useEffect, useState, useRef } from "react";
import { Modal, message, Select, Tooltip, Input, Collapse, Divider } from "antd";
import { CloseOutlined, DownOutlined, UpOutlined, SyncOutlined, PauseCircleOutlined } from "@ant-design/icons";
import {
  getAlertEventsById,
  getHistoryEventsById,
  getWarningChart,
  setAlartMutes,
  updataprocess,
} from "@/pages/sxxc/screenView/alarmApi";
import "./index.less";
import AlarmChartLine from "@/pages/sxxc/screenView/alarmChartLine";
import { getRuleSolution, getFeedbacks } from "@/services/warning";
import { marked } from "marked";
import _ from "lodash";
import LoadingDots from "@/pages/sxxc/aiRobot/loading";

const WarnModal = (props) => {
  const { Panel } = Collapse;
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

  // ai
  const [show, setShow] = useState<boolean>(false);
  const [solutions, setSolutions] = useState<any>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [detail, setDetail] = useState<any>({});
  const [loading, setLoading] = useState<boolean>(false);
  const [query, setQuery] = useState<string>("");
  const [aiMessages, setAiMessages] = useState<any>({});
  // 停止传任务id
  const [taskId, setTaskId] = useState<any>(undefined);
  // 点赞功能传messageId
  const [messageId, setMessageId] = useState<any>(undefined);
  // 终止请求
  const [controller, setController] = useState(new AbortController());
  // 请求成功与失败状态
  const [success, setSuccess] = useState(false);
  const [feedback, setFeedback] = useState<any>(undefined);
  let flag = false;

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

  const getSolutions = () => {
    getRuleSolution(curWarn.rule_id).then((res) => {
      const arr = res.dat.slice(0, 3);
      arr.forEach((item: any) => {
        if (item.keywords) {
          item.keywords = item.keywords.split("、");
        }
      });
      // console.log(arr);
      setSolutions(arr);
    });
  };

  const handleDetail = (item: any) => {
    setIsModalOpen(true);
    setDetail(item);
  };

  const handleBtn = (item: any, flag1: boolean, type: string) => {
    getFeedbacks(flag1, item.id).then((_res) => {
      message.success("操作成功");
      // if (type === "card") {
      getSolutions();
      // }
    });
  };

  // fetch请求超时
  const fetchWithTimeout = (url, options = {}, timeout = 60000) => {
    const fetchPromise = fetch(url, { ...options, signal: controller.signal });
    const timeoutId = setTimeout(() => {
      flag = true;
      controller?.abort();
      setLoading(false);
    }, timeout);

    return fetchPromise.finally(() => clearTimeout(timeoutId));
  };

  const processChunk = (chunk) => {
    // console.log("chunk", chunk);
    if (!chunk) return ""; // 处理空 chunk 的情况
    const lines = chunk.split("\n");
    let answers = "";
    // console.log("lines", lines);
    lines.forEach((line) => {
      if (line.startsWith("data:")) {
        const answer = line.slice(5); // 移除 data: 前缀
        try {
          const parsedAnswer = JSON.parse(answer);
          if (parsedAnswer?.task_id) {
            setTaskId(parsedAnswer.task_id);
          }
          if (parsedAnswer?.message_id) {
            setMessageId(parsedAnswer.message_id);
          }
          if (parsedAnswer?.answer) {
            answers = parsedAnswer.answer;
          }
        } catch (error) {
          console.error("Failed to parse answer:", error);
        }
      }
    });

    return answers;
  };

  const handleSearch = async (value: string) => {
    if (!value && !loading) {
      return setAiMessages({ text: "", sender: "ai" });
    }
    if (value.trim() && !loading) {
      setTaskId(undefined);
      setMessageId(undefined);
      setFeedback(undefined);
      setAiMessages({ text: "", sender: "ai" });
      setQuery(value);
      try {
        let aiStr = "";
        // 构造请求数据
        const data = {
          inputs: { 角色: "羚牛一体化运维平台助手" },
          query: `${value.trim()}`,
          user: localStorage.getItem("username"),
          response_mode: "streaming", // 流式响应模式
        };
        // 设置加载状态为true
        setLoading(true);
        // 发送AI请求
        const response: any = await fetchWithTimeout(
          "/v1/chat-messages",
          {
            method: "POST",
            headers: {
              "Content-type": "application/json",
              Authorization: `Bearer ${localStorage.getItem("deepseek_token")}`,
            },
            body: JSON.stringify(data),
          },
          60000
        );

        // 处理请求失败的情况
        if (!response.ok) {
          setLoading(false);
          setSuccess(false);
          throw new Error(`HTTP error! Status: ${response.status}`);
        }

        // 读取流式响应
        const reader = response.body.getReader();
        setSuccess(true);
        /**
         * 读取流式响应的递归函数
         *
         * 该函数会不断读取流式响应的数据块，并更新AI消息列表。如果流式响应结束或发生错误，会进行相应的处理。
         */
        async function readStream() {
          try {
            const { done, value } = await reader.read();
            // 如果流式响应结束，设置加载状态为false
            if (done) {
              console.log("Streaming finished.");
              setLoading(false);
              return;
            }
            // 解码数据块并处理
            const textDecoder = new TextDecoder("utf-8");
            const chunkText = textDecoder.decode(value, { stream: true });
            let str1 = processChunk(chunkText);
            aiStr += str1;
            // console.log("aiStr", aiStr);
            // 检查是否包含think标签
            const thinkRegex = /<think>(.*?)<\/think>(.*)/s;
            const match = aiStr.match(thinkRegex);
            if (match) {
              // 如果包含think标签，分别处理think标签内外的内容
              const thinkContent = match[1].trim();
              const afterThinkContent = match[2].trim();
              // console.log("think标签中的内容:", thinkContent);
              // console.log("think标签后的内容:", afterThinkContent);
              setAiMessages({
                text: marked(aiStr),
                sender: "ai",
                thinkContent: marked(thinkContent),
                afterThinkContent: marked(afterThinkContent),
              });
            } else {
              // console.log("未找到think标签");
              // 如果不包含think标签，直接更新AI消息列表
              setAiMessages({ text: marked(aiStr), sender: "ai" });
            }
            // 继续读取流式响应
            readStream();
          } catch (error: any) {
            // 处理流式响应中的错误
            if (error.name === "AbortError") {
              setAiMessages({ text: " ", sender: "ai" });
              console.log("流式请求已中止");
            } else {
              console.error("Error streaming AI text:", error);
            }
            setLoading(false);
          }
        }
        readStream();
      } catch (error: any) {
        setSuccess(false);
        setLoading(false);
        // 处理请求中的错误
        if (error.name === "AbortError") {
          if (flag) {
            console.log("请求超时");
            setAiMessages({ text: "访问超时", sender: "ai" });
            setController(new AbortController());
          } else {
            console.log("请求已中止");
            setAiMessages({ text: " ", sender: "ai" });
          }
        } else {
          setAiMessages({ text: "访问超时", sender: "ai" });
          console.error("Error streaming AI text:", error);
        }
      }
    }
  };

  const stopAi = () => {
    if (!loading) return;
    // 更新全局状态，停止任务执行
    flag = false;
    console.log("taskId", taskId);
    // 如果存在 taskId，向服务器发送停止任务的请求
    if (taskId) {
      const data = { user: localStorage.getItem("username") };
      fetchWithTimeout(
        `/v1/chat-messages/${taskId}/stop`,
        {
          method: "POST",
          headers: {
            "Content-type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("deepseek_token")}`,
          },
          body: JSON.stringify(data),
        },
        60000
      ).then((response) => {
        console.log("任务已停止");
        setLoading(false);
      });
    } else {
      // 如果不存在 taskId，中止当前请求并重新创建 AbortController
      if (controller) {
        controller.abort();
        setController(new AbortController());
        console.log("终止");
      }
    }
  };

  const refreshAi = () => {
    handleSearch(query);
  };

  const searchBtn = (flag1: string) => {
    if (messageId) {
      const data = { user: localStorage.getItem("username"), rating: flag1 };
      fetchWithTimeout(
        `/v1/messages/${messageId}/feedbacks`,
        {
          method: "POST",
          headers: {
            "Content-type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("deepseek_token")}`,
          },
          body: JSON.stringify(data),
        },
        60000
      ).then((response) => {
        flag1 === "like" ? setFeedback("like") : setFeedback("dislike");
        message.success("操作成功");
      });
    }
  };

  useEffect(() => {
    if (visible) {
      handleAlarm();
    }
  }, [visible]);

  // useEffect(() => {
  //   if (curWarn.rule_id) {
  //     getSolutions();
  //   }
  // }, [curWarn.rule_id]);

  useEffect(() => {
    // 清理函数，确保在组件卸载时取消请求
    return () => {
      controller.abort();
    };
  }, []);

  return (
    <>
      {/* 大屏告警弹窗 */}
      {curWarn.id && <Modal
        className="warn-dialog"
        width={850}
        visible={visible}
        destroyOnClose
        footer={null}
      >
        <div className="warn-header">
          <img src="/image/alarm/title1.png" alt="" />
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
                <div className="rule-title">告警规则名称：</div>
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
                  <div className="pb-btn" onClick={handlePb}>屏蔽</div>
                  {curWarn.processe == 1 ? (
                    <div>已处理</div>
                  ) : (
                    <div onClick={handleDeal}>是否已处理</div>
                  )}
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
                {/* <span>
                  发生时间：{convertTime(curWarn.trigger_time, "year")}
                </span> */}
              </div>
            </div>
            <div className="row">
              <div className="col">
                <img className="dian" src="/image/alarm/dian.png" alt="" />
                <span>首次告警时间：{convertTime(curWarn.first_trigger_time, "year")}</span>
              </div>
              <div className="col">
                <img className="dian" src="/image/alarm/dian.png" alt="" />
                <span>
                  触发值：
                  {getDecimalPlaces(Number(curWarn.trigger_value)) > 2
                    ? Number(curWarn.trigger_value).toFixed(2)
                    : curWarn.trigger_value}
                </span>
              </div>
            </div>
            <div className="row last-row">
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
              {/* <div className="col">
                <img className="dian" src="/image/alarm/dian.png" alt="" />
                <span>
                  处理状态：
                  <span
                    style={{
                      color: curWarn.processe ? "#39E9A4" : "#F26464",
                    }}
                  >
                    {curWarn.processe == 1
                      ? "已处理"
                      : curWarn.processe == 0
                        ? "未处理"
                        : ""}
                  </span>
                </span>
              </div> */}
            </div>
          </div>
          <div className="chart1">
            {curWarn.id && <AlarmChartLine curWarn={curWarn} />}
          </div>

          {/* 解决方案 */}
          {/* <div className="warn-solution asset1">
            <div className="line"></div>
            <div className="row t-row solution-title">
              <div className="col col1">
                <div className="rule-title">解决方案推荐</div>
                <div className="solution-des">内容由 AI 生成，请仔细甄别</div>
              </div>

              <div className="solution-show" onClick={() => setShow(!show)}>
                {!show ? (
                  <div>
                    <span className="solution-show-text">展开</span>
                    <DownOutlined className="solution-show-icon" />
                  </div>
                ) : (
                  <div>
                    <span className="solution-show-text">收起</span>
                    <UpOutlined className="solution-show-icon" />
                  </div>
                )}
              </div>
            </div>
            <div className="line line1"></div>
            {
              show && (
                <>
                  <div className="solution-card">
                    {_.map(solutions, (item, index) => {
                      return (
                        <div className="solution-card-item" key={index}>
                          <div className="solution-card-item-title">{item.title}</div>
                          <div className="solution-card-item-wrap">
                            <div className="solution-keywords">
                              {_.map(item.keywords, (keyWord, index1) => {
                                return (
                                  <div className="solution-keyword" key={index1}>
                                    {keyWord}
                                  </div>
                                );
                              })}
                            </div>

                            <div className="solution-card-item-content">
                              简介：{item.introduction}
                            </div>
                          </div>
                          <div className="solution-card-item-btn">
                            <div className="btn-left">
                              <div className="btn-left-icon">
                                <img
                                  title="喜欢"
                                  src="/image/alarm/good1.png"
                                  alt=""
                                  onClick={() => handleBtn(item, true, "card")}
                                />
                                <img
                                  title="不喜欢"
                                  src="/image/alarm/bad1.png"
                                  alt=""
                                  onClick={() => handleBtn(item, false, "card")}
                                />
                              </div>
                            </div>
                            <div
                              className="btn-right"
                              onClick={() => handleDetail(item)}
                            >
                              查看详情
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="solution-search">
                    <div className="solution-search-input">
                      <Input.Search
                        className="solution-input"
                        placeholder="搜索更多解决方案"
                        // allowClear
                        onSearch={handleSearch}
                      // onPressEnter={(e) => {
                      //   setQuery(e.currentTarget.value);
                      // }}
                      />
                    </div>
                    <div className="solution-search-des">
                      <div className="l-des">内容由 AI 生成，请仔细甄别</div>
                      <div className="r-des">
                        {messageId && !loading && !feedback && (
                          <>
                            <img
                              title="喜欢"
                              src="/image/alarm/good1.png"
                              alt=""
                              onClick={() => searchBtn("like")}
                            />
                            <img
                              title="不喜欢"
                              src="/image/alarm/bad1.png"
                              alt=""
                              onClick={() => searchBtn("dislike")}
                            />
                          </>
                        )}
                        {feedback === "like" ? (
                          <img title="喜欢" src="/image/alarm/good2.png" alt="" />
                        ) : feedback === "dislike" ? (
                          <img title="不喜欢" src="/image/alarm/bad2.png" alt="" />
                        ) : (
                          ""
                        )}
                        {messageId && !loading && (
                          <SyncOutlined
                            className="refresh-btn"
                            title="重新回答"
                            onClick={refreshAi}
                          />
                        )}
                      </div>
                    </div>
                    <div className="solution-search-cont">
                      {aiMessages.text?.length > 0 ? (
                        <div className="solution-answer-content">
                          {aiMessages.afterThinkContent?.length > 0 ? (
                            <>
                              <Collapse bordered={false} defaultActiveKey={"1"}>
                                <Panel header="深度思考完成" key="1">
                                  <div
                                    className="solution-think"
                                    dangerouslySetInnerHTML={{
                                      __html: aiMessages.thinkContent,
                                    }}
                                  ></div>
                                </Panel>
                              </Collapse>
                              <Divider />
                              <div
                                dangerouslySetInnerHTML={{
                                  __html: aiMessages.afterThinkContent,
                                }}
                              ></div>
                            </>
                          ) : aiMessages.text.length > 1 && success ? (
                            <Collapse bordered={false} defaultActiveKey={"1"}>
                              <Panel header={"深度思考中..."} key="1">
                                <div
                                  className="solution-think"
                                  dangerouslySetInnerHTML={{
                                    __html: aiMessages.text,
                                  }}
                                ></div>
                              </Panel>
                            </Collapse>
                          ) : (
                            <div
                              className="solution-think"
                              dangerouslySetInnerHTML={{
                                __html: aiMessages.text,
                              }}
                            ></div>
                          )}
                        </div>
                      ) : (
                        loading && <LoadingDots theme='dark' />
                      )}
                    </div>
                    {loading && (
                      <div className="solution-search-stop" onClick={stopAi}>
                        <PauseCircleOutlined />
                        <span className="stop-title">停止回答</span>
                      </div>
                    )}
                  </div>

                </>

              )
            }

          </div> */}
        </div>


        {/* 屏蔽 */}
        <Modal
          className="warn-dialog warn-dialogpb"
          visible={open1}
          footer={null}
        >
          <div className="pb-header">
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
        {/* 查看详情 */}
        <Modal
          visible={isModalOpen}
          onCancel={() => {
            setIsModalOpen(false);
          }}
          width="55%"
          footer={null}
          className="solution-modal"
        >
          <div className="modal-solution-title">解决方案详情</div>
          <div className="solution-detail">
            <div className="solution-detail-title">{detail.title}</div>
            <div className="solution-keywords">
              {_.map(detail.keywords, (keyWord, index) => {
                return (
                  <div className="solution-keyword" key={index}>
                    {keyWord}
                  </div>
                );
              })}
            </div>
            <div className="solution-des">简介：{detail.introduction}</div>
            <div className="solution-search-des">
              <div className="l-des">内容由 AI 生成，请仔细甄别</div>
              <div className="r-des">
                <img
                  title="喜欢"
                  src="/image/alarm/good1.png"
                  alt=""
                  onClick={() => handleBtn(detail, true, "detail")}
                />
                <img
                  title="不喜欢"
                  src="/image/alarm/bad1.png"
                  alt=""
                  onClick={() => handleBtn(detail, false, "detail")}
                />
                {/* <img src="/image/solution/refresh.png" alt="" /> */}
              </div>
            </div>
            <div className="solution-search-cont solution-detail-cont">
              <div
                className="solution-think"
                dangerouslySetInnerHTML={{
                  __html: detail.content ? marked(detail.content) : "",
                }}
              ></div>
            </div>
          </div>
        </Modal>
      </Modal>
      }
    </>
  );
};

export default WarnModal;
