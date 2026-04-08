# 数据与持久化：产品数据契约（Data & persistence）

目标：用“产品可验收”的方式定义数据含义与持久化策略，便于在不依赖具体工程实现的前提下重做同等体验。

---

## 1. 核心对象与字段含义（英文概念名优先）

### 1.1 Provider（供应商）

一条 Provider 表示“一组可被调用的模型服务入口”，包含：

- **Provider ID**：必填。用于区分供应商、做导出映射、做 Selection 键。
- **Display name**：可选。仅用于界面展示；留空时界面用 Provider ID 代替。
- **API type**：必填。二选一：
  - **OpenAI-compatible**
  - **Anthropic-compatible**
- **Base URL**：必填。服务根地址。
- **Endpoint**：必填。接口路径或补充路径片段。
- **Website**：可选。用于一键打开官网。
- **API Key**：可选。用于连通性测试、远端模型列表以及导出目标所需的鉴权配置。
- **Models**：数组。属于该 Provider 的模型清单。

### 1.2 Model（模型）

一条 Model 表示“一个可被选中、测试与导出的模型条目”，包含：

- **Model ID**：必填。用于实际请求、Selection 键与导出。
- **Model display name**：可选。仅展示；留空时视为等同于 Model ID。
- **Model params**：可选能力参数集合（用于展示与某些导出目标）：
  - **Context window**：可选
  - **Max tokens**：可选
  - **Reasoning mode**：可选（三态：未定义 / 启用 / 禁用）
  - **Input types**：可选（例如 text、image、audio；可扩展）
- **Last test status**：连通性测试结果：
  - 状态：pending / success / error
  - 上次测试时间（可空）
  - 上次测试信息（可空，可读错误摘要）

### 1.3 Selection（选中集）

- **粒度**：选中以 Model 为单位。
- **键的稳定性要求**：Selection 的主键由 “Provider ID + Model ID” 决定；删除任何 Provider/Model 后，为避免错位，应清空 Selection。

---

## 2. 规范化（Normalization）规则

当从磁盘加载、从 JSON 导入或从远端模型列表加入本地时，系统应做以下规范化，以保证后续行为一致：

- **trim**：对 Provider ID、Display name、Base URL、Endpoint、Model ID、Model display name 去首尾空白。
- **显示名回退**：Model display name 为空时，用 Model ID 作为 display name。
- **测试字段默认值**：缺失的测试状态视为 pending；缺失的时间与信息视为空。
- **Models 数组健壮性**：Models 字段缺失或非数组时视为空数组。

---

## 3. “完整 URL”的产品语义

- 产品层只关心：Base URL 与 Endpoint 组合后得到“实际请求落点”。
- 组合规则要求对用户友好：避免双斜杠；必要时自动补齐一个斜杠；任一端为空时以另一端为准。

---

## 4. 本地持久化策略

### 4.1 目标

- 用户的工作集（全部 Provider 与其 Models）应在本机持久化，应用重启后恢复。
- 持久化失败时应可见（提示用户），避免“以为保存成功但实际未写入”。

### 4.2 形态

- **日常持久化文件**：存储“Provider 数组”本身，不额外包一层对象。
- **JSON 备份文件**：为了可迁移与可版本化，应在外层包含版本号与导出时间，并包含 providers 数组（见 `06-json-config-import-export.md`）。

---

## 5. 保存与状态重置规则

- **保存 Provider**：要求必填字段满足；编辑时保留其下 Models；新建时 Models 为空数组。
- **保存 Model**：要求 Model ID 必填；保存后该 Model 的连通性测试结果必须重置为 pending，并清空上次时间与信息（避免“旧结果误导新配置”）。
