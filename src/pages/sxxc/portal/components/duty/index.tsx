import React, { useContext, useEffect, useState } from 'react';
import { Tooltip } from 'antd';
import './index.less';
import { InfoCircleFilled } from '@ant-design/icons';
import { getTodayDuty } from '@/services/sxxc/dutyManage';


export default function Duty() {
	const [dutyList, setDutyList] = useState<any[]>([]);

	useEffect(() => {
		getTodayDuty({}).then(({ dat }) => {
			setDutyList(dat?.list || []);
		});
	}, []);

	return (
		<div className="duty-container">
			<div className="duty-header">
				<span className="duty-title">今日值班信息</span>
			</div>

			{dutyList.length > 0 ? (
				<div className="duty-table">
					<div className="duty-table-header">
						<div className="duty-table-header-cell">
							<span>角色</span>
							<Tooltip
								title={
									<div className="duty-tooltip">
										<div>①一线值班：作为统一接口接收所有事件、告警处置、工单录入、基础排查等</div>
										<div>②二线值班：负责一线无法解决的复杂故障深度处理、资源调度、技术调查等</div>
										<div>③三线值班：解决二线无法定位的疑难杂症和系统级故障、厂商协同支持</div>
										<div>④值班负责人：负责统筹全平台故障、跨团队协调、上报管理层、重保指挥等</div>
									</div>
								}
								overlayClassName="duty-tooltip-overlay"
							>
								<InfoCircleFilled className="duty-help-icon" />
							</Tooltip>
						</div>
						<div className="duty-table-header-cell">姓名</div>
						<div className="duty-table-header-cell">联系方式</div>
						<div className="duty-table-header-cell">
							<span>值班类型</span>
							<Tooltip
								title={
									<div className="duty-tooltip">
										<div>①日常常规：业务运行阶段常态化、标准化值守</div>
										<div>②备班值班：非在岗，通讯方式保持在线，远程处理故障，重大故障到场</div>
										<div>③重保专项：重大活动、业务峰值、关键节点启动的强化型应急值守</div>
									</div>
								}
								overlayClassName="duty-tooltip-overlay"
							>
								<InfoCircleFilled className="duty-help-icon" />
							</Tooltip>
						</div>
						<div className="duty-table-header-cell">值班业务组</div>
					</div>

					<div className="duty-table-body">
						{dutyList.map((item, index) => (
							<div key={index} className="duty-table-row">
								<div className="duty-table-cell">
									<div className="duty-cell-text">{item.roleName}</div>
								</div>
								<div className="duty-table-cell">
									<div className="duty-cell-text">{item.name}</div>
								</div>
								<div className="duty-table-cell">
									<Tooltip title={item.phone} overlayClassName="duty-phone-tooltip">
										<div className="duty-phone-icon-img" />
									</Tooltip>
								</div>
								<div className="duty-table-cell">
									<span className="duty-type-tag">{item.dutyTypeName}</span>
								</div>
								<div className="duty-table-cell">
									<Tooltip
										title={
											<div className="duty-tooltip">
												{item.busiGroups}
											</div>
										}
										overlayClassName="duty-tooltip-overlay"
									>
										<div className="duty-cell-text">{item.busiGroups}</div>
									</Tooltip>
								</div>
							</div>
						))}
					</div>
				</div>
			) : (
				<div className="duty-empty"></div>
			)}
		</div>
	);
}