import { useEffect, useState } from 'react';

/**
 * 设计稿尺寸
 */
const DESIGN_WIDTH = 1920;
const DESIGN_HEIGHT = 1080;

/**
 * 等比例缩放 Hook
 * 根据窗口尺寸计算缩放比例，使页面按设计稿比例自适应
 */
export function useScale() {
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const updateScale = () => {
      const windowWidth = window.innerWidth;
      const windowHeight = window.innerHeight;

      // 计算宽高比，取较小值保证内容完整显示
      const scaleX = windowWidth / DESIGN_WIDTH;
      const scaleY = windowHeight / DESIGN_HEIGHT;
      const newScale = Math.min(scaleX, scaleY);

      setScale(newScale);
    };

    updateScale();
    window.addEventListener('resize', updateScale);

    return () => {
      window.removeEventListener('resize', updateScale);
    };
  }, []);

  return scale;
}

/**
 * 获取缩放容器样式（外层居中容器）
 */
export function getScaleWrapperStyle(scale: number): React.CSSProperties {
  return {
    position: 'fixed',
    top: '50%',
    left: '50%',
    width: `${DESIGN_WIDTH}px`,
    height: `${DESIGN_HEIGHT}px`,
    transform: `translate(-50%, -50%) scale(${scale})`,
    transformOrigin: 'center center',
    overflow: 'hidden',
  };
}
