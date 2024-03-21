/**
 * 设置样式
 * @param config json数据
 */
export const getStyles = (config: any) => {
  let result: any = {
    width: config.width,
    height: config.height,
    animationIterationCount: config.styleAnimateInfinite ? 'infinite' : 1,
    textShadow: `${config.styleTextShadowX}px ${config.styleTextShadowY}px ${config.styleTextShadowF}px ${config.styleTextShadowC}`,
    boxShadow: `${config.styleBoxShadowX}px ${config.styleBoxShadowY}px ${config.styleBoxShadowF}px ${config.styleBoxShadowC} ${config.styleBoxInset ? 'inset' : ''}`,
  };
  for (let filed in config) {
    if (filed.indexOf('style') === 0) {
      let newField = filed.substring(5);
      newField = newField.replace(newField[0], newField[0].toLocaleLowerCase());
      result[newField] = config[filed];
    }
  }
  result.animationDelay = config.styleAnimationDelay + 's';
  result.animationDuration = config.styleAnimationDuration + 's';
  return result;
};
