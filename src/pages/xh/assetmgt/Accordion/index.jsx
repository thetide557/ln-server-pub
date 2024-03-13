import React, { Component, Fragment, } from 'react';
import './index.less';
import { CheckOutlined, CloseOutlined, PlusOutlined, ClusterOutlined } from '@ant-design/icons';
import { Input, Menu, Modal, Tree, message } from 'antd';
// import { getAssetsTree } from '@/services/assets/asset';
// import { addAssetTree, updateAssetTree, deleteAssetTree } from '@/services/assets/asset-tree';
import queryString from 'query-string';

const status = queryString.parse(location.search).status === undefined ? 0 : parseInt("" + queryString.parse(location.search).status);
const index = queryString.parse(location.search).index === undefined ? 0 : parseInt("" + queryString.parse(location.search).index);

class Accordions extends Component {

  constructor(props) {
    super(props);
    this.state = {
      dataCenterId: 0,
      defaultExpandKeys: [],
      treeData: [],
      pageX: 0,
      pageY: 0,
      bindIndex: 0,
      node: {},
      curValue: "",
      showMenu: false,
      openStatus: 0,
      refreshFlag: this.props.refreshFlag,
      expandAll: true,
      autoExpandParent: true,
      style: {
        collapsed: {
          display: 'block'
        },
        expanded: {
          display: 'block',
        },
        selected: {
          color: '#1478e3'
        },
        noSelect: {
          color: '#000000'
        }
      }
    }
  }


  componentDidMount() {
  
    console.log('componentDidMount',this.props);

    this.state.defaultExpandKeys = this.props.expandedKeys;

    // if (status > 0) {
    this.state.openStatus = status;
    this.state.bindIndex = index;
    // this.state.treeData = this.props.treeData;
    this.setState(this.state);
    // this.changeItem(status, index);
    console.log('查看当前组件的状态信息', this.state);
    // }
  }

  operateCategory = (event) => {
    this.state.curValue = "";
    if (event.key === 'delete') {
      Modal.confirm({
        title: "确认要删除吗",
        onOk: async () => {
          this.props.handleClick(this.state.node["id"], 0, "delete");
        },
        onCancel() { },
      });
    } else if (event.key === 'add') {
      this.props.handleClick(-1, this.state.node.id, "add");
    } else if (event.key === 'update') {
      this.changeEditProperty(this.props.treeData, this.state.node.id, true)
    } else if (event.key === 'up') {
      let node = {
        type: "up",
        id: this.state.node.id
      }
      this.props.handleClick(this.state.node["id"], node, "move");
      this.state.showMenu = false;
    } else if (event.key === 'down') {
      let node = {
        type: "down",
        id: this.state.node.id
      }
      this.props.handleClick(this.state.node["id"], node, "move");
      this.state.showMenu = false;
    }
    this.state.showMenu = false;
    this.setState(this.state)
  }

  changeEditProperty = (arr, id, isEdit) => arr.map(item => {
    item.isEdit = item.id === id ? isEdit : false;
    (
      {
        ...item,
        children: item.children ? this.changeEditProperty(item.children, id, isEdit) : [] // 这里要判断原数据有没有子级如果没有判断会报错
      })
  })

  saveNode = (id, parent_id) => {
    console.log("saveNode);", id, this.state.curValue);
    if (this.state.curValue != null && this.state.curValue.length > 0) {
      let params = {
        id: id,
        name: this.state.curValue,
        parent_id: parent_id
      }
      this.props.handleClick(this.state.node["id"], params, "update");
    } else {
      message.error("修改信息无效！检查输入内容")
    }
  };

  onClose = (id) => {
    this.changeEditProperty(this.props.treeData, id, false)
  };

  menu = (
    <Menu className='sub_menu'
      onClick={event => this.operateCategory(event)}
      items={[
        this.props.addMenu && {
          key: 'add',
          label: <span>新增</span>,
        },
        {
          key: 'delete',
          label: <span>删除</span>,
        },
        {
          key: 'update',
          label: <span>重命名</span>,
        },
        {
          key: 'up',
          label: <span>上移</span>,
        },
        {
          key: 'down',
          label: <span>下移</span>,
        },
      ]}
    />
  );



