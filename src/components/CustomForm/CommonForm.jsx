import { Image, Form, Col, Row, Input, DatePicker, Button, Radio, Select, TimePicker, Checkbox, Upload, TreeSelect, message } from "antd";
import React, { Component } from "react";
import locale from 'antd/es/date-picker/locale/zh_CN';
import { InboxOutlined } from '@ant-design/icons';
import './form.less';
const layout = {
  labelCol: { span: 8 },
  wrapperCol: { span: 16 },
};

const tailLayout = {
  wrapperCol: {
    offset: 10,
    span: 12,
  },
};
const CheckboxGroup = Checkbox.Group;
class CommonForm extends Component {
  constructor(props) {
    super(props)
  }
  componentDidMount() {
    // console.log("CheckboxCheckboxCheckboxCheckboxCheckbox")
  }
  /**
  获取file，通过FileReader获取图片的 base64
*/
  customRequest = (option) => {
    const formData = new FormData();
    formData.append("files[]", option.file);
    const reader = new FileReader();
    reader.readAsDataURL(option.file);
    reader.onloadend = (e) => {
      this.setState({
        url: e.target.result
      })

      //将base64前面类型截取
      let noPrefix = e.target.result.replace(/^data:image\/\w+;base64,/, '')

      this.props.base64url(noPrefix); //将处理好的base64传回当前调用的组件
      // console.log(e.target.result);// 打印图片的base64
      if (e && e.target && e.target.result) {
        option.onSuccess();
      }
    };
  }
  textChange = (formId, value) => {

  };
  /***
      上传验证格式及大小
  */
  beforeUpload = (file) => {
    const isJpgOrPng = file.type === "image/jpeg" || file.type === "image/png";
    if (!isJpgOrPng) {
      message.error("只能上传JPG或PNG文件!");
      return false;
    }
    const isLt2M = file.size / 1024 / 1024 / 1024 <= 500;
    if (!isLt2M) {
      message.error("图片大小需小于500kb!");
      return false;
    }
    return isJpgOrPng && isLt2M;
  }


  formRef = React.createRef()


  onFinish = (values) => {
    this.props.Modal.submit(values)
  }
  onValuesChange = (item, allValues) => {
    // console.log(item,allValues)
    if (this.props.FormOnChange) {
      let newValues = this.props.FormOnChange(allValues, item);
      for (var key in newValues) {
        allValues[key] = values[key];
        console.log(key,)
      }
      this.formRef.current.setFieldsValue(allValues);
    }
  }
  normFile = (e) => {
    if (Array.isArray(e)) {
      return e;
    }

    return e && e.fileList;
  };
  // componentDidMount() {

  // }

  //根据传回来的类型进行分类标签创建
  render() {


    return (
      <>
        <Form
          ref={this.formRef}
          {...layout}
          name="basic"
          key="basic"
          layout={this.props.isInline ? "inline" : "horizontal"}
          onFinish={this.onFinish}
          onValuesChange={this.onValuesChange}
          initialValues={this.props.defaultValue}
          className="common_form"
        >
          {
            this.props.Form?.items?.length ? (
              <Row key={'ind-'} style={{ marginTop: '5px' }}>
                {this.props.Form.items.map((item, i) => {
                  return (this.createForm(item, i, item.sn, item.col ? item.col : Form.col))
                })}
              </Row>
            ) : (
              <>
              </>
            )
          }
          {this.props.Form?.groups?.map((group, index) => (
            <Row key={'ind-'} style={{ marginTop: '5px' }}>
              {group.label?.length > 0 && (
                <Col key={"item-" + index} className="group_title_header">
                  <div style={{ width: '100%', height: '30px', lineHeight: '30px', fontSize: '16px' }} >{group.label}</div>
                </Col>
              )}
              {group.items.map((item, i) => {
                return (this.createForm(item, i, item.sn, item.col ? item.col : Form.col))
              })}
            </Row>
          ))
          }

          <Form.Item {...tailLayout} >
            <Button key="button" type="primary" htmlType="submit" style={{ width: "100px" }} >确定</Button>
            {this.props.cancel && (
              <Button key="button" style={{ width: "100px",marginLeft:'20px' }} onClick={
                this.props.CancelClick
              } >取消</Button>
            )

            }



          </Form.Item>
        </Form>
      </>
    )



  }
  copyFormValue(item) {
    let values = this.props.defaultValue;
    setTimeout(() => {
      const key = item.name
      var obj = {}
      obj[key] = values[key]
      this.formRef.current.setFieldsValue(obj)
    }, 100);
  }
  onChange(checkedValues) {
    console.log('checked = ', checkedValues);
  }

