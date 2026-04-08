# Preset 规则归并说明

为避免与 `02-provider-model-dialogs.md` 重复，本篇不再展开具体补全流程。

---

## 1. 归并策略

- **Provider / Model 表单中的 Preset 触发点、优先级、覆盖与不覆盖规则**：统一以 `02-provider-model-dialogs.md` 为唯一规则源。
- 本篇仅保留“为什么要有 Preset”与“变更时要检查什么”。

---

## 2. Preset 的产品目标

- 降低首次录入成本
- 降低连接信息与模型标识的输入错误率
- 提升跨项目复用效率

Preset 是“建议与加速器”，不是“强制配置器”。

---

## 3. 变更影响检查（TPM）

当调整任何 Preset 内容时，至少评估：

- 是否影响 Provider 表单默认带出行为
- 是否影响 Model 候选排序与自动补全
- 是否可能覆盖用户已有输入
- 是否需要更新 `02-provider-model-dialogs.md`、`07-builtin-presets.md` 与对外 README

---

## 4. 与其它文档的分工

- 行为规则：`02-provider-model-dialogs.md`
- 数据语义：`08-data-model-and-persistence.md`
- 发布与维护：`07-builtin-presets.md`
