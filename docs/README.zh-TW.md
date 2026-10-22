# 霓虹打磚塊

[English](../README.md) | [简体中文](README.zh-CN.md) | [繁體中文](README.zh-TW.md) | [日本語](README.ja.md) | [Español](README.es.md) | [Français](README.fr.md) | [Deutsch](README.de.md) | [한국어](README.ko.md) | [Русский](README.ru.md)

在 `breakout-web` 整合 Fable 的完整玩法、霓虹畫面、特效與音效，以原生 TypeScript 引擎取代舊 React 遊戲。支援電腦與手機瀏覽器；原 Fable 目錄保持不動。

## 開發與驗證

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

保留既有 Vite 5 + TypeScript 5.6 工具鏈，不新增依賴。建置產物為標準 `dist/` 靜態網站，須透過 HTTP(S) 服務存取，不是雙擊執行的單檔 HTML。

## 玩法

- 戰役共 5 章 30 關，包含首領關卡、選關與星星
- 無盡模式依種子程序生成關卡，每 10 層首領；每次新開局使用新種子
- 11 種道具：加寬、減速、雙球、穿透、發散五球、雷射、磁力、護盾、生命 +1，以及縮短擋板與小球加速兩種負面效果
- 雙球使現有球數 ×2，發散五球使現有球數 ×5，總數最多 32 球；小球從各現有球的位置沿原方向向外發散
- 磚陣兩側留有通道，小球可繞行至磚陣頂部
- 9 種介面語言，首次依瀏覽器語言選擇，也可在設定切換

## 操作

- 從主選單進入戰役、已解鎖關卡或無盡模式
- 滑鼠：移動瞄準，點擊發射；發射後移動控制擋板
- 鍵盤：←/→ 或 A/D 控制擋板；空白鍵、↑ 或 W 發射；Esc 或 P 暫停／繼續
- 觸控：拖曳瞄準、放開發射；發射後在遊戲區域任意位置拖曳控制擋板
- 磁力吸住球後可點擊、放開或按發射鍵再次發射；介面提供暫停、重試、下一關與主選單

## 瀏覽器存檔

`localStorage` 保存戰役解鎖進度、星星、各關最高分、無盡最高分與最高已通關層數，以及語言、音效和音樂偏好。**重新整理不會恢復目前這一局**；瀏覽器儲存空間須可用才能保留紀錄。

舊 `breakout-web` 存檔保留，但關卡規則不同，不自動遷移。相同 origin（協定、主機、連接埠）下的 Fable 存檔沿用 `neon-breakout:v1` key，保持相容；更換 origin 不會轉移存檔。