  titleRender = (node) => {
    // console.log("titleRender: ",node)
    if (node.isEdit) {
      return (
        <div style={{ position: 'relative', width: '100%' }}>
          <Input defaultValue={node.name}
            maxLength={25}
            style={{ width: '125px' }}
            onChange={(e) => {
              this.state.curValue = e.target.value
              this.setState(this.state);
            }}
            onPressEnter={(e) => {
              this.saveNode(node.id, node.parent_id);
            }}
            onKeyDown={(e) => {
              if (e.code === 'Escape') {
                this.onClose(node);
              }
            }}></Input>
          <CloseOutlined
            style={{ marginLeft: 10 }}
            onClick={() => {
              this.onClose(node);
            }}
          />
          <CheckOutlined style={{ marginLeft: 10 }} onClick={() => this.saveNode(node.id, node.parent_id)} />

        </div>
      );
    } else {
      return (
        <div style={{ position: 'relative', width: '100%' }}>
          <span>
            {node.name}
            {node.id > 0 && (
              <Fragment ><span style={{ marginLeft: "5px" }} className="tree_node_count"> ({node.count})</span></Fragment>
            )}
          </span>
        </div>
      );
    }

  };
  addEditProperty = arr => arr.map(item => ({
    ...item,
    isEdit: false,
    children: item.children ? this.addEditProperty(item.children) : [] // 这里要判断原数据有没有子级如果没有判断会报错
  }))

  

  handleRightClick = ({ event, node }) => {
    event.stopPropagation();
    if (node.id > 0) {
      this.state.pageX = event.pageX;
      this.state.pageY = event.pageY;
      this.state.node = (node);
      this.state.showMenu = true;
      this.setState(this.state)
    }
  };
  onSelect = (selectedKeys, info) => {
    // this.state.showMenu = false;
    if(selectedKeys.length>0){
        this.props.handleClick(selectedKeys[0], info, "query");
    }
    
  };

  renderMenu = () => {
    if (this.state.pageX && this.state.pageY) {
      return (
        <div
          tabIndex={-1}
          style={{
            display: this.state.showMenu ? 'inherit' : 'none',
            position: 'fixed',
            zIndex: 1,
            left: this.state.pageX + 36,
            top: this.state.pageY + 2,
          }}
          // ref={dropdownElement}
          onBlur={(e) => {
            e.stopPropagation();
            this.state.showMenu = false;
            this.setState(this.state)
          }}
        >

          {this.menu}
        </div>
      );
    }
    return null;
  };

  hiddenMenu = (e) => {
    // e.stopPropagation();
    // console.log("hiddenMenu", e);
    // this.state.showMenu = false;
    // this.setState(this.state)
  }

  onExpand = (expandedKeysValue) => { 
    console.log('onExpand', expandedKeysValue); // if not set autoExpandParent to false, if children expanded, parent can not collapse. 
   // or, you can remove all expanded children keys.  
  //  setExpandedKeys(expandedKeysValue); 
   setAutoExpandParent(false); 
  };

  render() {
    let { treeData, expandAll, expandedKeys,selectedKey} = this.props;
   
      return (
        <>
        {treeData!=null && ( 
          <>
          <div className='bread-crumb-container_category' onClick={e => {
            // this.hiddenMenu(e);
          }}>
            <div
              className="collapse-content"
              style={this.state.style.collapsed}
            >
    
              <Tree
                showLine={true}
                showIcon={true}
                style={{ marginTop: 0 }}
                titleRender={this.titleRender}
                onRightClick={this.handleRightClick}
                treeData={treeData}
                defaultExpandAll
                // checkStrictly
                onExpand={this.onExpand}
                defaultSelectedKeys={[selectedKey]}
                multiple={false}
                defaultExpandedKeys={expandedKeys}
                fieldNames={{ key: 'id', title: 'name' }}
                onSelect={this.onSelect}
              />
              {this.renderMenu()}
            </div>
            {this.props.addButton && (
              <div className='addheader' onClick={e => {
                this.props.handleClick(-1, 0, "add");
              }} >
                <PlusOutlined />新增二级组织
              </div>
            )}
    
          </div>
          </>        
         
        
        )}
        </>
      )
  }
}
export default Accordions;
