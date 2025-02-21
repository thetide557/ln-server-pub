// @ts-nocheck
import React, { useRef, useEffect, useState } from 'react';
import Draggable from 'react-draggable';
import { useHistory, useLocation } from 'react-router-dom';
import { Input, Form } from 'antd';
import { CloseOutlined, SyncOutlined  } from '@ant-design/icons';
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
  // console.log('dsdf', pathname);
  let isScreen = true
  if (pathname.startsWith('/screenView')) {
    isScreen = true
  } else {
    isScreen = false
  }
  // console.log('is', isScreen);
  
  
  // useEffect(() => {
  //   // 路由变化时执行的代码
  //   console.log('当前路由:', location.pathname);

  //   // 可以在这里添加更多的逻辑，比如更新状态、发送请求等
  // }, [location]);

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
  const fetchWithTimeout = (url, options = {}, timeout = 5000) => {
    const abortController = new AbortController();
    const signal = abortController.signal;
  
    const fetchPromise = fetch(url, { ...options, signal });
  
    const timeoutId = setTimeout(() => {
      abortController.abort();
      console.log('请求超时');
      
    }, timeout);
  
    return fetchPromise.finally(() => clearTimeout(timeoutId));
  }

  const sendAi = (e:any) => {
    form.validateFields().then(async (values) => {
      console.log(values);
      if (values.note.trim()) {
        const data = {
          content: values.note,
          prompt: "",
          kb_cls: "ln"
        }
        // 添加用户消息到消息列表
        setAiMessages([...aiMessages, { text: values.note, sender: 'user' }, { text: '', sender: 'ai' }]);
        form.setFieldsValue({ 'note': '' })
        aiRef.current.scrollTop = aiRef.current.scrollHeight;
        if (textAreaRef.current) {
          e.preventDefault();
          textAreaRef.current.selectionStart = 0;
          textAreaRef.current.selectionEnd = 0;
          textAreaRef.current.focus()
        }
        try {
          let aiStr = ''
          const response:any = await fetchWithTimeout('/chat', {
            method: 'POST',
            headers: {
              'Content-type': 'application/json'
            },
            body: JSON.stringify(data)
          }, 60000);

          if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
          }

          // 使用response.body.getReader()获取一个ReadableStreamDefaultReader
          const reader = response.body.getReader();

          // 定义一个函数来读取流中的数据块
          async function readStream() {
            const { done, value } = await reader.read();

            if (done) {
              setAiMessages([...aiMessages, { text: values.note, sender: 'user' }, { text: aiStr, sender: 'ai' }]);
              console.log('Streaming finished.');
              return;
            }

            // 处理接收到的数据块（value是一个Uint8Array）
            // 在这里，我们将Uint8Array转换为字符串并打印出来
            const textDecoder = new TextDecoder('utf-8');
            const chunkText = textDecoder.decode(value);
            // console.log('Received text chunk:', chunkText);
            aiStr += chunkText
            setAiMessages([...aiMessages, { text: values.note, sender: 'user' }, { text: aiStr, sender: 'ai' }])
            // console.log('str', aiStr);

            // 递归调用readStream以继续读取流
            readStream();
          }
          // 开始读取流
          readStream();
          // console.log('straaaaa', aiStr);
          
        } catch (error) {
          setAiMessages([...aiMessages, { text: values.note, sender: 'user' }, { text: '访问超时', sender: 'ai' }]);
          console.error('Error streaming AI text:', error);
        }

      }

    })
  }

  // useEffect(() => {
  //   console.log('aiMessages', aiMessages);
  // }, [aiMessages])

  return (
    <>
        {!pathname.startsWith('/login') && <Draggable bounds="parent" handle=".robot" onDrag={handleDrag} onStop={handleStop}>
        <div className='nav-bar'>
          {
            aiShow && <div className="r-dialog" style={{background: (isScreen ? '#35649E' : '#fff')}}>
              <div className='ai-all'>
                {
                  aiMessages.length == 0 ?
                    <div className="ai-top">
                      {
                        isScreen ?  <img className='ai-logo' src="/image/ai/d-logo.png" alt="" /> :  <img className='ai-logo' src="/image/ai/l-logo.png" alt="" />
                      }
                      <div className='ai-title'  style={{color: (isScreen ? '#fff' : '#333')}}>欢迎使用LingNiu，有什么可以帮助您？</div>
                    </div> : <div className="ai-content" ref={aiRef}>
                      <div className="messages">
                        {aiMessages.map((message, index) => (
                          <div key={index} className={`ai-message ${message.sender}`}>
                            {message.sender == 'user' ?
                              <div className='ai-user'>
                                <span className='user-text'>{message.text}</span>
                              </div> : <div className='ai-ai'>
                                <img className='ai-lrobot' src='/image/ai/l-robot.png'></img>
                                <div className={isScreen ? 'ai-answer dark-answer': 'ai-answer'}>
                                  {message.text ? message.text : <SyncOutlined spin /> }
                                </div>
                              </div>}
                          </div>
                        ))}
                      </div>
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
                      className={isScreen ? 'ai-note dark-note': 'ai-note'}
                      placeholder="输入内容开始聊天"
                      onPressEnter={sendAi}
                    />
                  </Form.Item>
                  <Form.Item>
                    <div className='ai-send'>
                      <div></div>
                      <img onClick={sendAi} className='ai-icon' src="/image/ai/send.png" alt="submit" />
                    </div>
                  </Form.Item>
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
