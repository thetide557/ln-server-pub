import React, { useState } from "react";
import { Tabs } from "antd";
import PageLayout from "@/components/pageLayout";
import { ContainerOutlined } from "@ant-design/icons";

import "./style.less";
import _ from "lodash";

import DutyList from "./DutyList";
import ScheduleList from "./ScheduleList";
import DutyLogs from "./DutyLogs";
import ProjectSupport from "./ProjectSupport";
const { TabPane } = Tabs;

export default function () {
  const [tab, setTab] = useState("duty");
  const handleChange = (tab) => {
    setTab(tab);
  };

  return (
    <PageLayout icon={<ContainerOutlined />} title={"值班管理"}>
      <div>
        <Tabs activeKey={tab} className="duty_manage" onChange={handleChange}>
          <TabPane tab="值班人员管理" key="duty">
            <DutyList />
          </TabPane>
          <TabPane tab="排班管理" key="schedule">
            <ScheduleList />
          </TabPane>
          <TabPane tab="值班日志" key="dutyLogs">
            <DutyLogs />
          </TabPane>
          <TabPane tab="项目支撑" key="projectSupport">
            <ProjectSupport />
          </TabPane>
        </Tabs>
      </div>
    </PageLayout>
  );
}
