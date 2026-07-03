# Vampire Survivors 스타일 2D 자동 슈터 — 개발 계획

## 1. 게임 개요

| 항목 | 내용 |
|------|------|
| 장르 | 2D 탑다운 자동 슈터 (Survivor-like) |
| 플랫폼 | 웹 브라우저 (HTML5 Canvas + Vanilla JavaScript) |
| 참고작 | Vampire Survivors, Brotato, 20 Minutes Till Dawn |
| 목표 플레이 시간 | 1판 5~10분 (데모 기준) |

플레이어는 화면 중앙 근처에서 **이동만** 조작하고, **공격은 자동**으로 이루어진다. 시간이 지날수록 적이 늘어나며, 처치한 적에서 경험치를 모아 레벨업하고 무기·능력을 강화해 생존한다.

---

## 2. 핵심 게임 루프

```
시작 → 이동하며 적 처치 → 경험치 획득 → 레벨업 → 업그레이드 선택
  ↑                                              ↓
  └─────────────── 생존 (시간 경과) ←──────────────┘
```

1. **이동**: WASD 또는 방향키로 8방향 이동
2. **자동 공격**: 보유 무기가 쿨다운마다 가장 가까운 적(또는 범위 내 적)을 공격
3. **적 스폰**: 시간 경과에 따라 스폰 속도·수·체력 증가
4. **경험치**: 적 처치 시 보석(젬) 드롭 → 흡수 시 XP 증가
5. **레벨업**: XP 바가 차면 일시정지 후 3가지 업그레이드 중 1개 선택
6. **패배**: HP가 0이 되면 게임 오버, 생존 시간·처치 수 표시

---

## 3. 기술 스택

| 구분 | 선택 |
|------|------|
| 마크업 | `index.html` — Canvas + 최소 UI 오버레이 |
| 로직 | `js/` — ES6 모듈 또는 단일 `game.js` (초기엔 단일 파일로 시작 가능) |
| 렌더링 | HTML5 Canvas 2D API |
| 입력 | Keyboard API (`keydown` / `keyup`) |
| 루프 | `requestAnimationFrame` + 고정 타임스텝(선택) |
| 에셋 | 초기엔 도형(원·사각형)으로 프로토타입, 이후 스프라이트 교체 가능 구조 |

**의존성 없음** — 빌드 도구 없이 브라우저에서 `index.html` 직접 열기.

---

## 4. 파일 구조 (예정)

```
GAME/
├── index.html          # 진입점, Canvas, HUD DOM
├── GAME_PLAN.md        # 본 계획서
├── css/
│   └── style.css       # HUD, 레벨업 모달, 게임 오버 화면
└── js/
    ├── main.js         # 초기화, 게임 루프
    ├── game.js         # 게임 상태, 웨이브, 승패
    ├── player.js       # 플레이어 이동·스탯
    ├── enemy.js        # 적 AI, 스폰
    ├── weapon.js       # 무기 종류·발사 로직
    ├── projectile.js   # 투사체·근접 판정
    ├── pickup.js       # XP 젬, 흡수
    ├── upgrade.js      # 레벨업 옵션 생성
    ├── input.js        # 키 입력
    ├── render.js       # Canvas 그리기
    └── utils.js        # 거리, 충돌, 랜덤 등
```

초기 MVP는 `index.html` + `game.js` 단일 파일로도 가능. 이후 위 구조로 분리.

### 4.1 스프라이트 시트 가이드
image폴더 안에 sprite라는 단어로 시작하는 스프라이트 시트가 있는데, 가로세로 64x64 사이즈야.
그 시트 안엔 16x16 픽셀인 이미지가 4행 4열로 총 16개가 들어 있어. 그리고 1열, 2열, 3열 ,4열 에 포함된 각각 4개의 행들이 하나의 모션을 이루는 이미지야.
1열엔 아래 방향으로 이동하는 이미지, 2열엔 윗 방향으로 이동하는 이미지, 3열엔 왼쪽 방향으로 이동하는 이미지, 4열엔 오른쪽 방향으로 이동하는 이미지가 있어. 
이걸 사용해서 메인 캐릭터 스프라이트 애니메이션을 만들어줘

---

## 5. 화면·UI

### 5.1 게임 화면
- **해상도**: 1280×720 (또는 960×540) Canvas, `object-fit`으로 비율 유지
- **카메라**: 플레이어 중심 (월드 좌표 > 화면 좌표 변환)
- **월드**: 맵보다 넓은 무한 평면 느낌 (배경 타일 또는 단색 + 그리드)

### 5.2 HUD (항상 표시)
- HP 바 (좌상단)
- XP 바 + 현재 레벨
- 생존 시간 (mm:ss)
- 처치 수 (선택)
- **젬 미니맵** (우측 상단, 140×140px) — 필드에 존재하는 XP 젬 위치 실시간 표시

