import React, { useRef, useEffect, useState } from "react";
import { Input, Modal, Collapse, Divider } from "antd";
import {
  UpOutlined,
  DownOutlined,
  SearchOutlined,
  SyncOutlined,
} from "@ant-design/icons";
import { marked } from "marked";
import LoadingDots from "@/pages/sxxc/aiRobot/loading";
import "./index.less";
import _ from "lodash";

const Solution = () => {
  const { Panel } = Collapse;
  const [show, setShow] = useState<boolean>(true);
  const [solutions, setSolutions] = useState<any>([
    {
      title: "如何解决CPU占用率过高问题？",
      keyWords: ["CPU", "占用率", "问题", "解决"],
      content:
        "CPU占用率过高问题，可能是由于程序运行过多导致，可以通过优化程序代码、减少程序运行次数、使用多核CPU等方法解决。",
    },
    {
      title: "如何解决内存占用率过高问题？",
      keyWords: ["内存", "占用率", "问题", "解决"],
      content:
        "内存占用率过高问题，可能是由于程序运行过多导致，可以通过优化程序代码、减少程序运行次数、使用多核CPU等方法解决。",
    },
    {
      title: "如何解决内存占用率过高问题？",
      keyWords: ["内存", "占用率", "问题", "解决"],
      content:
        "内存占用率过高问题，可能是由于程序运行过多导致，可以通过优化程序代码、减少程序运行次数、使用多核CPU等方法解决。",
    },
    {
      title: "如何解决内存占用率过高问题asf法国还是你阿萨德刚是束带结发？",
      keyWords: [
        "内存",
        "占用率",
        "问题",
        "解决",
        "asf",
        "法国",
        "你阿萨德刚是束带结发",
      ],
      content:
        "内存占用率过高问题，可能是由于程序运行过多导致，可以通过优化程序代码、减少程序运行次数、使用多核CPU等方法解决。ceshi可能是由于程序运行过多导致可能是由于程序运行过多导致123",
    },
    {
      title: "如何解决内存占用率过高问题？",
      keyWords: ["内存", "占用率", "问题", "解决"],
      content:
        "内存占用率过高问题，可能是由于程序运行过多导致，可以通过优化程序代码、减少程序运行次数、使用多核CPU等方法解决。",
    },
    {
      title: "如何解决内存占用率过高问题？",
      keyWords: ["内存", "占用率", "问题", "解决"],
      content:
        "内存占用率过高问题，可能是由于程序运行过多导致，可以通过优化程序代码、减少程序运行次数、使用多核CPU等方法解决。",
    },
  ]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [detail, setDetail] = useState<any>({});
  const [loading, setLoading] = useState<boolean>(false);
  const [aiMessages, setAiMessages] = useState<any>({});
  const [taskId, setTaskId] = useState<any>(undefined);
  // 终止请求
  const [controller, setController] = useState(new AbortController());
  // 请求成功与失败状态
  const [success, setSuccess] = useState(false);
  let flag = false;

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

  const handleSearch = async (value: string) => {
    if (!value && !loading) {
      return setAiMessages("");
    }
    if (value.trim() && !loading) {
      setTaskId(undefined);
      setAiMessages({});
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

  const handleDetail = (item: any) => {
    setIsModalOpen(true);
    setDetail(item);
  };

  useEffect(() => {
    // 清理函数，确保在组件卸载时取消请求
    return () => {
      controller.abort();
    };
  }, []);

  return (
    <div className="ai-solution">
      <div className="ai-top">
        <div className="ai-title">
          <img src="/image/solution/bar.png" alt="" />
          <span>解决方案推荐</span>
        </div>
        <div className="ai-show" onClick={() => setShow(!show)}>
          {!show ? (
            <div>
              <span className="ai-show-text">展开</span>
              <DownOutlined />
            </div>
          ) : (
            <div>
              <span className="ai-show-text">收起</span>
              <UpOutlined />
            </div>
          )}
        </div>
      </div>
      {show && (
        <>
          <div className="ai-content">
            <div className="ai-card">
              {_.map(solutions, (item, index) => {
                return (
                  <div className="ai-card-item" key={index}>
                    <div className="ai-card-item-title">{item.title}</div>
                    <div className="ai-card-item-wrap">
                      <div className="ai-keywords">
                        {_.map(item.keyWords, (keyWord, index1) => {
                          return (
                            <div className="ai-keyword" key={index1}>
                              {keyWord}
                            </div>
                          );
                        })}
                      </div>
                      <div className="ai-card-item-content">{item.content}</div>
                    </div>
                    <div className="ai-card-item-btn">
                      <div className="btn-left">
                        <div className="btn-left-icon">
                          <img src="/image/solution/good1.png" alt="" />
                          <img src="/image/solution/bad1.png" alt="" />
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
            <div className="ai-search">
              <div className="ai-search-input">
                <Input.Search
                  className="ai-input"
                  placeholder="搜索更多解决方案"
                  // allowClear
                  onSearch={handleSearch}
                  // onPressEnter={(e) => {
                  //   setQuery(e.currentTarget.value);
                  // }}
                />
              </div>
              <div className="ai-search-des">
                <div className="l-des">内容由 AI 生成，请仔细甄别</div>
                <div className="r-des">
                  {/* <img src="/image/solution/good1.png" alt="" />
                  <img src="/image/solution/bad1.png" alt="" /> */}
                  {loading && (
                    <SyncOutlined
                      spin={loading}
                      style={{ cursor: "pointer" }}
                      onClick={stopAi}
                    />
                  )}
                </div>
              </div>
              <div className="ai-search-cont">
                {aiMessages.text?.length > 0 ? (
                  <div className="ai-answer-content">
                    {aiMessages.afterThinkContent?.length > 0 ? (
                      <>
                        <Collapse bordered={false} defaultActiveKey={"1"}>
                          <Panel header="深度思考完成" key="1">
                            <div
                              className="ai-think"
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
                            className="ai-think"
                            dangerouslySetInnerHTML={{
                              __html: aiMessages.text,
                            }}
                          ></div>
                        </Panel>
                      </Collapse>
                    ) : (
                      <div
                        className="ai-think"
                        dangerouslySetInnerHTML={{
                          __html: aiMessages.text,
                        }}
                      ></div>
                    )}
                  </div>
                ) : (
                  loading && <LoadingDots />
                )}
              </div>
            </div>
          </div>
          <Modal
            title="解决方案详情"
            visible={isModalOpen}
            onCancel={() => {
              setIsModalOpen(false);
            }}
            width="50%"
            footer={null}
          >
            <div className="ai-detail">
              <div className="ai-detail-title">{detail.title}</div>
              <div className="ai-keywords">
                {_.map(detail.keyWords, (keyWord, index) => {
                  return (
                    <div className="ai-keyword" key={index}>
                      {keyWord}
                    </div>
                  );
                })}
              </div>
              <div className="ai-des">
                简介：这是一个方案简介这是一个方案简介这是一个方案简介这是一个方案简介这是一个方案简介
              </div>
              <div className="ai-search-des">
                <div className="l-des">内容由 AI 生成，请仔细甄别</div>
                <div className="r-des">
                  {/* <img src="/image/solution/good1.png" alt="" />
                  <img src="/image/solution/bad1.png" alt="" /> */}
                  {/* <img src="/image/solution/refresh.png" alt="" /> */}
                </div>
              </div>
              <div className="ai-search-cont">
                CPU占用率过高问题，可能是由于程序运行过多导致，可以通过优化程序代码、减少程序运行次数、使用多核CPU等方法解决。
              </div>
            </div>
          </Modal>
        </>
      )}
    </div>
  );
};

export default Solution;
