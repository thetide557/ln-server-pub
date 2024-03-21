import React, { useEffect, useRef, useState } from 'react';
import './index.less';
import { AppstoreAddOutlined, CheckOutlined, CloseOutlined, DownOutlined, RightOutlined } from '@ant-design/icons';
import { Input, Menu, Modal, Tree, message } from 'antd';
import { getAssetsTree} from '@/services/assets/asset';
import { addAssetTree,updateAssetTree,deleteAssetTree } from '@/services/assets/asset-tree';
import queryString from 'query-string';


interface Group {
  label: string;
  value: number;
}

interface Props {
  handleClick: (values: any,status:any,index) => Promise<void>;
  assetStatus: Group[];
  isAutoInitialized:boolean;
}

export default function Accordions(props: Props) {
  const { assetStatus } = props;
  
  const [treeData, setTreeData] = useState<any>();
  const [isAutoInitialized, setIsAutoInitialized] = useState<boolean>(props.isAutoInitialized)
  const [showMenu, setShowMenu] = useState(false);
  const status = queryString.parse(location.search).status === undefined ? 0 : parseInt("" + queryString.parse(location.search).status);
  const index = queryString.parse(location.search).index === undefined ? 0 : parseInt("" + queryString.parse(location.search).index);
  const [pageX, setPageX] = useState(0);
  const [openStatus, setOpenStatus] = useState<number>(status)
  const [bindIndex, setBindIndex] = React.useState(index);
  
  const [pageY, setPageY] = useState(0);
  const [selectNode,setSelectNode]= useState<any>({});
  const dropdownElement: React.RefObject<HTMLDivElement> = useRef(null);
  const [curValue, setCurValue] = useState<string>('');
  const menu = (
    <Menu className='sub_menu'
      onClick={event => operateCategory(event)}
      items={[
        {
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
        // {
        //   key: 'move',
        //   label: <span>下移</span>,
        // },
      ]}
    />
  );
  const addEditProperty = arr => arr.map(item => ({
    ...item,
    isEdit: false,
    children: item.children?addEditProperty(item.children):[] // 这里要判断原数据有没有子级如果没有判断会报错
  }))


  useEffect(() => {  
    console.log("useEffect----openStatus")
    if(openStatus>0){
      loadingTree();
      let initParam={
        type:"type",
        query:{DEVICE_STATUS:openStatus}
      }
      if(isAutoInitialized){
        props.handleClick(initParam,openStatus,bindIndex);
      } 
    }else{
      let initParam={
        type:'list',
        query:{}
      }   
      if(isAutoInitialized){
        props.handleClick(initParam,openStatus,bindIndex);
      }     
      
    } 
    
  }, [openStatus,bindIndex]);
  useEffect(() => {  
    console.log("useEffect----openStatus")
    if(openStatus>0){
      loadingTree();
      let initParam={
        type:"type",
        query:{DEVICE_STATUS:openStatus}
      }
      if(isAutoInitialized){
        props.handleClick(initParam,openStatus,bindIndex);
      } 
    }else{
      let initParam={
        type:'list',
        query:{}
      }   
      if(isAutoInitialized){
        props.handleClick(initParam,openStatus,bindIndex);
      }     
      
    } 
    
  }, []);
  const changeEditProperty = (arr,id,isEdit) => arr.map(item => {
    item.isEdit= item.id===id?isEdit:false;
    (
    {
    ...item,    
    children: item.children?changeEditProperty(item.children,id,isEdit):[] // 这里要判断原数据有没有子级如果没有判断会报错
  })})

  const operateCategory = (event) => {
    // debugger
    console.log("operateCategory",selectNode); 
    setCurValue("");
    if(event.key === 'delete'){
      // debugger;
      Modal.confirm({
        title: "确认要删除吗",
        onOk: async () => {
          console.log("delete)",openStatus);
          deleteAssetTree(selectNode["id"]).then(() =>{
            loadingTree();
          })
   
        },
        onCancel() { },
      });



      


    }else if(event.key === 'add'){
      let params = {
        name:"新建目录",
        status:openStatus,
        parent_id:selectNode["id"]
      }
      addAssetTree(params).then(() =>{
        loadingTree();
     })
    }else{
      changeEditProperty(treeData,selectNode["id"],true)
    }
    setShowMenu(false)
  }
  
  const renderMenu = () => {
    if (pageX && pageY) {
      return (
        <div
          tabIndex={-1}
          style={{
            display: showMenu ? 'inherit' : 'none',
            position: 'fixed',
            zIndex:1,
            left: pageX + 36,
            top: pageY + 2,
          }}
          ref={dropdownElement}
          onBlur={(e) => {
            e.stopPropagation();
            setShowMenu(false);
          }}
        >
          {menu}
        </div>
      );
    }
    return null;
  };

  const changeItem = (status,index) => {
      setBindIndex(index);
      setShowMenu(false);
      setOpenStatus(status);    
           
  };
  const onSelect = (selectedKeys: React.Key[], info: any) => {
    setShowMenu(false);
    let query = info.selectedNodes[0];
    console.log("debugger",query);
    props.handleClick(info.selectedNodes[0],openStatus,bindIndex);
  };

  const loadingTree = () => {
    
    getAssetsTree(openStatus).then(({dat}) => {      
    const treeData =  addEditProperty(dat);
      setTreeData(treeData);
      console.log("treeData",treeData);
    })
  };


  const saveNode = (id,parent_id) => {    
    console.log("saveNode);",id,curValue);
    let params = {
      id:id,
      name:curValue,
      parent_id:parent_id,
      status:openStatus,
    }
    updateAssetTree(params).then((res) => {
      message.success("修改成功");
      loadingTree()
    })
   
  };

  const onClose = (id) => {
    changeEditProperty(treeData,id,false)
    // setTreeData(treeData.slice());
  };


  const titleRender = (node) => {
      
      if(node.management_ip!=null && node.management_ip.length>0  &&  node.type=='asset'){
        node.name = node.management_ip;
      }else if( (node.name ==null || node.name=='') && node.type=='asset'){
        node.name = node.serial_number
      }   
      // console.log("node", node.id,node.name);
      if(node.isEdit){
        return (
          <div style={{ position: 'relative', width: '100%' }}>
                <Input defaultValue={node.name}
                maxLength={25}
                style={{ width: '150px' }}
                onChange={(e) => {
                  setCurValue(e.target.value);
                }}
                onPressEnter={(e) => {                  
                  saveNode(node.id,node.parent_id);
                }}
                onKeyDown={(e) => {
                  if (e.code === 'Escape') {
                   onClose(node);
                  }
                }}></Input>
                <CloseOutlined
                  style={{ marginLeft: 10 }}
                  onClick={() => {
                    onClose(node);
                  }}
                />
                <CheckOutlined style={{ marginLeft: 10 }} onClick={() => saveNode(node.id,node.parent_id)} />
                
          </div>
        );
      }else{
        return (
          <div style={{ position: 'relative', width: '100%' }}>
              <span>{node.name}</span>
               <span style={{ position: 'absolute', right: 5 }}>           
            </span>
          </div>
        );
      }     
      
  };

  const handleRightClick = ({ event, node }: any) => {
    // debugger
    event.stopPropagation();
    setPageX(event.pageX);
    setPageY(event.pageY);
    setSelectNode(node);
    if(node.type!=="asset"){
      setShowMenu(true);
    }else{
      setShowMenu(false);
    }    
  };

  const addTreeRootClick = ({ event}: any) => {
    // debugger
    // event.stopPropagation();
    setPageX(event.pageX);
    setPageY(event.pageY);
    // setSelectNode(node);
    // if(node.type!=="asset"){
    //   setShowMenu(true);
    // }else{
    //   setShowMenu(false);
    // }    
  };

  const addCatlog = (status,index)=>{
    let params = {
      status:status,
      name:"新建目录"
    }
    // debugger
    addAssetTree(params).then(()=>{
      loadingTree()
    });
  }

  const style = {
    collapsed: {
      display: 'none'
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
  };
  return (
    <div className='bread-crumb-container'>
      {assetStatus.map(({ label,value }, i) => (
        <div className='currentDiv' key={i}  style={{ position: 'relative' }}>
          <div className='header'>
            <AppstoreAddOutlined/>
            <span className='title'    onClick={() => changeItem(value,i)} style={bindIndex != i ? style.noSelect : style.selected}>{label}</span>    
                                 
            {i>0 && bindIndex == i && (  
              <>
              <span onClick={e=>{
                  addCatlog(value,i);
               }} className='add_category' title='添加目录'  > +</span>           
              <DownOutlined className='jiantou0'/>
              </> 
            )}
            {i>0 && bindIndex != i && (
              <RightOutlined className='jiantou1' />
            )}

          </div>
          { i>0 && (
                <div
                  className="collapse-content"
                  style={bindIndex != i ? style.collapsed : style.expanded}
                >
                  <Tree
                    showLine={true}
                    showIcon={true}
                    style={{marginTop:0}} 
                    titleRender={titleRender}
                    onRightClick={handleRightClick}
                    defaultExpandAll={true}
                    fieldNames={{ key: 'id', title: 'name' }}
                    onSelect={onSelect}
                    treeData={treeData}
                  />
                  {renderMenu()}
                </div>
           )}

        </div>
      ))}
    </div>
  );
}
