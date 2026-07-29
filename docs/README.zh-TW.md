# 霓虹打磚塊

[English](../README.md) | [简体中文](README.zh-CN.md) | [繁體中文](README.zh-TW.md) | [日本語](README.ja.md) | [Español](README.es.md) | [Français](README.fr.md) | [Deutsch](README.de.md) | [한국어](README.ko.md) | [Русский](README.ru.md)

網頁版打磚塊原型，用來驗證瞄準、擋板控制、道具和關卡節奏。支援 PC 和手機瀏覽器。

## 執行

```bash
bun install
bun run dev
```

## 建置

```bash
bun run build
```

## 測試

```bash
bun run test
```

## 品質檢查

```bash
bun run lint
bun run lint:fix
```

頁面樣式寫在 `src/styles.less`。

## 玩法

- 點「開始」後先瞄準，再點擊滑鼠或放開手指發射
- PC 發射後用滑鼠或方向鍵控制擋板，手機用手指拖曳
- 清空可破壞磚塊即可通關
- 通關後彈窗漸顯，球和道具會繼續離場
- 每關 3 條生命，支援暫停、繼續、重試和返回主選單
- 首次訪問會按瀏覽器語言自動選擇；進度、聲音和語言偏好會保存在目前瀏覽器

## 磚塊和道具

- 磚塊需要命中 1–12 次
- 灰色攔截物不會破碎，不同外形會改變小球軌道
- 道具包括加寬擋板、減速、雙球、穿透和發散五球

## 主要檔案

- `src/App.tsx`：介面、彈窗和輸入
- `src/game.ts`：遊戲規則和關卡流程
- `src/geometry.ts`：碰撞輔助
- `src/render.ts`：畫面繪製
- `src/i18n.ts`：介面翻譯
