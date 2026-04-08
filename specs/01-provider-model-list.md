# 主列表：Selection、折叠与排序

**文档性质**：描述主界面 **Provider** 卡片与 **Model** 行的**用户可感知行为**；表单与 Preset 逻辑见 [02](02-provider-model-dialogs.md)。**控件级清单**见 [14-ui-specification.md](14-ui-specification.md)。

---

## 1. Selection（选中范围）

- **粒度**：以单条 **Model** 为选中单位；同一 Provider 下可多选。  
- **键**：由 “Provider ID + Model ID” 组合而成（见 [08](08-data-model-and-persistence.md)）。  
- **全选 / 清空**：工具栏 checkbox；展示 **indeterminate** 当 0<N<总数。  
- **按 Provider 批量选**：行头复选框选中或取消该 Provider 下全部 **Model**；支持 **indeterminate**。  
- **删除 Provider 或 Model 后**：**清空当前 Selection**（避免索引错位）。  
- **工具栏**：**测试选中模型**、**导出选中模型** 在 **无选中项时 disabled**；展示「已选 N 项」。

---

## 2. 折叠与展开

- 每个 **Provider** 可独立折叠/展开其 **Model** 列表。  
- **稳定键**：优先使用 Provider ID；若 Provider ID 为空，则回退为当前列表位置键。  
- 支持 **折叠全部 / 展开全部**。  
- **批量测试**：开始前自动**展开**所有「含有选中 Model」的 Provider 卡片，便于看结果。

---

## 3. 排序

- **Provider**、**Model**（各 Provider 内）均支持 **拖拽**；顺序持久化。  
- 排序不改变 **Model ID** 语义；若导出顺序与列表遍历顺序一致，则以列表顺序为准。

---

## 4. 列表展示与操作

- **Base URL / Endpoint**：只读展示，文本可选中复制。  
- **API Key**：**脱敏**展示 + **复制完整密钥** 按钮（无密钥时禁用）。  
- **官网**：若填写，标题可点击跳转；用户输入未带协议时按常见网址方式补全（见 [13](13-application-state-and-workflows.md)）。  
- **操作**：加载远端模型列表、添加模型、编辑供应商、删除供应商、单模型测试、编辑/删除模型、拖拽排序。  
- **复制**：列表区无「复制整条 Provider」；**复制 API Key** 见上。

---

## 5. 与配置持久化的关系

列表即当前工作集视图；结构性变更后需立即保存（见 [08](08-data-model-and-persistence.md)、[13](13-application-state-and-workflows.md)）。
