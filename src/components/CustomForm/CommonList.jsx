import React, { Component } from 'react';
import CommonTable from "./CommonTable"
import CommonModal from "./CommonModal"
// import CommonDelete from "../../Components/Modal/CommonDelete" //（CommonDelete 可以自行删掉，封装的一个小弹窗）
import { Space, message } from "antd"
// import {
//     API_GET_ROLE, API_ADD_ROLE,
//     API_GET_ROLE_AUTH,
//     API_UPDATE_ROLE,
//     API_UPDATE_ROLE_AUTH
// } from '../../Helper/Role'; //这里全部是接口
class CommonList extends Component {
    constructor(props) {
        super(props)      

    }
    SetAuth = async (row) => {
       console.log("这里是操作中的按钮的方法")
    }
    EditTableFun = (row) => {
        this.setState({
            Form: [
                {
                    type: "input",
                    name: "name",
                    label: "角色名称",
                    value: row.name
                },
                {
                    type: "textarea",
                    name: "note",
                    label: "角色备注",
                    value: row.note
                },

            ],
            Modal: {
                title: "编辑角色",
                isOpen: true,
                width: 600,
                submit: async (values) => {
                    console.log(values.name)
                    console.log(values.note)
                    //这个是按钮的点击方法
                },
                cancel: () => {
                //这个是弹窗取消事件
                    let originModal = this.state.Modal
                    originModal.isOpen = false;
                    this.setState({
                        Modal: originModal
                    })
                },
                row: row
            }
        })
    }
    //点击查询事件 
    async queryTable(values) {
        //这个是查询按钮
        // eslint-disable-next-line
        if (values.name == undefined) {
            message.error("查询字段不能为空!")
            return
        }
        // let res = await API_GET_ROLE({ name: values.name });
        // switch (res.data.response) {
        //     case "success":
        //         this.that.setState({
        //             TableData: res.data.results
        //         })
        //         //console.log(this.that.state)
        //         break;
        //     default:
        //         break;
        // }
    }
    async reloadFun() {
        //console.log("重置")
        // let res = await API_GET_ROLE();
        // switch (res.data.response) {
        //     case "success":
        //         this.that.setState({
        //             TableData: res.data.results
        //         })
        //         break;
        //     default:
        //         break;
        // }
    }
    cancel() {
        let originModal = this.state.Modal
        originModal.isOpen = false;
        this.setState({
            Modal: originModal
        })
        this.initFun();
    }
    isDeleteWin(row) {
        //弹出确认框
       console.log("这个是删除事件")
    }
    async initFun() {
    	//初始化table数据事件
        // const res =  null;//await API_GET_ROLE({})
        // console.log(res)
        // switch (res.data.response) {
        //     case "success":
        //         console.log("给table表格赋值")
        //         this.setState({
        //             Loading: false,
        //             TableData: res.data.results,
        //         })
        //         break;
        //     default:
        //         this.setState({
        //             Loading: false
        //         })
        //         break;
        // }
    }
    componentDidMount() {
    	//请求数据存放table
        this.initFun();
        //初始化页面所需组件
        this.setState({
            Loading: false,
            TableData: [],
            TableColumns: [],
                // {
                //     title: '角色名称',
                //     dataIndex: 'name',
                //     width: 180
                // },
                // {
                //     title: '备注',
                //     dataIndex: 'note',
                // },
                // {
                //     title: '操作',
                //     key: 'action',
                //     fixed: 'right',
                //     width: 200,
                //     render: (text, row) => (
                //         <Space size="middle">
                //             {/* eslint-disable-next-line */}
                //             <a onClick={() => { this.SetAuth(row) }}>设置权限</a>
                //             {/* eslint-disable-next-line */}
                //             <a onClick={() => { this.EditTableFun(row) }}>编辑</a>
                //             {/* eslint-disable-next-line */}
                //             <a onClick={() => { this.isDeleteWin(row) }}>删除</a>
                //         </Space>
                //     ),
                // }
            // ],
            //这个是table上方按钮数组
            ButtonArr: [
                {
                    ButtonText: "添加角色",
                    type: "primary",
                    ClickFun: () => {
                        //打开添加人员的窗口
                        this.setState({
                            Form: [
                                {
                                    type: "input",
                                    name: "name",
                                    label: "角色名称",
                                    isRequired: true,
                                    value: ""
                                },
                                {
                                    type: "textarea",
                                    name: "note",
                                    isRequired: false,
                                    label: "角色备注",
                                    value: ""
                                },
                            ],
                            Modal: {
                                title: "添加角色",
                                isOpen: true,
                                width: 600,
                                submit: async (values) => {
               
                                    const res = null;
                                    // await API_ADD_ROLE({
                                    //     Name: values.name,
                                    //     Note: values.note,
                                    // });
                                    switch (res.data.response) {
                                        case "success":
                                            message.success("添加成功");
                                            //刷新table
                                            this.cancel();
                                            break;
                                        default:
                                            message.error(res.data.results);
                                            break;
                                    }
                                },
                                cancel: () => {
                                    let originModal = this.state.Modal
                                    originModal.isOpen = false;
                                    this.setState({
                                        Modal: originModal
                                    })
                                }
                            }
                        })
                    }
                }
            ],
            //searchOption搜索栏form元素
            searchOption: [
                {
                    type: "input",
                    name: "name",
                    isRequired: false,
                    label: "角色名称",
                    placeholder: "请输入角色名称",
                    value: ""
                },
            ]
        })
    }



    render() {
        return (
            <>
                {/* <CommonDelete Modal={this.state.DeleteModal}></CommonDelete> */}
                <CommonModal Form={this.props.Form} Modal={this.props.Modal}></CommonModal>
                <CommonTable
                    excelName={this.props.excelName}
                    initFun={this.props.initFun}
                    queryTable={this.props.queryTable}
                    Loading={this.props.Loading}
                    searchOption={this.props.searchOption}
                    that={this}
                    ButtonArr={this.props.ButtonArr}
                    TableColumns={this.props.TableColumns}
                    reloadFun={this.props.reloadFun}
                    TableData={this.props.TableData}></CommonTable>
            </>
        )
    }
}
export default CommonList;
