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
import { getInspectionList, addInspection, editInspection } from '@/services/sxxc/inspection'


const CreateModal: React.FC<ModalProps> = (props: ModalProps) => {
    const { visible, onClose, inspection, inspectionId, width, formData } = props;
    const inspectionRef = useRef(null as any);
    const isInspection: boolean = (inspection === InspectionType.CreateInspection || inspection === InspectionType.EditInspection) ? true : false;

    const onOk = async (val?: string) => {
        if (isInspection) {
            let form = inspectionRef.current.form;
            let form1 = inspectionRef.current.form.getFieldsValue(true)
            let ipList = inspectionRef.current.ipList
            console.log('iplist', ipList);
            
            // console.log('form1', form1);


            const values = await form.validateFields();
            // console.log('values', values);

            let selectedRowKeys = inspectionRef.current.selectedRowKeys;
            let params = {
                ...values,
                scriptId: selectedRowKeys ? selectedRowKeys.join(',') : '',
                type: 2,
                status: form1.status,
            }
            // console.log('$d',values.excuteTime.$d);
            // console.log('_d',values.excuteTime._d);
            if (values.excuteTime.$d) {
                params.excuteTime = moment(params.excuteTime.$d).format('HH:mm:ss');
                // console.log('params', params);
            } else if (values.excuteTime._d) {
                params.excuteTime = moment(params.excuteTime._d).format('HH:mm:ss');
                // console.log('params', params);
            }

            if (params.executeCycle == 1) {
                delete params.week
                delete params.excuteDate
            } else if (params.executeCycle == 2) {
                delete params.excuteDate
                params.week = params.week.join(',')
            } else if (params.executeCycle == 3) {
                delete params.week
                params.excuteDate = moment(params.excuteDate).format('YYYY-MM-DD');
            }
            if (params.scope == 1) {
                // delete params.scopeContext
                params.scopeContext = localStorage.getItem('groupIds')
                delete params.hosts
            } else if (params.scope == 2) {
                delete params.hosts
                params.scopeContext = params.scopeContext.join(',')
            } else if (params.scope == 3) {
                // delete params.scopeContext
                let arr:any = []
                ipList.forEach(item1 => {
                    values.hosts.forEach(item2 =>{
                        if (item1.ident == item2) {
                            arr.push(item1.group_id)
                        }
                    })
                })
                params.scopeContext = [...new Set(arr)].join(',')
                params.hosts = params.hosts.join(',')
            }
            
            if (inspection === InspectionType.CreateInspection) {
                console.log('新增巡检',params)
                addInspection(params).then((res) => {
                    if (res.code == 200) {
                        message.success('新增成功');
                        onClose(true);
                    } else {
                        message.error(res.msg)
                    }

                });
            }

            if (inspection === InspectionType.EditInspection && inspectionId) {
                console.log('--->最终传参',{...params,id:inspectionId})
                editInspection({...params,id:inspectionId}).then((res) => {
                    if (res.code == 200) {
                        message.success('修改成功');
                        onClose(true);
                    } else {
                        message.error(res.msg)
                    }
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
            {isInspection && <Inspection ref={inspectionRef} inspectionId={inspectionId} formData={formData} />}
        </Modal>
    );
};

export default CreateModal;
