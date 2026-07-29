# ネオンブロック崩し

[English](../README.md) | [简体中文](README.zh-CN.md) | [繁體中文](README.zh-TW.md) | [日本語](README.ja.md) | [Español](README.es.md) | [Français](README.fr.md) | [Deutsch](README.de.md) | [한국어](README.ko.md) | [Русский](README.ru.md)

狙い、パドル操作、アイテム、ステージ進行を検証するためのWebブロック崩しプロトタイプです。デスクトップとモバイルブラウザで動作します。

## 実行

```bash
bun install
bun run dev
```

## ビルド

```bash
bun run build
```

## テスト

```bash
bun run test
```

## 品質チェック

```bash
bun run lint
bun run lint:fix
```

スタイルは `src/styles.less` にあります。

## 遊び方

- Start を押した後に狙いを定め、クリックまたは指を離して発射します
- デスクトップは発射後にマウスまたは方向キー、モバイルはドラッグで操作します
- 壊せるブロックをすべて消すとステージクリアです
- クリア後はポップアップがフェードインし、ボールとアイテムは画面外へ流れます
- 各ステージは3ライフで、一時停止、続行、リトライ、メインメニューに対応します
- 初回はブラウザ言語から自動選択されます。進行、音、言語設定はこのブラウザに保存されます

## ブロックとアイテム

- ブロックは1〜12回のヒットで壊れます
- 灰色の障害物は壊れず、形によってボールの軌道が変わります
- アイテムはパドル拡張、減速、ダブルボール、貫通、5方向拡散です

## 主なファイル

- `src/App.tsx`：UI、ダイアログ、入力
- `src/game.ts`：ゲームルールとステージ進行
- `src/geometry.ts`：衝突補助
- `src/render.ts`：Canvas描画
- `src/i18n.ts`：UI翻訳
