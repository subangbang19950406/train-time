## Context

见 `proposal.md`。行为契约见 `specs/lanhuatang-schedule`、`specs/trip-od-lookup`、`specs/query-ui`。

约束：手机浏览器打开、无后端、不需要离线。真源为用户提供的兰花塘站牌照片转录。

## Goals / Non-Goals

**Goals:**

- 一份 JSON 存双向时刻 + 各站相对兰花塘时差，支持任意合法 OD。
- 打开即查下一班；刷新记住上次方向与站点。
- 查询区尽量占一行，把列表区域留给时刻。

**Non-Goals:**

- 打包器、框架、PWA、实时 API、节假日库。

## Decisions

### 1. 静态单页，无构建链

`index.html` + CSS + JS + JSON。`js/data.js` 由 JSON 生成，支持 `file://` 直接打开。

### 2. 兰花塘锚点 + 双向真源

```
data/s3-lanhuatang.json
  directions.gaojiachong: { weekday, restDay, offsetFromLanhuatang }
  directions.nanjingnan:  { weekday, restDay, offsetFromLanhuatang }
  stationOrder: 南京南 → … → 高家冲（19 站）
```

- 往高家冲 `weekday/restDay`：兰花塘站牌「往高家冲」列；不含刘村短交路。
- 往南京南 `weekday/restDay`：兰花塘站牌「往南京南」列（兰花塘发车时刻为锚）。
- 任意站时刻：`shift(anchor, offsetFromLanhuatang[station])`。

OD 推算：

```
boardTime  = anchor + offset(board)
arriveTime = anchor + offset(alight)
```

仅当 alight 在 board 的行进方向下游时列出该班。

### 3. 方向与默认 OD

| 项 | 默认 |
|----|------|
| 方向 | 往高家冲（gaojiachong） |
| 上车 | 油坊桥 |
| 下车 | 兰花塘 |

切换方向后，若原站点在新方向非法，回落到上述默认或该方向首个合法站。

### 4. 持久化

`localStorage` 键 `s3-query-v2`：`{ direction, boardId, alightId }`。日历不持久化，仍按星期几默认（手切仅当前会话有效，刷新后重跟星期几）。

### 5. UI 布局

```
标题 + 现在时间
方向 [高家冲 | 南京南]          ← 小胶囊，radio+label
[上 站▾] [下 站▾] [历 工|休]   ← 一行 query-bar
下一班列表…
```

- 方向 / 日历：radio + label 分段，不用大按钮。
- 站点：自定义 dropdown（触发条 + 自绘菜单），不用原生 select 弹层。
- 等待时间前加灰色小字「还有」；上车时刻标「约」。

### 6. 时间基准

设备本地时区；列表每 30 秒刷新等待分钟数。

## Risks / Trade-offs

- **±1 分钟时差误差** → 「约」展示；offsets 可调。
- **调图过期** → 页脚免责声明；只改 JSON。
- **窄屏站名** → 触发条 ellipsis；菜单仍可看全名。
- **日历不持久化** → 避免调休日误用；需手切「工/休」。

## Migration Plan

本地打开 `index.html` 或静态托管。改时刻：编辑 `data/s3-lanhuatang.json` 并同步 `js/data.js`。

## Open Questions

- 是否在空态显示「明日首班」——未做，可后续加。