### 5.2.1 젬 미니맵
- **위치**: 화면 우측 상단, 일시정지 버튼 위
- **표시 대상**: 플레이어(녹색 점) + 현재 필드에 드롭된 모든 XP 젬(청록색 점)
- **좌표 변환**: 무한 맵이므로 플레이어·젬 전체를 포함하는 동적 범위를 계산해 미니맵에 맞춤 스케일
- **실시간 동기화**: 적 처치 시 젬 드롭 → 미니맵에 즉시 표시, 흡수 시 즉시 제거
- **갱신 시점**: 매 프레임 `pickups` 배열 기준으로 렌더 (게임 일시정지·레벨업 중에도 현재 상태 유지)

### 5.3 오버레이
- **레벨업**: 반투명 배경 + 3개 카드 (무기 추가 / 무기 강화 / 패시브)
- **게임 오버**: 생존 시간, 처치 수, 재시작 버튼
- **시작 화면**: 제목, 조작법, Start 버튼

---

## 6. 플레이어

| 스탯 | 초기값 (예시) | 비고 |
|------|---------------|------|
| HP | 100 | 패시브로 최대 HP 증가 가능 |
| 이동 속도 | 200 px/s | 업그레이드 가능 |
| 픽업 범위 | 80 px | 젬 자동 흡수 반경 |
| 무기 슬롯 | 최대 6개 | 동시 보유 무기 수 |

**조작**
- `WASD` / 방향키: 이동
- 레벨업 시 마우스 클릭 또는 `1` `2` `3`으로 선택
- `Esc`: 일시정지 (선택)

---

## 7. 무기 시스템 (MVP)

모든 무기는 **쿨다운 기반 자동 발동**. 레벨업으로 신규 획득 또는 기존 무기 레벨 +1 (최대 Lv.5~8).

| 무기 | 동작 | Lv.1 | 강화 방향 |
|------|------|------|-----------|
| **마법 화살** | 가장 가까운 적에게 직선 투사체 | 1발, 중간 데미지 | 발사 수, 관통, 데미지 |
| **회전 낫** | 플레이어 주위 원 궤도 | 1개 | 개수, 반경, 회전 속도 |
| **번개** | 랜덤 적에게 즉시 타격 | 1타겟 | 타겟 수, 범위 스플래시 |
| **마늘** (패시브형) | 주변 적에게 지속 피해 | 작은 원 | 반경, DPS |
| **관통 창** | 전방 직선 관통 | 짧은 거리 | 길이, 너비, 관통 수 |

**구현 포인트**
- `Weapon` 클래스: `cooldown`, `level`, `fire(player, enemies)`
- 투사체는 `Projectile` 배열로 관리, 화면 밖·수명 만료 시 제거
- 근접/오라형은 매 프레임 `update`에서 충돌 검사

---

## 8. 적 (Enemy)

### 8.1 기본 적 — 슬라임
- 플레이어를 향해 직선 추적
- 접촉 시 플레이어에게 데미지 (쿨다운으로 연타 방지)
- 처치 시 XP 젬 1개 드롭

### 8.2 스폰 규칙
- 플레이어 시야 **밖** 원형 링에서 스폰 (갑자기 등장 방지)
- `spawnRate = baseRate * (1 + time * 0.02)` — 시간에 비례해 빨라짐
- `maxEnemies` 상한 (성능 보호, 예: 300~500)
- 3분·5분 마일스톤에서 **엘리트** (HP 3배, XP 2배) 비율 증가 (후순위)

### 8.3 난이도 곡선
| 시간 | 변화 |
|------|------|
| 0~1분 | 적 수 적음, HP 낮음 |
| 1~3분 | 스폰 가속, 소규모 무리 |
| 3분+ | HP·속도 소폭 증가, 화면 밀도 상승 |

---

## 9. 경험치·레벨업

1. 적 사망 → `Pickup` (젬) 생성
2. 플레이어 `pickupRadius` 안이면 젬이 플레이어 쪽으로 이동 (자석 효과)
3. 흡수 시 `xp += gem.value`
4. `xp >= xpToNextLevel` → `level++`, `xpToNextLevel` 증가 (예: `100 * 1.2^level`)
5. 게임 일시정지, `UpgradeSystem`이 3개 옵션 생성
6. **미니맵**: 드롭·흡수된 젬을 우측 상단 미니맵에 실시간 반영해 위치 파악 지원

**업그레이드 풀**
- 미보유 무기 추가 (슬롯 여유 있을 때)
- 보유 무기 레벨업 (미만렙일 때)
- 패시브: 최대 HP, 이동속도, 픽업 범위, 쿨다운 감소(%)

옵션이 3개 미만이면 중복 허용 또는 패시브로 채움.

---

