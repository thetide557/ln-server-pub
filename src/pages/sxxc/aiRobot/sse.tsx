// @ts-nocheck
import React, { useRef, useEffect, useState } from "react";
import Draggable from "react-draggable";
import { useHistory, useLocation } from "react-router-dom";
import { Input, Form, Collapse, Divider } from "antd";
import {
  CloseOutlined,
  SyncOutlined,
  PauseCircleOutlined,
} from "@ant-design/icons";
import { marked } from "marked";
import { getShowDeepSeek } from "@/services/common";
import "./index.less";

const AiRobotSse = function () {
  const { Panel } = Collapse;
  // ai机器人
  const [aiShow, setAiShow] = useState(false);
  const [form] = Form.useForm();
  const { TextArea } = Input;
  let isDragging = false;
  const [aiMessages, setAiMessages] = useState<any>([]);
  const aiRef = useRef<any>(null);
  const textAreaRef = useRef<any>(null);
  const location = useLocation();
  const { pathname } = location;
  const [loading, setLoading] = useState<any>(false);
  const knowList = [
    "如何快速录入多个资产？",
    "资产信息变更后如何更新？",
    "告警太多如何降噪？",
    "告警通知支持哪些渠道？",
    "如何自定义指标告警阈值？",
    "巡检结果如何查看？",
    "能否自动修复巡检发现的问题？",
    "健康报告包含哪些内容？",
    "工单处理进度如何跟踪？",
    "如何自定义可视化大屏？",
    "大屏数据是否支持实时更新？",
    "拓扑图中如何标识故障资产？",
    "平台是否支持信创环境？",
    "能否设置资产维保到期提醒？",
    "如何查询某业务组下的所有资产？",
    "能否屏蔽特定时间段的告警？",
    "如何监控资产性能？",
    "什么是一体化运维平台中的资产管理功能？",
    "如何暂停或启用监控指标？",
    "如何将工单分配给特定的运维人员？",
  ];
  const [randomList, setRandomList] = useState<any>([]);
  // 终止请求
  const [controller, setController] = useState(new AbortController());
  const [deepseekShow, setDeepseekShow] = useState(true);
  const [taskId, setTaskId] = useState<any>(undefined);
  let flag = false;
  // console.log('dsdf', pathname);
  let isScreen = true;
  if (pathname.startsWith("/screenView")) {
    isScreen = true;
  } else {
    isScreen = false;
  }

  const getRandomTwoElements = (arr) => {
    if (arr.length < 2) {
      throw new Error("数组长度必须大于等于2");
    }

    // 复制数组以避免修改原数组
    let copyArr = arr.slice();
    let result: any = [];

    // 随机选择两个不重复的元素
    for (let i = 0; i < 2; i++) {
      let randomIndex = Math.floor(Math.random() * copyArr.length);
      result.push(copyArr[randomIndex]);
      copyArr.splice(randomIndex, 1);
    }

    return result;
  };

  useEffect(() => {
    if (!pathname.startsWith("/login")) {
      getShowDeepSeek().then((res) => {
        if (res.dat) {
          setDeepseekShow(res.dat.show);
        }
      });
    }

    let randomElements = getRandomTwoElements(knowList);
    setRandomList(randomElements);
    // 清理函数，确保在组件卸载时取消请求
    return () => {
      controller.abort();
    };
  }, []);

  const aiAsk = () => {
    let randomElements = getRandomTwoElements(knowList);
    setRandomList(randomElements);
  };

  const handleDrag = () => {
    isDragging = true;
  };

  const handleStop = () => {
    setTimeout(() => {
      isDragging = false;
    }, 100);
  };

  const handleAiClick = () => {
    if (!isDragging) {
      // 执行点击事件逻辑
      setAiShow(!aiShow);
    }
  };

  const onFinish = (values: any) => {
    console.log(values);
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

  //   处理see数据
  let buffer = "";
  const processChunk = (chunk) => {
    if (!chunk) return ""; // 处理空 chunk 的情况

    buffer += chunk;
    const lines = buffer.split("\n");

    buffer = lines.pop() || ""; // 保留未完成的一行
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

  //   发送ai请求
  const sendAi = (e: any) => {
    form.validateFields().then(async (values) => {
      console.log(values);
      if (values.note?.trim() && !loading) {
        setTaskId(undefined);
        try {
          let aiStr = "";
          const data = {
            inputs: { 角色: "羚牛一体化运维平台助手" },
            query: `${values.note.trim()}`,
            user: localStorage.getItem("username"),
            response_mode: "streaming",
          };
          setAiMessages([
            ...aiMessages,
            { text: values.note, sender: "user" },
            { text: "", sender: "ai" },
          ]);
          form.setFieldsValue({ note: "" });
          aiRef.current.scrollTop = aiRef.current.scrollHeight;
          if (textAreaRef.current) {
            if (e) e.preventDefault();
            textAreaRef.current.selectionStart = 0;
            textAreaRef.current.selectionEnd = 0;
            textAreaRef.current.focus();
          }
          setLoading(true);
          const response: any = await fetchWithTimeout(
            "/v1/chat-messages",
            {
              method: "POST",
              headers: {
                "Content-type": "application/json",
                Authorization: "Bearer app-46pUHSbpV4pWgGnftV3ZeyiO",
              },
              body: JSON.stringify(data),
            },
            60000
          );

          if (!response.ok) {
            setLoading(false);
            throw new Error(`HTTP error! Status: ${response.status}`);
          }

          const reader = response.body.getReader();

          async function readStream() {
            try {
              const { done, value } = await reader.read();
              if (done) {
                console.log("Streaming finished.");
                setLoading(false);
                return;
              }
              const textDecoder = new TextDecoder("utf-8");
              const chunkText = textDecoder.decode(value, { stream: true });
              let str1 = processChunk(chunkText);
              aiStr += str1;
              // console.log("aiStr", aiStr);
              const thinkRegex = /<think>(.*?)<\/think>(.*)/s;
              const match = aiStr.match(thinkRegex);

              if (match) {
                const thinkContent = match[1].trim();
                const afterThinkContent = match[2].trim();
                // console.log("think标签中的内容:", thinkContent);
                // console.log("think标签后的内容:", afterThinkContent);
                setAiMessages([
                  ...aiMessages,
                  { text: values.note, sender: "user" },
                  {
                    text: marked(aiStr),
                    sender: "ai",
                    thinkContent: marked(thinkContent),
                    afterThinkContent: marked(afterThinkContent),
                  },
                ]);
              } else {
                // console.log("未找到think标签");
                setAiMessages([
                  ...aiMessages,
                  { text: values.note, sender: "user" },
                  { text: marked(aiStr), sender: "ai" },
                ]);
              }

              // setAiMessages([
              //   ...aiMessages,
              //   { text: values.note, sender: "user" },
              //   { text: marked(aiStr), sender: "ai" },
              // ]);
              readStream();
            } catch (error) {
              if (error.name === "AbortError") {
                setAiMessages([
                  ...aiMessages,
                  { text: values.note, sender: "user" },
                  { text: " ", sender: "ai" },
                ]);
                console.log("流式请求已中止");
              } else {
                console.error("Error streaming AI text:", error);
              }
              setLoading(false);
            }
          }
          readStream();
        } catch (error: any) {
          if (error.name === "AbortError") {
            setLoading(false);
            // console.log("flag", flag);
            if (flag) {
              console.log("请求超时");
              setAiMessages([
                ...aiMessages,
                { text: values.note, sender: "user" },
                { text: "访问超时", sender: "ai" },
              ]);
              setController(new AbortController());
            } else {
              console.log("请求已中止");
              setAiMessages([
                ...aiMessages,
                { text: values.note, sender: "user" },
                { text: " ", sender: "ai" },
              ]);
            }
          } else {
            setAiMessages([
              ...aiMessages,
              { text: values.note, sender: "user" },
              { text: "访问超时", sender: "ai" },
            ]);
            console.error("Error streaming AI text:", error);
          }
        }
      }
    });
  };

  const sendAsk = (item, e) => {
    form.setFieldsValue({ note: item });
    sendAi(e);
  };

  /**
   * 停止AI任务的执行。该函数会根据当前任务的状态执行不同的操作：
   * 1. 如果存在 `taskId`，则向服务器发送请求以停止该任务；
   * 2. 如果不存在 `taskId`，则中止当前正在进行的请求。
   *
   * 该函数还会更新全局状态，包括设置 `flag` 为 `false` 和关闭加载状态。
   */
  const stopAi = () => {
    // 更新全局状态，停止任务执行
    flag = false;
    setLoading(false);
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
            Authorization: "Bearer app-46pUHSbpV4pWgGnftV3ZeyiO",
          },
          body: JSON.stringify(data),
        },
        60000
      ).then((response) => {
        console.log("任务已停止");
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

  // useEffect(() => {
  //   console.log("aiMessages", aiMessages);
  // }, [aiMessages]);

  // useEffect(() => {
  //   console.log("taskId", taskId);
  // }, [taskId]);

  return (
    <>
      {!pathname.startsWith("/login") && deepseekShow && (
        <Draggable
          bounds="parent"
          handle=".robot"
          onDrag={handleDrag}
          onStop={handleStop}
        >
          <div className="nav-bar">
            {aiShow && (
              <div
                className="r-dialog"
                style={{ background: isScreen ? "#35649E" : "#fff" }}
              >
                <div className="ai-all">
                  {aiMessages.length == 0 ? (
                    <div className="ai-noask">
                      <div className="ai-top">
                        {isScreen ? (
                          <img
                            className="ai-logo"
                            src="/image/ai/d-logo.png"
                            alt=""
                          />
                        ) : (
                          <img
                            className="ai-logo"
                            src="/image/ai/l-logo.png"
                            alt=""
                          />
                        )}
                        <div
                          className="ai-title"
                          style={{ color: isScreen ? "#fff" : "#333" }}
                        >
                          欢迎使用LingNiu，有什么可以帮助您？
                        </div>
                      </div>
                      <div className="ai-random">
                        <div
                          className="random-ask"
                          style={{ color: isScreen ? "#74A1D8" : "#CDCDCD" }}
                        >
                          或许你想问问：
                        </div>
                        <div className="random-content">
                          <div className="random1">
                            {randomList.map((item1, index1) => {
                              return (
                                <div
                                  style={{
                                    color: isScreen ? "#CDE3FF" : "#9F9F9F",
                                    borderColor: isScreen
                                      ? "#9DBEE7"
                                      : "#E5E5E5",
                                  }}
                                  key={index1}
                                  onClick={(e) => sendAsk(item1, e)}
                                >
                                  {item1}
                                </div>
                              );
                            })}
                          </div>
                          <SyncOutlined
                            style={{
                              cursor: "pointer",
                              color: isScreen ? "#9DBEE7" : "#767676",
                            }}
                            onClick={aiAsk}
                          />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className="ai-content" ref={aiRef}>
                        <div className="messages">
                          {aiMessages.map((message, index) => (
                            <div
                              key={index}
                              className={`ai-message ${message.sender}`}
                            >
                              {message.sender == "user" ? (
                                <div className="ai-user">
                                  <span className="user-text">
                                    {message.text}
                                  </span>
                                </div>
                              ) : (
                                <div className="ai-ai">
                                  <img
                                    className="ai-lrobot"
                                    src="/image/ai/l-robot.png"
                                  ></img>
                                  <div
                                    className={
                                      isScreen
                                        ? "ai-answer dark-answer"
                                        : "ai-answer"
                                    }
                                  >
                                    {message.text?.length > 0 ? (
                                      <div className="ai-answer-content">
                                        {message.afterThinkContent?.length >
                                        0 ? (
                                          <>
                                            <Collapse
                                              bordered={false}
                                              defaultActiveKey={[index]}
                                            >
                                              <Panel
                                                header="已深度思考"
                                                key={index}
                                              >
                                                <div
                                                  className="ai-think"
                                                  dangerouslySetInnerHTML={{
                                                    __html:
                                                      message.thinkContent,
                                                  }}
                                                ></div>
                                              </Panel>
                                            </Collapse>
                                            <Divider />
                                            <div
                                              dangerouslySetInnerHTML={{
                                                __html:
                                                  message.afterThinkContent,
                                              }}
                                            ></div>
                                          </>
                                        ) : (
                                          // <div
                                          //   className="ai-think"
                                          //   dangerouslySetInnerHTML={{
                                          //     __html: message.text,
                                          //   }}
                                          // ></div>
                                          <Collapse
                                            bordered={false}
                                            defaultActiveKey={[index]}
                                          >
                                            <Panel
                                              header={"深度思考中..."}
                                              key={index}
                                            >
                                              <div
                                                className="ai-think"
                                                dangerouslySetInnerHTML={{
                                                  __html: message.text,
                                                }}
                                              ></div>
                                            </Panel>
                                          </Collapse>
                                        )}
                                      </div>
                                    ) : (
                                      <SyncOutlined spin />
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                      {loading && (
                        <div className="stop-ai">
                          <div
                            className={isScreen ? "stop1 dark-stop1" : "stop1"}
                            onClick={stopAi}
                          >
                            <PauseCircleOutlined />
                            <span className="stop-title">停止生成</span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                <div className="ai-bottom">
                  <Form
                    form={form}
                    name="control-hooks"
                    onFinish={onFinish}
                    className="ai-form"
                  >
                    <Form.Item name="note">
                      <TextArea
                        ref={textAreaRef}
                        className={isScreen ? "ai-note dark-note" : "ai-note"}
                        placeholder="输入内容开始聊天"
                        onPressEnter={sendAi}
                      />
                    </Form.Item>
                    <div className="ai-send">
                      {loading ? (
                        <SyncOutlined spin className="ai-loading" />
                      ) : (
                        <img
                          onClick={sendAi}
                          className="ai-icon"
                          src="/image/ai/send.png"
                          alt="submit"
                        />
                      )}
                    </div>
                  </Form>
                </div>
              </div>
            )}
            <div className="r-robot">
              <div></div>
              <div className="robot" onClick={handleAiClick}></div>
            </div>
          </div>
        </Draggable>
      )}
    </>
  );
};

export default AiRobotSse;
