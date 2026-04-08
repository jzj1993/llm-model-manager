# Specs（完整规格说明）

本目录的目标是：**仅凭这些文档，在无任何代码的前提下，仍可完整还原「LLM 模型 API 管理器」应用**（含数据模型、界面、主流程、算法与运行时边界）。正文以中文为主，**概念名英文优先**。

## 编写原则（TPM 视角）

这些 Specs 的写作目标是：**完整、可验收、可重建**。它们不是“代码注释集”，也不是“实现细节罗列”，而是产品层的行为契约。

### 1) 写什么（必须写到足够细）

- **用户目标与范围**：每个模块解决什么问题，不解决什么问题（明确边界）。
- **概念与字段语义**：核心对象（Provider / Model / Preset / Selection / Export 等）的字段含义、必填/可选、默认值与回退规则。
- **触发点（Trigger）**：哪些用户动作或状态变化会触发逻辑（例如 blur、select、切换、保存、删除、批量操作等）。
- **规则（Rules）**：决定性逻辑必须写成可验收的规则（优先级、匹配键、尊重用户输入、不覆盖原则、去重/不去重策略等）。
- **状态与反馈（State & feedback）**：loading / error / empty / disabled / indeterminate 等状态如何呈现；提示/确认的策略；失败时如何恢复或保持不变。
- **异常与兜底（Edge cases & fallback）**：输入为空、远端返回空、解析失败、外部动作失败、竞态（结果写回错行）等，产品应如何表现。
- **安全与风险边界**：哪些操作是高风险（终端执行/浏览器脚本/Deep Link 等），产品如何约束、提示与划分责任。

### 2) 不写什么（明确禁止）

- **不写具体工程实现**：不依赖函数名、类名、文件路径、IPC 通道名、Header 字段名、正则表达式、毫秒级超时常量、临时文件名等。
- **不复制粘贴代码**：Specs 的读者应该能据此“重新实现”，而不是“照抄实现”。
- **不把第三方工具的“当前导出脚本内容”当规格**：规格只定义输出的语义、必要字段与用户操作流程；脚本如何写是实现选择。

### 3) 推荐写法（让规则可验收）

- 使用“**当…则…否则…**”“**给定输入…产出…**”“**状态 A 在条件 C 下转移到状态 B**”等表达。
- 对每条规则补一个“**最小示例**”（例如：输入什么、会自动填什么、不该覆盖什么）。
- 任何“可能覆盖用户输入”的逻辑都必须写清 **覆盖条件** 与 **不覆盖条件**。

### 4) 完整性标准（验收口径）

如果把所有代码删除，只保留 Specs：

- 研发应能实现相同的核心流程与交互结果（哪怕技术栈不同）。
- QA 能据此写出覆盖核心路径与边界条件的用例。
- TPM 能据此评估变更影响并追踪“应然 vs 实然”的差异。

## 文档地图

### 核心规则文档（优先阅读）

| 文档 | 内容 |
|------|------|
| [00-overview.md](00-overview.md) | 产品定位、核心概念、能力地图、安全边界 |
| [01-provider-model-list.md](01-provider-model-list.md) | 主列表、Selection、折叠、排序、行内能力 |
| [02-provider-model-dialogs.md](02-provider-model-dialogs.md) | Provider / Model 表单、Preset 自动填充、有效连接规则 |
| [03-model-connectivity-test.md](03-model-connectivity-test.md) | 连通性测试：目标、判定、状态回写、失败策略 |
| [04-remote-model-list.md](04-remote-model-list.md) | 远端模型列表：发现、筛选、添加、去重边界 |
| [05-export-and-external-actions.md](05-export-and-external-actions.md) | 导出系统、运行按钮与确认策略 |
| [06-json-config-import-export.md](06-json-config-import-export.md) | JSON 备份/导入（用户与校验策略） |
| [07-builtin-presets.md](07-builtin-presets.md) | 内置 Preset 与发布维护 |
| [08-data-model-and-persistence.md](08-data-model-and-persistence.md) | 数据语义、规范化、持久化策略 |
| [11-http-check-and-remote-model-list.md](11-http-check-and-remote-model-list.md) | 网络交互语义（非实现细节） |
| [12-export-system.md](12-export-system.md) | 导出内容契约、类型与运行策略 |
| [13-application-state-and-workflows.md](13-application-state-and-workflows.md) | 跨模块状态与端到端流程 |
| [14-ui-specification.md](14-ui-specification.md) | 用户可见界面结构、状态与反馈 |

### 归并/附录文档（按需阅读）

| 文档 | 作用 |
|------|------|
| [09-electron-shell-and-ipc.md](09-electron-shell-and-ipc.md) | 运行环境能力边界（不含工程通道细节） |
| [10-preset-and-form-algorithms.md](10-preset-and-form-algorithms.md) | Preset 规则归并说明（细则以 01 为准） |
| [15-tech-stack-and-build.md](15-tech-stack-and-build.md) | 实现与发布附录（不参与产品逻辑验收） |

## 阅读顺序建议

1. **核心产品规则**：00 → 01 → 02 → 03 → 04 → 05 → 06 → 07 → 08 → 11 → 12 → 13 → 14
2. **补充阅读**：09 → 10 → 15

## 与实现的关系

规格为**应然**；若实现有偏差，应**改代码或改规格**并留记录。
为减少重复，本目录采用“单一规则源”原则：同一条产品规则只在一个文档中完整定义，其它文档只引用不复述。
