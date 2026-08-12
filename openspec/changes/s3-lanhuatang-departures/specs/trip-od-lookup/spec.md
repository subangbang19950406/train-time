## Purpose

根据方向、上车点、下车点，从兰花塘锚点时刻推算 OD 下一班，并持久化用户选择。

## ADDED Requirements

### Requirement: 方向可选且默认往高家冲

系统 MUST 提供「往高家冲」「往南京南」两个方向，默认往高家冲。切换方向后 MUST 按该方向的线路顺序约束上下车站。

#### Scenario: 默认方向

- **WHEN** 用户首次打开且无保存记录
- **THEN** 方向 MUST 为往高家冲

### Requirement: 任意合法上下车站 OD

系统 MUST 允许在 S3 全线 19 站中选择上车点与下车点，且下车点 MUST 位于所选方向的行进下游（不能同站或逆序）。

#### Scenario: 默认 OD

- **WHEN** 用户首次打开且无保存记录
- **THEN** 上车点 MUST 为油坊桥
- **AND** 下车点 MUST 为兰花塘

#### Scenario: 非法下车点自动纠正

- **WHEN** 用户切换上车点导致原下车点不在下游
- **THEN** 系统 MUST 自动选择该方向下的合法下车点（优先保留兰花塘或首个合法站）

### Requirement: OD 时刻推算

对每一班锚点时刻，系统 MUST 计算：

- `boardTime = anchor + offset(board)`
- `arriveTime = anchor + offset(alight)`

上车时刻展示 MUST 标为约数（「约 HH:mm」）。

#### Scenario: 油坊桥到兰花塘工作日 07:13 班

- **WHEN** 方向为往高家冲、日历为工作日
- **AND** 锚点对应兰花塘 07:13
- **THEN** 油坊桥上车 MUST 约为 06:48
- **AND** 到达兰花塘 MUST 为 07:13

#### Scenario: 兰花塘到油坊桥往南京南

- **WHEN** 方向为往南京南、锚点 06:11
- **THEN** 兰花塘上车 MUST 为 06:11
- **AND** 到达油坊桥 MUST 为 06:37

### Requirement: 只展示现在之后的班次

系统 MUST 只列出 `boardTime ≥ 当前本地时间` 的班次，按上车时刻升序，并给出等待分钟数。无剩余班次时 MUST 提示「今日已无剩余班次」，且 MUST NOT 混入次日首班。

#### Scenario: 过滤已错过班次

- **WHEN** 当前时间 08:00
- **THEN** 列表 MUST NOT 包含上车早于 08:00 的班次

### Requirement: 刷新记住方向与站点

系统 MUST 用 localStorage 保存方向、上车点、下车点；再次打开 MUST 恢复上次选择（若仍合法）。

#### Scenario: 再次打开恢复选择

- **WHEN** 用户上次选择往南京南、兰花塘上车、油坊桥下车并关闭页面
- **THEN** 再次打开 MUST 默认相同方向与站点
