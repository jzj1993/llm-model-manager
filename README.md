# LLM 模型 API 管理器

一个用于管理 Provider / Model 配置、检查模型可用性并导出到多种工具的 Electron 桌面应用。当前支持 OpenAI 兼容接口与 Anthropic 接口。

## 说明

本项目代码主要由 AI 实现，未经过严格完整测试。如发现功能遗漏、兼容性问题或其他错误，欢迎提交 [Issue](../../issues) 或 [PR](../../pulls)。

## 主要功能

- 多 Provider、多 Model 管理（新增、编辑、删除、复制、拖拽排序）
- Provider 预设与模型预设（自动补全、联动填充常用字段）
- 模型可用性检查（单个检查 + 批量检查选中模型）
- 模型能力探测（自动尝试获取 `Context Window` / `Max Tokens`，并推断 Reasoning 与输入类型）
- 导出选中模型到多种目标（命令行、Deep Link、手动配置、JavaScript 桥接）
- 导出预览支持语法高亮与 Markdown 渲染，可直接复制或执行导出动作
- 本地持久化保存配置与检查状态

供应商（Provider）和模型（Model）管理：

![](assets/20260401_162042_image.png)

添加供应商（Provider）：

![](assets/20260401_162112_image.png)

添加模型（Model）：

![](assets/20260401_162157_image.png)

导出到常用AI App：

![](assets/20260401_162225_image.png)

## 下载安装包

直接使用应用，可前往 [GitHub Releases](https://github.com/jzj1993/llm-model-manager/releases) 下载对应平台安装包。

## 使用流程

1. 点击 `+ 添加供应商`，填写 `供应商 ID`、`Base URL`、`Endpoint`（可选 API Key / 官网）。
2. 在供应商下添加模型（可使用模型预设自动填充参数）。
3. 对单个模型点击 `检查`，或在顶部勾选后点击 `检查选中模型`。
4. 需要导出时，勾选模型并点击 `导出选中模型`，选择目标格式后复制或执行。

## 导出目标（当前内置）

- OpenClaw（手动 / 命令行）
- CC Switch（命令行 / Deep Link）
- Claude Code（命令行）
- Codex（命令行）
- Cherry Studio（Deep Link）
- AionUI（Deep Link）
- OpenCat（Deep Link）
- AMA 问天（Deep Link）

## 数据与安全

- 配置数据保存在本地 `localStorage`
- 存储键：`modelCheckerProviders`
- API Key 仅用于本地请求与导出内容生成，不会主动上传到第三方服务
- 执行“命令行导出动作”前请先备份目标配置文件，避免误覆盖

## 本地开发

### 前置要求

- Node.js >= 20
- npm

### 安装

```bash
npm install
```

### 启动

```bash
npm start
```

### 开发模式（自动重载）

```bash
npm run dev
```

### Harness 自动化测试

- Harness 自动化测试说明：`HARNESS.md`

### 发布桌面安装包（GitHub Release）

已配置 `electron-builder` 与 GitHub Actions 工作流：

- 工作流文件：`.github/workflows/release.yml`
- 触发方式：
  - 推送标签（如 `v1.1.0`）自动构建并发布到对应 GitHub Release
  - 手动触发工作流（`workflow_dispatch`）
- 目标平台：
  - macOS：`dmg`、`zip`
  - Windows：`nsis`、`portable`
  - Linux：`AppImage`、`tar.gz`

本地可用命令：

```bash
npm run dist
npm run dist:mac
npm run dist:win
npm run dist:linux
```

## 许可证

MIT
