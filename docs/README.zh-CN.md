# 霓虹打砖块

[English](../README.md) | [简体中文](README.zh-CN.md) | [繁體中文](README.zh-TW.md) | [日本語](README.ja.md) | [Español](README.es.md) | [Français](README.fr.md) | [Deutsch](README.de.md) | [한국어](README.ko.md) | [Русский](README.ru.md)

网页版打砖块原型，用来验证瞄准、挡板控制、道具和关卡节奏。支持 PC 和手机浏览器。

## 运行

```bash
bun install
bun run dev
```

## 构建

```bash
bun run build
```

## 测试

```bash
bun run test
```

## 质量检查

```bash
bun run lint
bun run lint:fix
```

页面样式写在 `src/styles.less`。

## 玩法

- 点“开始”后先瞄准，再点击鼠标或松开手指发射
- PC 发射后用鼠标或方向键控制挡板，手机用手指拖动
- 清空可破坏砖块即可通关
- 通关后弹窗渐显，球和道具会继续离场
- 每关 3 条生命，支持暂停、继续、重试和返回主菜单
- 首次访问会按浏览器语言自动选择；进度、声音和语言偏好会保存在当前浏览器

## 砖块和道具

- 砖块需要命中 1–12 次
- 灰色拦截物不会破碎，不同外形会改变小球轨道
- 道具包括加宽挡板、减速、双球、穿透和发散五球

## 主要文件

- `src/App.tsx`：界面、弹窗和输入
- `src/game.ts`：游戏规则和关卡流程
- `src/geometry.ts`：碰撞辅助
- `src/render.ts`：画面绘制
- `src/i18n.ts`：界面翻译
