import React, { useRef, useEffect, useState } from "react";
import { Input, Modal } from "antd";
import { UpOutlined, DownOutlined, SearchOutlined } from "@ant-design/icons";
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
  const [query, setQuery] = useState<any>("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [detail, setDetail] = useState<any>({});

  const handleDetail = (item: any) => {
    setIsModalOpen(true);
    setDetail(item);
  };

  useEffect(() => {
    console.log("query", query);
    if (query) {
      // 调用接口
    }
  }, [query]);

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
                        {/* <div className="btn-left-icon">
                          <img src="/image/solution/good1.png" alt="" />
                          <img src="/image/solution/bad1.png" alt="" />
                        </div> */}
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
                <Input
                  className="ai-input"
                  placeholder="搜索更多解决方案"
                  // allowClear
                  suffix={
                    <SearchOutlined
                      style={{ color: "#2178E3", cursor: "pointer" }}
                    />
                  }
                  onBlur={(e) => {
                    setQuery(e.target.value);
                  }}
                  onPressEnter={(e) => {
                    setQuery(e.currentTarget.value);
                  }}
                />
              </div>
              <div className="ai-search-des">
                <div className="l-des">内容由 AI 生成，请仔细甄别</div>
                <div className="r-des">
                  {/* <img src="/image/solution/good1.png" alt="" />
                  <img src="/image/solution/bad1.png" alt="" /> */}
                  <img src="/image/solution/refresh.png" alt="" />
                </div>
              </div>
              <div className="ai-search-cont">
                CPU占用率过高问题，可能是由于程序运行过多导致，可以通过优化程序代码、减少程序运行次数、使用多核CPU等方法解决。
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
              <div className="ai-des">简介：这是一个方案简介这是一个方案简介这是一个方案简介这是一个方案简介这是一个方案简介</div>
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