## 10. 충돌·물리

- **원-원 충돌**: 플레이어·적·투사체·젬
- **AABB** (선택): 직사각형 히트박스 무기
- 적끼리 **가벼운 분리** (겹침 완화): 겹칠 때 살짝 밀어냄
- 맵 경계: 없음 (무한) 또는 소프트 벽 (후순위)

---

## 11. 렌더링 순서

1. 배경 (그리드/타일)
2. XP 젬
3. 적
4. 투사체·이펙트
5. 플레이어
6. 무기 오라 (낫 궤도 등)
7. HUD (Canvas 또는 DOM)

색상 팔레트 (프로토타입):
- 배경: `#1a1a2e`
- 플레이어: `#4ecca3`
- 적: `#e94560`
- 젬: `#00d9ff`
- 투사체: `#ffe66d`

---

## 12. 게임 상태 머신

```
MENU → PLAYING ⇄ LEVEL_UP (일시정지)
         ↓
      GAME_OVER → MENU (재시작)
```

`GameState` enum: `menu`, `playing`, `levelUp`, `paused`, `gameOver`

---

## 13. 구현 단계 (마일스톤)

### Phase 1 — 코어 (MVP)
- [x] Canvas + 게임 루프
- [x] 플레이어 이동 + 카메라 추적
- [x] 적 스폰 + 추적 AI
- [x] HP / 접촉 데미지 / 게임 오버
- [x] 마법 화살 1종 자동 공격

### Phase 2 — 성장 루프
- [x] XP 젬 드롭·흡수
- [x] 레벨업 UI + 업그레이드 3택1
- [x] 무기 2~3종 추가 (낫, 번개)
- [x] 패시브 1~2종
- [x] 젬 미니맵 (우측 상단, 드롭/흡수 실시간 반영)

### Phase 3 — 폴리싱
- [x] CSS HUD / 시작·게임오버 화면
- [x] 난이도 곡선 튜닝
- [x] 간단한 파티클 (적 사망, 레벨업)
- [x] 사운드 (선택, Web Audio 또는 `<audio>`)

### Phase 4 — 확장 (선택)
- [ ] 캐릭터 선택
- [ ] 엘리트 몬스터
- [ ] 보스 (10분)
- [ ] 로컬 최고 기록 (`localStorage`)

---

## 14. 성능 고려

- 화면 밖 객체는 `update`/`draw` 스킵 (카메라 컬링)
- 적 수 상한 + 오래된 적부터 제거하지 않음 (플레이어 주변 우선)
- 투사체 풀링 (선택, Phase 3)
- `deltaTime` 상한 (예: 0.05s)으로 탭 전환 시 폭주 방지

---

## 15. 테스트 체크리스트

- [ ] 이동이 대각선에서도 정규화되어 속도 일정
- [ ] 레벨업 중 적·공격 정지
- [ ] 무기 슬롯 가득 찼을 때 신규 무기 옵션 미표시
- [ ] 게임 오버 후 재시작 시 상태 완전 초기화
- [ ] 창 리사이즈 시 Canvas 비율 유지

---

## 16. 다음 작업

계획 확정 후 **`index.html` + JavaScript**로 Phase 1 MVP를 구현한다.

우선 단일 `game.js`로 빠르게 동작하는 프로토타입을 만든 뒤, Phase 2에서 모듈 분리·무기·레벨업을 추가하는 순서를 권장한다.

## 17. 분할 작업
[ ] 메뉴 표시 / 시작
[ ] WASD 이동, 스프라이트 방향
[ ] 적 처치 → 젬 → 레벨업
[ ] Esc 일시정지 / 재개
[ ] 사운드 on/off
[ ] 게임오버 → 재시작
[ ] 콘솔 에러 0

