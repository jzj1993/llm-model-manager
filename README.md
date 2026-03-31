# LLM模型API管理器

用于快速管理 Provider/Model 配置并检查模型 API 可用性的 Electron 桌面工具。当前支持 OpenAI 兼容接口与 Anthropic 接口。

## 说明

本项目代码主要由 AI 创业，未经过严格完整测试。如发现功能遗漏、兼容性问题或其他错误，欢迎提交 [Issue](../../issues) 或 [PR](../../pulls)。

## 主要功能

- 多 Provider、多 Model 管理（新增、编辑、删除、排序）
- 本地持久化保存配置与检查状态
- 单个或批量检查模型可用性
- 一键导出到多种AI App（CLI、Deep Link 等）

## 快速开始

### 前置要求

- Node.js >= 20
- npm

### 安装与启动

```bash
npm install
npm start
```

## 基本使用

1. 点击 `+ 添加供应商`，填写接口信息并保存。
2. 在供应商下添加模型。
3. 点击 `检查` 或使用顶部批量检查按钮验证可用性。
4. 使用 `导出选中模型` 生成目标工具配置。

## 接口默认值

- OpenAI 兼容接口
  - URL: `https://api.openai.com/v1`
  - Endpoint: `/chat/completions`

- Anthropic 接口
  - URL: `https://api.anthropic.com`
  - Endpoint: `/v1/messages`

## 数据与安全

- 配置数据保存在本地 `localStorage`
- 存储键：`modelCheckerProviders`
- 不会将 API Key 上传到第三方服务

## 额外文档

- Harness 自动化测试说明：`HARNESS.md`

## 许可证

MIT
