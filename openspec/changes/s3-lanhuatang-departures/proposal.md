## Why

S3 大小交路混跑，站牌不会按「能否到你的下车点」过滤；个人通勤需要快速查任意两站之间的下一班。以兰花塘站牌为锚点，用固定站间时差推算全线 OD，避免为每个站各抄一份时刻表。

## What Changes

- 静态手机网页：方向 + 上车点 + 下车点 + 日历，查现在之后的班次列表。
- 双向时刻真源：兰花塘站牌「往高家冲」「往南京南」各一套工作日 / 非工作日。
- 全线 19 站任意合法 OD；默认往高家冲、油坊桥 → 兰花塘。
- localStorage 记住方向、上车点、下车点；日历按星期几默认、可手切。
- 紧凑 UI：方向胶囊；上 / 下 / 历合并一行；站点自定义下拉。

## Non-goals（非目标）

- 不做离线 / PWA、小程序、原生 App、后端、账号。
- 不做实时到站、法定节假日 / 调休自动日历、刘村短交路单独时刻。
- 不爬取或对接第三方 API。

## Capabilities

### New Capabilities

- `lanhuatang-schedule`: 兰花塘站牌双向时刻真源与工作日 / 非工作日日历
- `trip-od-lookup`: 任意上下车站 OD 推算、方向约束、默认与持久化
- `query-ui`: 紧凑查询条与班次列表展示

### Modified Capabilities

- （无；仓库从零开始）

## Impact

- 仓库 `train-time`：`data/s3-lanhuatang.json`、`js/schedule.js`、`js/app.js`、`index.html`。
- 调图时改 JSON 真源；OD 逻辑与 UI 无需各站重复录入。