  //渲染表单每一项
  createForm(item, sn, span) {
    this.copyFormValue(item);
    // console.log('createForm',this.props.initial[item.name])
    if (item.type == "select" && item.source == "number") {
      const children = [];
      for (let i = 1; i < item.value; i++) {
        children.push({
          value: i,
          label: i
        });
      }
      item.option = children;
    }

    switch (item.type) {
      case "hidden":
        return <React.Fragment key={sn}>
          <Form.Item hidden={true}
            name={item.name}
            key={sn}
          >
            <Input placeholder={`请输入您的${item.label}`} />
          </Form.Item>
        </React.Fragment>
      case "checkboxgroup":
        return <Col span={span} key={"item-" + sn}>
          <Form.Item
            label={item.label}
            name={item.name}
            key={sn}
            rules={[{ required: item.required, message: `请选择您的${item.label}` }]}
          >
            <CheckboxGroup placeholder={`请选择您的${item.label}`} defaultValue={item.defaultValue} options={item.value} onChange={this.onChange} />
          </Form.Item></Col>
      case "checkbox":
        return <Col span={span} key={"item-" + sn}>

          <Form.Item
            label={item.label}
            name={item.name}
            valuePropName="checked"
            key={sn}
            rules={[{ required: item.required, message: `请选择您的${item.label}` }]}
          >
            <Checkbox placeholder={`请选择您的${item.label}`} onClick={e => {
              this.value = e.target.checked ? 1 : 0
              console.log(this.value)
            }} checked={item.value == 1} onChange={item.onChange} />
          </Form.Item></Col>
      case "label":
        return <Col span={span} key={"item-" + sn}>
          <Form.Item label={item.label}
            name={item.name}
            key={sn}
          >
            {/* <Input placeholder={`请输入您的${item.label}`} defaultValue=  disabled={true}/>           */}
            <label>{item.value}</label>
          </Form.Item>
        </Col>
      case "input":
        return <Col span={span} key={"item-" + sn}>
          <Form.Item
            name={item.name}
            label={item.label}
            key={sn}
            rules={[{ required: item.required, message: `请输入您的${item.label}` }]}
          >
            <Input placeholder={`请输入您的${item.label}`}
              //  onChange={(e) => {
              //   textChange(formId, e.target.value)                  
              // }}
              disabled={item.readonly} style={{ width: '150px' }} defaultValue={item.value} />
          </Form.Item>

        </Col>
      case "password":
        return <Col span={span} key={"item-" + sn}>
          <Form.Item
            label={item.label}
            name={item.name}
            key={sn}
            rules={[{ required: item.required, message: `请输入您的${item.label}` }]}
          >
            <Input.Password disabled={item.readonly} placeholder={`请输入您的${item.label}`}
              style={{ width: '150px' }} />
          </Form.Item>
        </Col>
      case "radio":
        return <Col span={span} key={"item-" + sn}><Form.Item
          label={item.label}
          name={item.name}
          key={sn}
          rules={[{ required: item.required, message: `请选择您的${item.label}` }]}
        >
          {
            item.isGroup ? (
              <Radio.Group>
                {
                  item.radioArr.map((radio, index) => {
                    return (
                      <Radio key={index} value={radio.value}>{radio.label}</Radio>
                    )
                  })
                }
              </Radio.Group>
            ) : (
              <>
                <Radio value={item.radio.value}>{item.radio.label}</Radio>
              </>
            )
          }

        </Form.Item></Col>
      case "select":
        //  console.log("select",item,this.props.initial[item.name]);
        return <Col span={span} key={"item-" + sn}><Form.Item
          label={item.label}
          name={item.name}
          key={sn}
          rules={[{ required: item.required, message: `请选择您的${item.label}` }]}
        >
          <Select
            placeholder={item.placeholder ? item.placeholder : `请选择您的${item.label}`}
            onChange={item.onChange}>
            {
              item.option?.length ? (
                item.option.map((select, index) => {
                  return (
                    <Select.Option key={index} value={select.value}>1111{select.label}</Select.Option>
                  )
                })
              ) : (
                item.source == 'initial' && (
                  
                  this.props.initial[item.name]?.map((select, index) => {
                    return (
                      <Select.Option key={index} value={select.value}>{select.label}</Select.Option>
                    )
                  })
                )

              )
            }
          </Select>
        </Form.Item></Col>
      case "textarea":
        return <Col span={span} key={"item-" + sn}><Form.Item
          label={item.label}
          name={item.name}
          key={sn}
          rules={[{ required: item.required, message: `请输入您的${item.label}` }]}
        >
          <Input.TextArea placeholder={`请输入您的${item.label}`} />
        </Form.Item></Col>
      case "treeselect":
        return <Col span={span} key={"item-" + sn}>
          <Form.Item
            label={item.label}
            name={item.name}
            key={sn}
            rules={[{ required: item.required, message: `请输入您的${item.label}` }]}
          >
            <TreeSelect
              showSearch
              style={{ width: '100%' }}
              dropdownStyle={{ maxHeight: 400, overflow: 'auto' }}
              placeholder={`请输入您的${item.label}`}
              allowClear
              treeDataSimpleMode
              treeData={item.source == 'initial' ? this.props.initial[item.name] : item.value}
              fieldNames={{ label: 'name', value: 'id', children: 'children' }}
              treeDefaultExpandAll={true}
            ></TreeSelect>
          </Form.Item></Col>
      // 多选
      case "multiple":
        return <Col span={span} key={"item-" + sn}><Form.Item
          label={item.label}
          name={item.name}
          key={sn}
          rules={[{ required: item.required, message: `请选择您的${item.label}` }]}
        >
        </Form.Item></Col>
      //checkbox
      // case "checkbox":
      //   return <Col span={span} key={"item-"+sn}></Col><Form.Item
      //     label={item.label}
      //     name={item.name}
      //     key={i}
      //     rules={[{ required: item.isRequired, message: `请选择您的${item.label}` }]}
      //   >
      //   </Form.Item></Col>
      //checkbox
      case "datepicker":
        return <Col span={span} key={"item-" + sn}><Form.Item
          label={item.label}
          name={item.name}
          key={sn}
          rules={[{ required: item.required, message: `请选择您的${item.label}` }]}
        >
          {item.showTime ? (
            <DatePicker locale={locale} showTime placeholder={`请输入您的${item.label}`} />
          ) : (
            <DatePicker locale={locale} placeholder={`请输入您的${item.label}`} />
          )}
        </Form.Item></Col>
      case "timepicker":
        return <Col span={span} key={"item-" + sn}><Form.Item
          label={item.label}
          name={item.name}
          key={sn}
          rules={[{ required: item.required, message: `请选择您的${item.label}` }]}
        >
          <TimePicker placeholder={`请输入您的${item.label}`} />
        </Form.Item></Col>
      default:
        return (
          <>
          </>
        )
    }
  }

}

export default CommonForm;
