// @ts-nocheck
import React, { useRef, useEffect, useState } from 'react';
import Draggable from 'react-draggable';
import { useHistory, useLocation } from 'react-router-dom';
import { Input, Form } from 'antd';
import { CloseOutlined, SyncOutlined, PauseCircleOutlined } from '@ant-design/icons';
import { marked } from 'marked';
import './index.less'

const AiRobot = function () {
  // ai机器人
  const [aiShow, setAiShow] = useState(false)
  const [form] = Form.useForm();
  const { TextArea } = Input;
  let isDragging = false;
  const [aiMessages, setAiMessages] = useState<any>([]);
  const aiRef = useRef<any>(null);
  const textAreaRef = useRef<any>(null);
  const location = useLocation();
  const { pathname } = location;
  const [loading, setLoading] = useState<any>(false)
  const knowList = ['如何快速录入多个资产？', '资产信息变更后如何更新？', '告警太多如何降噪？', '告警通知支持哪些渠道？', '如何自定义指标告警阈值？', '巡检结果如何查看？', '能否自动修复巡检发现的问题？', '健康报告包含哪些内容？', '工单处理进度如何跟踪？', '如何自定义可视化大屏？', '大屏数据是否支持实时更新？', '拓扑图中如何标识故障资产？', '平台是否支持信创环境？', '能否设置资产维保到期提醒？', '如何查询某业务组下的所有资产？', '能否屏蔽特定时间段的告警？', '如何监控资产性能？', '什么是一体化运维平台中的资产管理功能？', '如何暂停或启用监控指标？', '如何将工单分配给特定的运维人员？']
  const [randomList, setRandomList] = useState<any>([])
  // 终止请求
  const [controller, setController] = useState(new AbortController());
  let flag = false
  // console.log('dsdf', pathname);
  let isScreen = true
  if (pathname.startsWith('/screenView')) {
    isScreen = true
  } else {
    isScreen = false
  }

  const getRandomTwoElements = (arr) => {
    if (arr.length < 2) {
      throw new Error("数组长度必须大于等于2");
    }

    // 复制数组以避免修改原数组
    let copyArr = arr.slice();
    let result = [];

    // 随机选择两个不重复的元素
    for (let i = 0; i < 2; i++) {
      let randomIndex = Math.floor(Math.random() * copyArr.length);
      result.push(copyArr[randomIndex]);
      copyArr.splice(randomIndex, 1);
    }

    return result;
  }



  useEffect(() => {
    let randomElements = getRandomTwoElements(knowList);
    setRandomList(randomElements)
    // 清理函数，确保在组件卸载时取消请求
    return () => {
      controller.abort();
    };
  }, [])

  const aiAsk = () => {
    let randomElements = getRandomTwoElements(knowList);
    setRandomList(randomElements)
  }

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
      setAiShow(!aiShow)
    }
  }

  const onFinish = (values: any) => {
    console.log(values);
  };

  // fetch请求超时
  const fetchWithTimeout = (url, options = {}, timeout = 30000) => {

    const fetchPromise = fetch(url, { ...options, signal: controller.signal });
    const timeoutId = setTimeout(() => {
      flag = true
      controller.abort();
      setLoading(false)
    }, timeout);

    return fetchPromise.finally(() => clearTimeout(timeoutId));
  }

  const sendAi = (e: any) => {
    form.validateFields().then(async (values) => {
      console.log(values);
      if (values.note?.trim() && !loading) {
        try {
          let aiStr = ''
          const data = {
            content: values.note.trim(),
            prompt: "",
            kb_cls: "ln"
          }
          // 添加用户消息到消息列表
          setAiMessages([...aiMessages, { text: values.note, sender: 'user' }, { text: '', sender: 'ai' }]);
          form.setFieldsValue({ 'note': '' })
          aiRef.current.scrollTop = aiRef.current.scrollHeight;
          if (textAreaRef.current) {
            if (e) e.preventDefault();
            textAreaRef.current.selectionStart = 0;
            textAreaRef.current.selectionEnd = 0;
            textAreaRef.current.focus()
          }
          setLoading(true)
          const response: any = await fetchWithTimeout('/chat', {
            method: 'POST',
            headers: {
              'Content-type': 'application/json'
            },
            body: JSON.stringify(data)
          }, 60000);

          if (!response.ok) {
            setLoading(false)
            throw new Error(`HTTP error! Status: ${response.status}`);
          }

          // 使用response.body.getReader()获取一个ReadableStreamDefaultReader
          const reader = response.body.getReader();

          // 定义一个函数来读取流中的数据块
          async function readStream() {
            const { done, value } = await reader.read();

            if (done) {
              setAiMessages([...aiMessages, { text: values.note, sender: 'user' }, { text: marked(aiStr), sender: 'ai' }]);
              console.log('Streaming finished.');
              setLoading(false)
              return;
            }

            // 处理接收到的数据块（value是一个Uint8Array）
            // 在这里，我们将Uint8Array转换为字符串并打印出来
            const textDecoder = new TextDecoder('utf-8');
            const chunkText = textDecoder.decode(value);
            // console.log('Received text chunk:', chunkText);
            aiStr += chunkText
            setAiMessages([...aiMessages, { text: values.note, sender: 'user' }, { text: marked(aiStr), sender: 'ai' }])
            // console.log('str', aiStr);
            // 递归调用readStream以继续读取流
            readStream();
          }
          // 开始读取流
          readStream();
          // console.log('straaaaa', aiStr);

        } catch (error) {
          if (error.name === 'AbortError') {
            console.log('flag', flag);
            if (flag) {
              console.log('请求超时');
              setAiMessages([...aiMessages, { text: values.note, sender: 'user' }, { text: '请求超时', sender: 'ai' }]);
              setController(new AbortController()); // 重新创建一个新的 AbortController
            } else {
              console.log('请求已中止');
              setAiMessages([...aiMessages, { text: values.note, sender: 'user' }, { text: ' ', sender: 'ai' }]);
            }
          } else {
            setAiMessages([...aiMessages, { text: values.note, sender: 'user' }, { text: '访问超时', sender: 'ai' }]);
            console.error('Error streaming AI text:', error);
            setLoading(false)
          }
        }
      }
    })
  }

  const sendAsk = (item) => {
    form.setFieldsValue({ 'note': item })
    sendAi()
  }

  const stopAi = () => {
    flag = false
    controller.abort();
    setController(new AbortController()); // 重新创建一个新的 AbortController
    setLoading(false)
  }

  // useEffect(() => {
  //   console.log('aiMessages', aiMessages);
  // }, [aiMessages])

  return (
    <>
      {!pathname.startsWith('/login') && <Draggable bounds="parent" handle=".robot" onDrag={handleDrag} onStop={handleStop}>
        <div className='nav-bar'>
          {
            aiShow && <div className="r-dialog" style={{ background: (isScreen ? '#35649E' : '#fff') }}>
              <div className='ai-all'>
                {
                  aiMessages.length == 0 ?
                    <div className='ai-noask'>
                      <div className="ai-top">
                        {
                          isScreen ? <img className='ai-logo' src="/image/ai/d-logo.png" alt="" /> : <img className='ai-logo' src="/image/ai/l-logo.png" alt="" />
                        }
                        <div className='ai-title' style={{ color: (isScreen ? '#fff' : '#333') }}>欢迎使用LingNiu，有什么可以帮助您？</div>
                      </div>
                      <div className='ai-random'>
                        <div className='random-ask' style={{ color: (isScreen ? '#74A1D8' : '#CDCDCD') }}>或许你想问问：</div>
                        <div className='random-content'>
                          <div className='random1'>
                            {randomList.map((item1, index1) => {
                              return (<div style={{ color: (isScreen ? '#CDE3FF' : '#9F9F9F'), borderColor: (isScreen ? '#9DBEE7' : '#E5E5E5') }} key={index1} onClick={() => sendAsk(item1)}>
                                {item1}
                              </div>)
                            })}
                          </div>
                          <SyncOutlined style={{ cursor: 'pointer', color: (isScreen ? '#9DBEE7' : '#767676') }} onClick={aiAsk} />
                        </div>
                      </div>
                    </div>
                    : <div>
                      <div className="ai-content" ref={aiRef}>
                        <div className="messages">
                          {aiMessages.map((message, index) => (
                            <div key={index} className={`ai-message ${message.sender}`}>
                              {message.sender == 'user' ?
                                <div className='ai-user'>
                                  <span className='user-text'>{message.text}</span>
                                </div> : <div className='ai-ai'>
                                  <img className='ai-lrobot' src='/image/ai/l-robot.png'></img>
                                  <div className={isScreen ? 'ai-answer dark-answer' : 'ai-answer'}>
                                    {message.text ? <div dangerouslySetInnerHTML={{ __html: message.text }}></div> : <SyncOutlined spin />}
                                  </div>
                                </div>}
                            </div>
                          ))}
                        </div>
                      </div>
                      {
                        loading && <div className='stop-ai'>
                          <div className={isScreen ? 'stop1 dark-stop1' : 'stop1'} onClick={stopAi}>
                            <PauseCircleOutlined /><span className='stop-title'>停止生成</span>
                          </div>
                        </div>
                      }
                    </div>
                }
              </div>
              <div className='ai-bottom'>
                <Form
                  form={form}
                  name="control-hooks"
                  onFinish={onFinish}
                  className='ai-form'
                >
                  <Form.Item name="note">
                    <TextArea
                      ref={textAreaRef}
                      className={isScreen ? 'ai-note dark-note' : 'ai-note'}
                      placeholder="输入内容开始聊天"
                      onPressEnter={sendAi}
                    />
                  </Form.Item>
                  <div className='ai-send'>
                    {
                      loading ? <SyncOutlined spin className='ai-loading' /> : <img onClick={sendAi} className='ai-icon' src="/image/ai/send.png" alt="submit" />
                    }
                  </div>
                </Form>
              </div>
            </div>
          }
          <div className='r-robot'>
            <div></div>
            <div className="robot" onClick={handleAiClick}></div>
          </div>
        </div>
      </Draggable>}
    </>
  );
};

export default AiRobot;
