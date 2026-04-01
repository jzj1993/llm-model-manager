# Model Presets 提取脚本

## 概述

`extract-models.js` 脚本用于从 `openrouter-models.json` 和 `openclaw-models.json` 两个原始JSON文件中提取model信息，合并并去重后保存到 `model-presets.json`。

## 使用方法

### 基本用法

在 `src/presets/` 目录下运行：

```bash
node extract-models.js
```

### 或者直接执行

```bash
./extract-models.js
```

## 输入文件

脚本会读取以下两个文件：

1. **openrouter-models.json** - OpenRouter API的model数据
2. **openclaw-models.json** - OpenClaw API的model数据

## 输出文件

脚本会生成以下文件：

- **model-presets.json** - 合并后的model数据

## 输出数据格式

每个model包含以下字段：

```json
{
  "provider": "ai21",                  // Provider ID（从model id提取）
  "id": "jamba-large-1.7",            // Model ID（不包含provider前缀）
  "name": "AI21: Jamba Large 1.7",     // 显示名称
  "contextWindow": 256000,             // 上下文窗口大小（tokens）
  "maxCompletionTokens": 8192,        // 最大completion tokens（可选）
  "reasoning": false,                 // 是否支持推理（boolean）
  "input": ["text", "image"],          // 输入类型（数组格式）
  "output": ["text"],                 // 输出类型（数组格式）
  "description": "...",                 // 描述信息（可选，来自OpenRouter）
  "source": "openrouter"               // 数据来源标识
}
```

**字段说明：**

- **provider**：所属provider的ID
  - 从原始model id的第一个斜线前提取
  - 例如：`"openrouter/gpt-4"` 中的 `"openrouter"`

- **id**：model的唯一标识符（不包含provider前缀）
  - 从原始model id的斜线后提取
  - 例如：`"amazon-bedrock/amazon.nova-lite-v1:0"` 中提取 `"amazon.nova-lite-v1:0"`
  - 例如：`"openai/gpt-4"` 中提取 `"gpt-4"`
  - 如果原始id包含多个斜线，保留斜线后的所有部分

- **contextWindow**：context_length，上下文窗口大小（tokens数）
  - OpenRouter: 从 `context_length` 获取
  - OpenClaw: 从 `contextWindow` 获取

- **maxCompletionTokens**：最大completion tokens（可选）
  - OpenRouter: 从 `top_provider.max_completion_tokens` 获取
  - OpenClaw: 无此信息（设置为 `null`）

- **reasoning**：是否支持推理功能（boolean）
  - OpenRouter: 检查 `supported_parameters` 是否包含 `"reasoning"`
  - OpenClaw: 无此信息（设置为 `false`）

- **input**：输入类型数组
  - OpenRouter: 直接从 `architecture.input_modalities` 获取
  - OpenClaw: 从 `input` 字符串（格式: `"text+image"`）转换为数组
  - 常见类型：`"text"`、`"image"`、`"file"`、`"video"`、`"audio"` 等

- **output**：输出类型数组
  - OpenRouter: 从 `architecture.output_modalities` 获取
  - OpenClaw: 无此字段（设置为空数组 `[]`）
  - 常见类型：`"text"`、`"image"` 等

## 脚本功能

### 主要功能

1. **数据提取**：从两个源文件中提取model信息
2. **数据合并**：将两个数据源的models合并
3. **去重处理**：基于model id进行去重（OpenClaw的数据优先）
4. **排序整理**：按provider和model id排序
5. **统计分析**：显示详细的统计信息
6. **数据保存**：将结果保存为格式化的JSON文件

### 统计信息

脚本运行后会显示以下统计信息：

- 唯一models总数
- 唯一providers数量
- Top 10 Provider（按model数量排序）
- 字段完整性统计
- 数据来源统计

## 示例输出

```
=== Model提取脚本 ===

读取文件...

处理数据...

处理OpenRouter models: 348个
处理OpenClaw models: 820个

合并数据...

=== 统计信息 ===
唯一models总数: 1121
唯一providers数量: 78

Top 10 Provider (按model数量):
  openrouter: 246个
  vercel-ai-gateway: 150个
  amazon-bedrock: 86个
  openai: 66个
  qwen: 49个
  google: 43个
  azure-openai-responses: 39个
  anthropic: 36个
  opencode: 32个
  mistral: 25个
  ... 其他 68个providers

字段完整性:
  有contextWindow: 1121/1121 (100.0%)
  有description: 302/1121 (26.9%)
  有input: 1121/1121 (100.0%)
  有available: 819/1121 (73.1%)

数据来源:
  openrouter: 302个
  openclaw: 819个

保存成功: /Users/jzj/workspace/llm-model-manager/src/presets/model-presets.json
文件大小: 399.88 KB

✓ 完成！
```

## 模块导出

脚本也支持作为模块导入使用：

```javascript
const extractor = require('./extract-models');

const openRouterModels = extractor.processOpenRouterModels(data);
const openClawModels = extractor.processOpenClawModels(data);
const merged = extractor.mergeModels(openRouterModels, openClawModels);
const sorted = extractor.sortModels(merged);
```

## 注意事项

1. 脚本会覆盖现有的 `model-presets.json` 文件
2. 如果输入文件不存在或格式错误，脚本会报错并退出
3. 重复的model id会以OpenClaw的数据为准（后添加的覆盖前面的）

## 更新维护

当需要更新model数据时：

1. 下载最新的 `openrouter-models.json` 和 `openclaw-models.json`
2. 运行 `node extract-models.js`
3. 检查生成的统计信息是否合理
4. 验证 `model-presets.json` 文件内容