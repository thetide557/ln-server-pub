import React, { useRef, useEffect, useState } from "react";
import { Input, Form } from "antd";
import {
  CloseOutlined,
  SyncOutlined,
  PauseCircleOutlined,
  UpOutlined,
  DownOutlined,
} from "@ant-design/icons";
import "./index.less";
import _ from "lodash";

const Solution = () => {
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
        <div className="ai-content">
          <div className="ai-card">
            {_.map(solutions, (item, index) => {
              return (
                <div className="ai-card-item" key={index}>
                  <div className="ai-card-item-title">{item.title}</div>
                  <div className="ai-card-item-wrap">
                    <div className="ai-card-item-keywords">
                      {_.map(item.keyWords, (keyWord, index1) => {
                        return (
                          <div className="ai-card-item-keyword" key={index1}>
                            {keyWord}
                          </div>
                        );
                      })}
                    </div>
                    <div className="ai-card-item-content">{item.content}</div>
                  </div>
                  <div className="ai-card-item-btn">12345</div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default Solution;
