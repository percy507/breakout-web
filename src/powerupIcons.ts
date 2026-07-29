import burstIcon from './assets/powerups/burst.svg?raw';
import multiIcon from './assets/powerups/multi.svg?raw';
import pierceIcon from './assets/powerups/pierce.svg?raw';
import slowIcon from './assets/powerups/slow.svg?raw';
import wideIcon from './assets/powerups/wide.svg?raw';
import type { PowerType } from './types';

/** SVG 图标源码，统一使用白色单色图形表达道具含义 */
const POWERUP_ICON_SVGS: Record<PowerType, string> = {
  wide: wideIcon,
  slow: slowIcon,
  multi: multiIcon,
  pierce: pierceIcon,
  burst: burstIcon,
};

const iconImages = new Map<PowerType, HTMLImageElement>();

/** 返回道具对应的 SVG 图片对象 */
export function getPowerupIcon(type: PowerType) {
  const cachedIcon = iconImages.get(type);
  if (cachedIcon) {
    return cachedIcon;
  }

  const icon = new Image();
  icon.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(POWERUP_ICON_SVGS[type])}`;
  iconImages.set(type, icon);
  return icon;
}