- 리팩터링만. 게임 밸런스/수치/UI 텍스트 변경 금지
- 관련 없는 파일 수정 금지
- 새 파일 생성 전 기존 섹션 주석(// --- X ---) 기준으로 옮길 것
- 작업 후 변경 파일 목록 + 다음 단계 제안만 짧게
- 막히면 억지로 진행하지 말고 막힌 지점 보고

---

## 18. 리팩터링 — 모듈·CSS 분할 계획

### 목표·제약

| 항목 | 내용 |
|------|------|
| 목표 | `game.js`(~1547줄), `style.css`(~503줄) 기능별 분할 |
| 금지 | 게임 동작·밸런스·UI 텍스트 변경 |
| 모듈 | ES module (`type="module"`) |
| 상태 | 가변 공유 상태는 `js/core/state.js` **단일** |
| 빌드 | 없음 — `index.html`의 `<script type="module">` **1개**만 (`js/main.js`) |
| 속도 | 구현 시 **한 번에 새 파일 1~2개**만 생성·이전 |

### JS 목표 구조

```
js/
├── main.js                 # 진입점: DOM 로드, 에셋 로드, 루프, 이벤트 연결
├── core/
│   ├── state.js            # state, player, enemies, projectiles, pickups, camera, keys …
│   └── constants.js        # CANVAS_W/H, COLORS, GameState, PASSIVE_DEFS, 스프라이트 설정
├── utils/
│   └── math.js             # dist, normalize, circleOverlap, shuffle, worldToScreen …
├── assets/
│   └── loaders.js          # loadPlayerSprite, loadArrow … loadShuriken
├── systems/
│   ├── input.js            # clearKeys, keydown/keyup
│   ├── audio.js            # Web Audio 효과음
│   ├── particles.js        # spawn/update/draw particles
│   ├── difficulty.js       # getDifficulty, getBestRecord
│   ├── camera.js           # updateCamera
│   └── spawn.js            # updateSpawning, spawnEnemy
├── entities/
│   ├── player.js           # createPlayer, updatePlayer, drawPlayer
│   ├── enemy.js            # createEnemy, update/damage/kill, drawSlimeEnemy
│   ├── pickup.js           # createPickup, updatePickups, addXp
│   └── projectile.js       # updateProjectiles, drawMagicArrowProjectile
├── weapons/
│   ├── magicArrow.js
│   ├── scythe.js
│   ├── lightning.js
│   └── index.js            # WEAPON_FACTORIES, WEAPON_NAMES
├── upgrades.js               # buildUpgradePool, showLevelUp, selectUpgrade …
├── render/
│   ├── background.js       # drawBackground
│   ├── world.js            # drawPickups, drawEnemies, drawProjectiles, drawWeapons …
│   └── minimap.js          # drawMinimap
├── hud.js                    # updateHud, renderUpgradeCards
└── gameflow.js               # startGame, pause/resume, endGame, update, gameLoop, render
```

`state.js`에 둘 것: `state`, `player`, `enemies`, `projectiles`, `pickups`, `particles`, `lightningFlashes`, `camera`, `keys`, `survivalTime`, `killCount`, `spawnTimer`, `lastTime`, `currentUpgrades`, `soundEnabled`, `audioCtx`, DOM 참조는 `main.js`에서 `state`에 주입하거나 getter로 접근.

### CSS 목표 구조

```
css/
├── base.css          # reset, body, #game-container, #game-canvas, .hidden, button, kbd
├── hud.css           # #hud, .hud-panel, 바, .hud-stats
├── minimap.css       # #minimap-wrap, #hud-controls, #pause-btn, #sound-btn
└── overlays.css      # menu/pause/levelup/gameover, .overlay-panel, .stat-grid, .upgrade-card
```

`index.html`의 `<link>`는 `css/base.css` 등 4개로 교체 (`style.css` 삭제는 마지막 단계).

### 이전 순서 (단계별 1~2파일)

| 단계 | 새 파일 | game.js에서 옮길 섹션 |
|------|---------|----------------------|
| 1 | `core/state.js`, `core/constants.js` | 상단 상수·`GameState`·전역 `let` |
| 2 | `utils/math.js` | `// --- Utils ---` |
| 3 | `main.js` + `index.html` module 전환 | IIFE 제거, init·루프 골격만 |
| 4 | `assets/loaders.js` | 스프라이트·배경 로드 |
| 5 | `systems/input.js`, `systems/audio.js` | Input, Audio |
| 6 | `systems/particles.js`, `systems/difficulty.js` | Particles, Difficulty |
| 7 | `entities/enemy.js` | Enemy |
| 8 | `entities/player.js` | Player |
| 9 | `entities/pickup.js`, `entities/projectile.js` | Pickups, Projectiles |
| 10 | `weapons/*.js` | Weapons (3종 + index) |
| 11 | `upgrades.js` | Upgrades |
| 12 | `systems/spawn.js`, `systems/camera.js` | Spawn, Camera |
| 13 | `render/*.js`, `hud.js` | Render, HUD |
| 14 | `gameflow.js` | Game flow, `update`, `gameLoop`, `render` |
| 15 | `css/base.css`, `css/hud.css` | style.css 상단·HUD |
| 16 | `css/minimap.css`, `css/overlays.css` | 나머지 CSS, `style.css` 제거 |

### 완료 기준 (§17 체크리스트와 동일)

- [ ] 메뉴 / 시작 / 이동 / 젬·레벨업 / Esc / 사운드 / 게임오버·재시작
- [ ] 콘솔 에러 0, `game.js`·`style.css` 삭제 후에도 동작 동일

### 다음 작업

- [x] **단계 1** — `js/core/state.js` + `js/core/constants.js` 생성, `game.js`에서 이전
- [ ] **단계 2** — `js/utils/math.js` 생성 후 `// --- Utils ---` 이전