# 导出系统：产品层输出契约（Export system）

目标：用产品语言定义导出的“输入、输出、可运行行为与安全策略”，不展开到脚本实现细节。

---

## 1. 输入（Selection）

导出只针对用户当前勾选的 Models。每个被选中的条目在导出时都携带：

- Provider 的连接信息（API type、Base URL、Endpoint、API Key 等）
- Model ID 及可选展示信息与能力参数

---

## 2. 输出的基本单位：Export entry

导出面板由多条内容块组成，每条称为一条 Export entry，包含：

- **title**：用于区分不同条目（通常含序号、Provider 与 Model 信息）
- **content**：导出的正文文本
- **type**：内容类型（用于语法高亮与“运行”按钮行为）

---

## 3. 内容类型与行为

### 3.1 常见类型

- **command**：可在终端执行的脚本或命令集合
- **env**：环境变量类输出（产品允许以“环境变量清单”或“可执行脚本”呈现）
- **deeplink**：可调起外部应用的链接
- **javascript**：可在浏览器环境执行的脚本
- **json / markdown / plaintext**：仅展示与复制

### 3.2 语法高亮（产品口径）

不同 type 在导出面板中应呈现合理的高亮或渲染（例如 markdown 渲染）。

---

## 4. 可运行条目与确认策略

### 4.1 哪些类型可运行

至少包括：command、env、deeplink、javascript。

### 4.2 确认策略（与当前产品一致）

- **command / env**：运行前必须二次确认（用户需要明确同意将要在终端执行的内容）。
- **deeplink / javascript**：当前产品不做二次确认（如需增加确认，属于产品变更）。

失败时应给出明确提示，且不影响本地工作集。

---

## 5. Exporter 清单（当前内置目标）

导出面板应按固定顺序提供以下目标（显示名以产品文案为准）：

- OpenClaw：手动（推荐）
- OpenClaw：命令行
- CC Switch：Deep Link
- Claude Code：环境变量
- Codex：环境变量
- Codex：命令行
- Cherry Studio：Deep Link
- AionUI：Deep Link
- OpenCat：Deep Link

---

## 6. env 类输出的产品语义

env 类型的本质是“一组环境变量键值对”。

产品允许两种呈现之一（实现可任选其一或同时提供）：

- **环境变量清单**：逐行展示 export 语句，用户复制到终端或配置文件
- **可执行脚本**：用户点击运行后，在本机写入某个环境文件并提示用户如何启用（属于高权限操作，必须配合确认策略）

env 的键名需符合常见 shell 环境变量命名习惯；不合规的键应被忽略或提示。
