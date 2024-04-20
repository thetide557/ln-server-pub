/*
 * Copyright 2022 Nightingale Team
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 */
import React, { useRef, useState } from 'react';
import { Modal, message, Button } from 'antd';
import _ from 'lodash';
import moment from 'moment';
import Inspection from '../inspectionForm';
import { getMonObjectList } from '@/services/targets';
import { ModalProps, InspectionType, } from '@/store/sxxc/inspection';
import { useTranslation } from 'react-i18next';
import { getInspectionList,addInspection,editInspection} from '@/services/sxxc/inspection'

const CreateModal: React.FC<ModalProps> = (props: ModalProps) => {
    const { visible, onClose, inspection, inspectionId, width } = props;
    const inspectionRef = useRef(null as any);
    const isInspection: boolean = (inspection === InspectionType.CreateInspection || inspection === InspectionType.EditInspection) ? true : false;

    const onOk = async (val?: string) => {
        if (isInspection) {
            let form = inspectionRef.current.form;
            const values = await form.validateFields();
            let selectedRowKeys = inspectionRef.current.selectedRowKeys;
            let params = {
                ...values,
                scriptId:selectedRowKeys.join(',')
            }
            params.excuteTime = moment(params.excuteTime.$d).format('HH:mm:ss');

            if(params.type == 1){
                delete params.week
                delete params.excuteDate
            }else if(params.type == 2){
                delete params.excuteDate
                params.week = params.week.join(',')
            }else if(params.type == 3){
                delete params.week
                params.excuteDate = moment(params.excuteDate).format('YYYY-MM-DD');
            }
            if(params.scope == 1){
                delete params.scopeContext
                delete params.hosts
            }else if(params.scope == 2){
                delete params.hosts
                params.scopeContext = params.scopeContext.join(',')
            }else if(params.scope == 3){
                delete params.scopeContext
                params.hosts = params.hosts.join(',')
            }
            if (inspection === InspectionType.CreateInspection) {
                console.log('新增巡检',params)
                addInspection(params).then((_) => {
                  message.success('新增成功');
                  onClose(true);
                });
            }

            if (inspection === InspectionType.EditInspection && inspectionId) {
                console.log('--->最终传参',{...params,id:inspectionId})
                editInspection({...params,id:inspectionId}).then((_) => {
                  message.success('修改成功');
                  onClose(true);
                });
            }

        }
    };

    const inspectionLabel = () => {
        if (inspection === InspectionType.CreateInspection) {
            return '新建巡检任务';
        }
        if (inspection === InspectionType.EditInspection) {
            return '修改巡检任务';
        }
    };

    return (
        <Modal
            title={inspectionLabel()}
            visible={visible}
            width={width ? width : 1200}
            onCancel={onClose}
            destroyOnClose={true}
            footer={[
                <Button key='back' onClick={onClose}>
                    取消
                </Button>,
                <Button key='submit' type='primary' onClick={() => onOk()}>
                    确定
                </Button>,
            ]}
        >
            {isInspection && <Inspection ref={inspectionRef} inspectionId={inspectionId} />}
        </Modal>
    );
};

export default CreateModal;
