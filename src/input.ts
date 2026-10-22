// 输入：Pointer Events 统一鼠标与触摸，外加键盘。
// 规则（与 README 一致）：瞄准阶段——鼠标移动/手指拖动瞄准，点击或松手发射；
// 发射后——电脑用鼠标（绝对位置）或方向键控制挡板，手机在任意位置拖动（相对位移）。
import { H, W } from './config';
import type { Game } from './game';

/** 手机拖动的灵敏度（屏幕位移 → 逻辑位移） */
const TOUCH_GAIN = 1.2;

export interface InputHost {
  game(): Game | null;
  /** 是否处于可操作的游戏状态（非菜单、非弹窗、未暂停） */
  active(): boolean;
  togglePause(): void;
  /** 任意用户手势（用于解锁音频） */
  gesture(): void;
}

export class Input {
  keys = { left: false, right: false };
  pointer: 'mouse' | 'touch';
  private pid = -1;
  private pressed = false;
  private lastX = 0;
  private readonly canvas: HTMLCanvasElement;
  private readonly host: InputHost;

  constructor(canvas: HTMLCanvasElement, host: InputHost) {
    this.canvas = canvas;
    this.host = host;
    this.pointer = matchMedia('(pointer: coarse)').matches ? 'touch' : 'mouse';
    window.addEventListener('pointerdown', (e) => this.down(e));
    window.addEventListener('pointermove', (e) => this.move(e));
    window.addEventListener('pointerup', (e) => this.up(e));
    window.addEventListener('pointercancel', () => (this.pressed = false));
    window.addEventListener('keydown', (e) => this.key(e, true));
    window.addEventListener('keyup', (e) => this.key(e, false));
    window.addEventListener('blur', () => {
      this.keys.left = this.keys.right = false;
      this.pressed = false;
    });
    window.addEventListener('contextmenu', (e) => {
      if (this.host.active()) e.preventDefault();
    });
  }

  private toLogical(e: PointerEvent): { x: number; y: number } {
    const r = this.canvas.getBoundingClientRect();
    return {
      x: ((e.clientX - r.left) / r.width) * W,
      y: ((e.clientY - r.top) / r.height) * H,
    };
  }

  /** 点在按钮、弹窗等界面元素上时交给界面处理 */
  private onUi(e: PointerEvent): boolean {
    return (
      e.target instanceof Element &&
      !!e.target.closest('.overlay, .hud, button, select, a')
    );
  }

  private down(e: PointerEvent): void {
    this.host.gesture();
    this.pointer = e.pointerType === 'mouse' ? 'mouse' : 'touch';
    const g = this.host.game();
    if (
      !g ||
      !this.host.active() ||
      this.onUi(e) ||
      (e.pointerType === 'mouse' && e.button !== 0)
    )
      return;
    if (this.pressed && e.pointerId !== this.pid) return;
    this.pid = e.pointerId;
    this.pressed = true;
    this.lastX = e.clientX;
    const p = this.toLogical(e);
    if (g.phase === 'aim') g.aimAt(p.x, p.y);
  }

  private move(e: PointerEvent): void {
    const g = this.host.game();
    if (!g || !this.host.active()) return;
    const p = this.toLogical(e);
    if (e.pointerType === 'mouse') {
      this.pointer = 'mouse';
      if (g.phase === 'aim') g.aimAt(p.x, p.y);
      else g.movePaddleTo(p.x);
      return;
    }
    if (!this.pressed || e.pointerId !== this.pid) return;
    if (g.phase === 'aim') g.aimAt(p.x, p.y);
    else {
      const r = this.canvas.getBoundingClientRect();
      g.movePaddleBy(((e.clientX - this.lastX) / r.width) * W * TOUCH_GAIN);
    }
    this.lastX = e.clientX;
  }

  private up(e: PointerEvent): void {
    if (!this.pressed || e.pointerId !== this.pid) return;
    this.pressed = false;
    const g = this.host.game();
    if (!g || !this.host.active()) return;
    if (g.phase === 'aim' || g.hasStuckBall()) g.launch();
  }

  private key(e: KeyboardEvent, down: boolean): void {
    if (e.target instanceof HTMLSelectElement) return;
    const k = e.key;
    if (down) this.host.gesture();
    if (k === 'ArrowLeft' || k === 'a' || k === 'A') this.keys.left = down;
    else if (k === 'ArrowRight' || k === 'd' || k === 'D') this.keys.right = down;
    else if (down && (k === 'Escape' || k === 'p' || k === 'P')) {
      this.host.togglePause();
      e.preventDefault();
      return;
    } else if (down && (k === ' ' || k === 'ArrowUp' || k === 'w' || k === 'W')) {
      const g = this.host.game();
      if (g && this.host.active()) {
        g.launch();
        e.preventDefault();
      }
      return;
    } else return;
    if (this.host.active()) e.preventDefault();
  }
}
