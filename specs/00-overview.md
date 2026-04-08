# LLM 模型 API 管理器：产品总览（Overview）

**文档性质**：面向产品、设计与沟通的**行为与范围**说明；不替代交互稿。
**完整索引**见 [README](README.md)。

**专项索引**：[主列表与选择](01-provider-model-list.md) · [供应商与模型表单](02-provider-model-dialogs.md) · [连通性测试](03-model-connectivity-test.md) · [远端模型列表](04-remote-model-list.md) · [导出与外部动作](05-export-and-external-actions.md) · [JSON 备份与导入](06-json-config-import-export.md) · [内置预设](07-builtin-presets.md)

**实现相关补充**：[数据与持久化](08-data-model-and-persistence.md) · [运行环境能力边界](09-electron-shell-and-ipc.md) · [Preset 归并说明](10-preset-and-form-algorithms.md) · [网络交互语义](11-http-check-and-remote-model-list.md) · [导出内容契约](12-export-system.md) · [状态与工作流](13-application-state-and-workflows.md) · [界面清单](14-ui-specification.md)

---

## 1. 产品目标与定位

帮助用户在**本地**集中管理多家 **Provider（供应商）** 及其 **Model（模型）**，完成一条清晰闭环：

1. 维护连接信息与模型清单
2. 验证模型在当前 Endpoint 上是否可用
3. 将选中模型**导出**到常用 AI 工具（环境变量、命令行、**Deep Link**、说明文档等）
4. 用 **JSON** 做备份与迁移

定位是**本地配置中控台**：低门槛、可迁移、可导出；**不**提供云端托管、账号体系或多端实时同步。

---

## 2. 目标用户与典型场景

- **谁会用**：多客户端/多工具的开发者、需要在机器间或同事间传递「可复现配置」的人。
- **典型用法**：为不同供应商配置 **Base URL**、**Endpoint**、**API Key**；勾选模型做批量测试或导出；换机时备份/恢复 JSON；从供应商侧枚举模型后挑选加入本地列表。

---

## 3. 核心概念（产品语言）

| 概念（英文优先） | 含义 |
|------------------|------|
| **Provider** | 一家 API 服务入口：接口族（OpenAI-compatible / Anthropic-compatible）、**Base URL** 与 **Endpoint**、可选官网与密钥、以及下属 **Model** 列表。 |
| **Model** | 隶属于某一 Provider：模型标识、展示名、可选能力参数（如上下文长度、输出上限、推理/多模态等），以及最近一次**测试结果**（成功/失败、时间、可读错误摘要）。 |
| **Preset** | 应用内置或随版本提供的建议项，用于减少手填（供应商档、模型档、常见 URL 片段等）。 |
| **Selection** | 用户在主列表中勾选的一组 **Model**，用于批量测试与导出。 |
| **Export** | 将当前 **Selection** 转为某一目标工具所需的文本或可执行说明；可能包含多条内容块，供复制或触发系统能力（打开链接、终端执行等）。 |

数据语义与持久化策略见 [08-data-model-and-persistence.md](08-data-model-and-persistence.md)。

---

## 4. 能力地图（What we ship）

- **配置与列表**：多 Provider、多 Model；编辑、删除；列表内排序与折叠；与表单中的 **Preset** 协同降低录入成本（详见 [01](01-provider-model-list.md)、[02](02-provider-model-dialogs.md)、[14](14-ui-specification.md)）。
- **连通性测试**：按供应商连接信息发起探测，结果回写到模型行（详见 [03](03-model-connectivity-test.md)、[11](11-http-check-and-remote-model-list.md)）。
- **远端模型列表**：拉取候选并在弹窗中筛选、勾选后加入本地（详见 [04](04-remote-model-list.md)）。
- **导出**：多种目标形态，支持预览与复制；部分形态调起系统能力（详见 [05](05-export-and-external-actions.md)、[12](12-export-system.md)）。
- **JSON**：整库导出为带版本与时间戳的备份文件；导入替换工作集（详见 [06](06-json-config-import-export.md)、[08](08-data-model-and-persistence.md)）。

---

## 5. 数据与安全边界（产品承诺）

- 配置保存在**本机**；应用使用用户填写的密钥仅用于本地发起的检测与生成导出内容，**不**向业务方云端上传用户配置。
- 终端执行、Deep Link、浏览器脚本等风险见 [05](05-export-and-external-actions.md) 与 [09](09-electron-shell-and-ipc.md)。

---

## 6. 体验与错误处理原则

网络失败、格式错误、外部调起失败等，应通过明确提示或可读的模型行状态呈现；**导入 JSON** 的健壮性要求见 [06](06-json-config-import-export.md)。具体文案与控件形态由交互稿与实现迭代。
