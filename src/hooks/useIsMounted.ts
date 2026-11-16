import { useRef, useEffect, useCallback } from 'react';

/**
 * 自定义 Hook，用于跟踪组件是否已挂载
 * 防止在组件卸载后更新状态，避免内存泄漏警告
 * 
 * @returns 一个函数，调用该函数返回组件是否已挂载
 * 
 * @example
 * const isMounted = useIsMounted();
 * 
 * useEffect(() => {
 *   someAsyncFunction().then(() => {
 *     if (!isMounted()) return; // 组件已卸载，不更新状态
 *     setState(someValue);
 *   });
 * }, []);
 */
function useIsMounted() {
  const isMountedRef = useRef(true);

  useEffect(() => {
    // 组件挂载时设为 true（实际上 ref 初始值就是 true）
    isMountedRef.current = true;

    // 组件卸载时设为 false
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // 返回一个函数，调用该函数可以检查组件是否已挂载
  const isMounted = useCallback(() => isMountedRef.current, []);

  return isMounted;
}

export default useIsMounted;
