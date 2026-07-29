# 네온 벽돌깨기

[English](../README.md) | [简体中文](README.zh-CN.md) | [繁體中文](README.zh-TW.md) | [日本語](README.ja.md) | [Español](README.es.md) | [Français](README.fr.md) | [Deutsch](README.de.md) | [한국어](README.ko.md) | [Русский](README.ru.md)

조준, 패들 조작, 파워업, 레벨 흐름을 검증하기 위한 웹 벽돌깨기 프로토타입입니다. 데스크톱과 모바일 브라우저에서 동작합니다.

## 실행

```bash
bun install
bun run dev
```

## 빌드

```bash
bun run build
```

## 테스트

```bash
bun run test
```

## 품질 확인

```bash
bun run lint
bun run lint:fix
```

스타일은 `src/styles.less`에 있습니다.

## 플레이

- 시작을 누른 뒤 먼저 조준하고, 클릭하거나 손을 떼어 발사합니다
- 데스크톱은 발사 후 마우스나 방향키를 사용하고, 모바일은 드래그합니다
- 깰 수 있는 모든 벽돌을 없애면 레벨을 클리어합니다
- 클리어 후 팝업이 서서히 나타나고 공과 파워업은 화면 밖으로 사라집니다
- 각 레벨은 목숨 3개이며 일시정지, 계속, 재시도, 메인 메뉴를 지원합니다
- 첫 방문 시 브라우저 언어를 자동 감지하며, 진행도와 소리, 언어 설정은 이 브라우저에 저장됩니다

## 벽돌과 파워업

- 벽돌은 1~12번 맞아야 깨집니다
- 회색 장애물은 깨지지 않고, 모양에 따라 공 궤도가 바뀝니다
- 파워업은 패들 확장, 감속, 더블 볼, 관통, 5방향 확산입니다

## 주요 파일

- `src/App.tsx`: UI, 대화상자, 입력
- `src/game.ts`: 게임 규칙과 레벨 흐름
- `src/geometry.ts`: 충돌 보조 함수
- `src/render.ts`: 캔버스 렌더링
- `src/i18n.ts`: UI 번역
