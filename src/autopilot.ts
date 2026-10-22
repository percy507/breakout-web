// 菜单背景的演示 AI：预测最先落到挡板高度的球，把挡板移过去（限速，偶尔会失误）。
import { BALL_R, PADDLE_Y, W } from './config';
import type { Game } from './game';

export class Autopilot {
  private wait = 0;
  private offset = 0;

  update(g: Game, dt: number): void {
    if (g.phase === 'aim') {
      this.wait += dt;
      if (this.wait > 0.8) {
        g.aimAngle = ((55 + Math.random() * 70) * Math.PI) / 180;
        g.launch();
        this.wait = 0;
      }
      return;
    }
    if (g.phase !== 'play') return;
    if (g.hasStuckBall()) {
      this.wait += dt;
      if (this.wait > 0.3) {
        g.launch();
        this.wait = 0;
      }
    }
    let target = g.paddle.x;
    let soonest = Infinity;
    for (const b of g.balls) {
      if (b.stuck || b.dy <= 0) continue;
      const t = (PADDLE_Y - b.y) / b.dy;
      if (t < 0 || t >= soonest) continue;
      soonest = t;
      // 把直线落点按左右墙壁反射折回场内
      const span = W - 2 * BALL_R;
      let u = (b.x + b.dx * t - BALL_R) % (2 * span);
      if (u < 0) u += 2 * span;
      target = BALL_R + (u > span ? 2 * span - u : u) + this.offset * g.paddle.w * 0.35;
    }
    const step = 760 * dt;
    g.movePaddleTo(g.paddle.x + Math.max(-step, Math.min(step, target - g.paddle.x)));
    if (Math.random() < dt * 0.6) this.offset = Math.random() * 2 - 1;
  }
}
