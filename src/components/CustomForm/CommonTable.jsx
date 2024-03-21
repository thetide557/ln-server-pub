import React, { Component } from 'react';
import { Table,Dropdown, Row, DatePicker,Button, Radio, Select, Form, Input,Menu } from 'antd';
import "./CommonTable.less"
import { Fragment } from 'react';
// import ExportJsonExcel from 'js-export-excel'; //引入导出excel表格控件
const style = { padding: '8px 0',width:'100%' };
import { DownOutlined} from '@ant-design/icons';



class CommonTable extends Component {
  constructor(props) {
    // console.log(props)
    super(props)
    this.state = {
      filteredInfo: null,
      sortedInfo: null,
      current: 1,
      pageSize:10,
      ordersUpdated: [{
        vslName: "S",
        docId: "!",
        test: "asdjhagsdjh"
      }],
      selectedRowKeys: [],//选中行数组
    };
  }
  componentDidMount() {

  }
  handleChange = (pagination, filters, sorter) => {
    console.log(pagination, filters, sorter)
    this.setState({
      filteredInfo: filters,
      sortedInfo: sorter,
    });
  };

  //导出excel



  clearFilters = () => {
    this.setState({ filteredInfo: null });
  };

  clearAll = () => {
    this.setState({
      filteredInfo: null,
      sortedInfo: null,
    });
  };

  onChange = (page, pageSize) => {
    this.setState({
      current: page,
      pageSize: pageSize,
    });
    if (this.props.total != undefined) {
      this.props.queryTable(page, pageSize)
    }
  };

  
  createForm(item, i) {
    switch (item.type) {
      case "input":
        return <Form.Item
          label={item.label}
          name={item.name}
          key={i}
          rules={[{ required: item.isRequired, message: `请输入您的${item.label}` }]}
        >
          <Input placeholder={item.placeholder?item.placeholder:`请输入您的${item.label}`} disabled={item.isDisable} />
        </Form.Item>
      case "timepicker":
        return <Form.Item
          label={item.label}
          name={item.name}
          key={i}
          rules={[{ required: item.isRequired, message: `请输入您的${item.label}` }]}
        >
          <DatePicker placeholder={item.placeholder} />
        </Form.Item>
       case "daterange":
        return <Form.Item label={item.label} name={item.name} key={i} rules={[{ required: item.isRequired, message: `请输入您的${item.label}` }]}>
           <DatePicker.RangePicker  style={{ width: '100%' }} />
        </Form.Item>
       case "select":
        return <Form.Item
            label={item.label}
            name={item.name}
            key={i}
            rules={[{ required: item.isRequired, message: `请选择您的${item.label}` }]}
        >
        <Select
            placeholder={item.placeholder?item.placeholder:`请选择您的${item.label}` }
            onChange={item.onChange}>
            {              
                item.option?.length ? (
                    
                    item.option.map((select, index) => {
                        return (
                            <Select.Option key={index} value={select.value}>{select.label}</Select.Option>
                        )
                    })
                ) : (
                    item.source=='initial' && (
                    this.props.initial[item.name]?.map((select, index) => {
                      return (
                          <Select.Option key={index} value={select.value}>{select.label}</Select.Option>
                      )
                     })
                   )
                )
            }
        </Select>
        </Form.Item>
      default:
        break;
    }
  }
  onFinish = (values) => {
    this.props.queryTable(values)
  }
  reload = () => {
    this.props.reloadFun();
  }
  //选中行数据‘
  onSelectChange = selectedRowKeys => {
    console.log('selectedRowKeys changed: ', selectedRowKeys);
    localStorage.setItem(this.props.businessId+"-select-rows", selectedRowKeys)
    this.setState({
       selectedRowKeys
    })
    
  };
  ExportToExcel = (tabledata) => {
    var option = {}
    let resdata = []
    let sheetfilter = []
    let sheetheader = []

    tabledata.forEach(element => {
      this.state.selectedRowKeys.forEach(item => {
        // eslint-disable-next-line
        if (element.id == item) {
          resdata.push(element)
        }
      })
    });

    this.props.TableColumns.forEach(element => {
      sheetfilter.push(element.dataIndex)
      sheetheader.push(element.title)
    });
    console.log(this.props.excelName)
    option.fileName = this.props.excelName  //导出的Excel文件名
    option.datas = [
      {
        sheetData: resdata,
        sheetName: 'sheet',
        sheetFilter: sheetfilter,
        sheetHeader: sheetheader,
      }
    ]

    // var toExcel = new ExportJsonExcel(option);
    // toExcel.saveExcel();
  }

