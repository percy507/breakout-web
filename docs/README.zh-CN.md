# 霓虹打砖块

[English](../README.md) | [简体中文](README.zh-CN.md) | [繁體中文](README.zh-TW.md) | [日本語](README.ja.md) | [Español](README.es.md) | [Français](README.fr.md) | [Deutsch](README.de.md) | [한국어](README.ko.md) | [Русский](README.ru.md)

在真正的 `breakout-web` Git 仓库中整合 Fable 的完整玩法、霓虹画面、特效和音效，以原生 TypeScript 引擎替换旧 React 游戏。支持桌面与手机浏览器，原 Fable 目录保持不动。

## 开发与验证

```bash
bun install
bun run dev
```

```bash
bun run build
bun run test
bun run lint
bun run typecheck
```

保留现有 Vite 5 + TypeScript 5.6 工具链，不新增依赖。构建产物仍是标准 `dist/` 静态站，需要通过 HTTP(S) 服务访问，不是双击即可运行的单文件 HTML。

## 玩法

- 战役：5 章共 30 关，含首领关；逐关解锁，可选关重玩并收集星星
- 无尽：基于种子的程序生成关卡，每 10 层首领；每次新开局生成新种子，层间累计分数
- 共 11 种道具：加宽、减速、双球、穿透、发散五球、激光、磁力、护盾、生命 +1，以及缩短挡板和小球加速两种负面效果
- 双球使现有球数 ×2，发散五球使现有球数 ×5，总数最多 200 球；小球从各现有球的位置沿原方向向外发散
- 砖阵两侧留有通道，小球可绕行至砖阵顶部
- 保留 Fable 的霓虹视觉、粒子特效、音效与音乐，可在设置中分别切换音效和音乐
- 支持简体中文、繁体中文、英语、日语、西班牙语、法语、德语、韩语、俄语；首次按浏览器语言选择，也可手动切换

## 操作与流程

- 主菜单进入战役、已解锁关卡或无尽模式；战役“继续”进入待挑战关卡，不是恢复上一局现场
- 鼠标：移动瞄准，点击发射；发射后移动鼠标控制挡板
- 键盘：←/→ 或 A/D 控制挡板；空格、↑ 或 W 发射；Esc 或 P 暂停/继续
- 触摸：拖动瞄准，松手发射；发射后在游戏区域任意位置拖动，以相对位移控制挡板
- 磁力吸住球后，点击、松手或按发射键可再次发射
- 界面提供暂停、继续、重试、下一关和主菜单操作；无尽重试从第 1 层以新种子重新开始

## 浏览器存档与兼容性

通过 `localStorage` 保存战役解锁进度、星星、各关最高成绩、无尽最高成绩与最高已通关层数，以及语言、音效和音乐偏好。**不保存当前局现场，刷新后不能恢复当前局**；浏览器存储不可用时，记录无法持久保留。

旧 `breakout-web` 存档保留，但因关卡规则不同，不自动迁移到新引擎。相同 origin（协议、主机、端口）下已有 Fable 存档沿用 `neon-breakout:v1` key，保持兼容；更换 origin 不会自动转移存档。

## 主要代码

- `src/main.ts`：入口、主循环、模式切换与结算流程
- `src/config.ts`、`src/campaign.ts`、`src/endless.ts`：配置、战役与无尽生成
- `src/game.ts`、`src/render.ts`、`src/fx.ts`、`src/audio.ts`：原生引擎、画面、特效与音频
- `src/input.ts`、`src/ui.ts`、`src/storage.ts`、`src/i18n/`：输入、界面、存档与九语言文案
