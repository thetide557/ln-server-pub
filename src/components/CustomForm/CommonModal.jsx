import React, { Component } from 'react';
import { Modal } from 'antd';
import CommonForm from "./CommonForm";
import "./CommonModal.less"
//(CommonTable为通用封装的table组件)
import { Fragment } from 'react';
class CommonModal extends Component {
    // eslint-disable-next-line
    
    constructor(props) {        
        super(props)        
    }
    componentDidMount() {
    }

    

    render() {
        let currentValue = this.props.defaultValue?this.props.defaultValue:{};
        // console.log("currentValue",currentValue)
        let title = `${this.props.operate}${this.props.Modal?.title}`
        // console.log("current props",this.props)
        return (
           <>
            <Modal
                title= {title}//弹出框title
                visible={this.props.isOpen} //弹出框是否打开
                footer={null} //弹出框底部按钮
                onCancel={this.props.Modal?.cancel} //弹出框取消事件
                width={this.props.Modal?.width} //弹出框的宽度
                centered={true}
                destroyOnClose ={true}
            >            
            <CommonForm
                excelName={this.props.excelName}
                that={this.props.that} //传入父组件 ，作用：可调用父组件中的属性及方法
                FormOnChange={this.props.FormOnChange} //监听表单值变化事件
                base64url={this.props.base64url} //为父组件base64传值
                defaultValue={currentValue} 
                initial={this.props.initial}
                Form={this.props.Form} 
                isInline = {this.props.isInline} 
                Modal={this.props.Modal} 
            ></CommonForm>
            </Modal>
        </>
        )
    }
};
export default CommonModal;