  //配置table全选

  render() {
    const { selectedRowKeys } = this.state;
    const rowSelection = {
      selectedRowKeys,
      onChange: this.onSelectChange,
      selections: [
        Table.SELECTION_ALL,
        Table.SELECTION_INVERT,
        Table.SELECTION_NONE,
        {
          key: 'odd',
          text: 'Select Odd Row',
          onSelect: changableRowKeys => {
            let newSelectedRowKeys = [];
            newSelectedRowKeys = changableRowKeys.filter((key, index) => {
              if (index % 2 !== 0) {
                return false;
              }
              return true;
            });
            this.setState({ selectedRowKeys: newSelectedRowKeys });
          },
        },
        {
          key: 'even',
          text: 'Select Even Row',
          onSelect: changableRowKeys => {
            let newSelectedRowKeys = [];
            newSelectedRowKeys = changableRowKeys.filter((key, index) => {
              if (index % 2 !== 0) {
                return true;
              }
              return false;
            });
            debugger
            this.setState({ selectedRowKeys: newSelectedRowKeys });
          },
        },
      ],
    }
    return (
      <>
        <Row justify="space-between" align="center" style={style} key={"r-row"}>        
           
          <Form
            layout="inline"
            ref={this.formRef}
            id={this.props.businessId}
            className='queryFormContainer'
            labelCol={{span: 4 }}
            wrapperCol={{ span: 20 }}
            name="basic"
            key="basic"
            onFinish={this.onFinish}
          >
           <div className='query_option'>
            {
              this.props.searchOption ? (
                this.props.searchOption.map((item, i) => {
                  return this.createForm(item, i)
                })
              ) : (
                <>
                </>
              )
            }
            </div>
            <div style={{display:'-webkit-inline-box',marginLeft:'66px'}}>
            {
              this.props.searchOption ? (
                <Form.Item>
                     <div style={{width:'200px'}} className='button_query' >
                        <Button key="button" type="primary" htmlType="submit">查询</Button>
                        <Button key="clearbutton" onClick={this.reload}>重置</Button>
                    </div>
                </Form.Item>
              ) : (
                <Fragment />
              )
            }
            </div>
            <div className='button_option'> 
              {
               this.props.ButtonArr ? (
                this.props.ButtonArr.map((item, i) => {
                return (
                    <Button key={"btn"+i} style={{marginLeft:'8px'}} type={item.type} onClick={item.ClickFun}>{item.ButtonText}</Button>
                )
              })
              ) : (<Fragment />
              )
              }
              { 
               this.props.Menu? (
                <Dropdown
                  trigger={['click']}
                  overlay={
                  <Menu onClick={({ key }) => {
                      this.props.Menu.ClickFun(key,this.props.businessId)
                  }} items={this.props.Menu.items} />

                }>
                      <Button>{'操作'} <DownOutlined />
                </Button>
              </Dropdown>
               ): (<Fragment /> )
              }
            </div>

          </Form>
          
        </Row>

        <Table
          scroll
          bordered
          rowKey={"id"}
          rowSelection={rowSelection}
          key={"rowSelection"}
          loading={this.props.Loading}
          columns={this.props.TableColumns}
          dataSource={this.props.TableData}
          pagination={{
            showSizeChanger: true,
            showQuickJumper: true,
            current: this.state.current,
            pageSize:this.state.pageSize,
            total: this.props.total,
            onChange: this.onChange,
            pageSizeOptions: [10, 20, 50, 100]
          }}
        />
      </>
    );
  }
}

export default CommonTable;