import React from 'react';
import { Button, Result } from 'antd';
import { useHistory } from 'react-router-dom';

const ComingSoon: React.FC = () => {
  const history = useHistory();
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
      <Result
        title='功能开发中'
        subTitle='该功能正在建设中，敬请期待！'
        extra={
          <Button type='primary' onClick={() => history.push('/portal')}>
            回到首页
          </Button>
        }
      />
    </div>
  );
};

export default ComingSoon;
