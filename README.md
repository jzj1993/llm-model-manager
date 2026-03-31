# 模型检查器 (Model Checker)

一个基于 Electron 的桌面应用，用于检查各种 AI 模型 API 的可用性。支持 OpenAI 兼容接口和 Anthropic 接口。

## 功能特性

- ✅ **多配置管理** - 可以添加、编辑、删除多个模型配置
- ✅ **接口类型支持** - 支持 OpenAI 兼容接口和 Anthropic 接口
- ✅ **状态持久化** - 配置和检查结果自动保存到本地存储
- ✅ **实时检查** - 一键检查模型是否可用
- ✅ **现代化 UI** - 美观的渐变界面和卡片式布局
- ✅ **错误处理** - 详细的错误信息显示

## 项目结构

```
LLMTest/
├── src/
│   ├── main.js          # Electron 主进程
│   ├── preload.js        # IPC 通信桥接
│   ├── index.html        # 应用界面
│   └── renderer.js      # 前端逻辑
├── package.json         # 项目配置
└── .gitignore          # Git 忽略文件
```

## 安装步骤

### 前置要求

- Node.js >= 20
- npm 或 yarn

### 安装依赖

```bash
# 克隆项目
git clone <repository-url>
cd LLMTest

# 安装依赖
npm install
```

## 使用方法

### 启动应用

```bash
# 开发模式启动
npm start
```

### 添加配置

1. 点击"添加配置"按钮
2. 填写配置信息：
   - **配置名称**：自定义名称（如"OpenAI GPT-4"）
   - **接口类型**：选择 OpenAI 或 Anthropic
   - **API URL**：API 服务器地址
   - **API 端点**：端点路径
   - **模型名称****：要检查的模型名称
   - **API Key**：可选的认证密钥
3. 点击"保存配置"

### 检查模型

1. 在配置列表中找到要检查的配置
2. 点击"检查"按钮
3. 等待检查完成
4. 查看检查结果（成功/失败及详细信息）

### 编辑配置

1. 点击配置卡片上的"编辑"按钮
2. 修改配置信息
3. 点击"保存配置"

### 删除配置

1. 点击配置卡片上的"删除"按钮
2. 确认删除操作

## 接口类型说明

### OpenAI 兼容接口

- **认证方式**：`Authorization: Bearer <api-key>`
- **默认 URL**：`https://api.openai.com`
- **默认端点**：`/v1/chat/completions`

### Anthropic 接口

- **认证方式**：`x-api-key: <api-key>`
- **默认 URL**：`https://api.anthropic.com`
- **默认端点**：`/v1/messages`

## 使用 Harness 进行自动化测试

本项目已集成 [@harnessgg/electron](https://www.harness.gg/electron) 进行自动化测试。

### 安装 Harness

```bash
npm install -D @harnessgg/electron
```

### 启动应用并暴露 CDP 调试端口

```bash
# 启动应用并暴露调试端口
npx electron . --remote-debugging-port=9222
```

### 连接到应用

```bash
# 连接到正在运行的应用
npx harness-electron connect --port 9222
```

### 常用 Harness 命令

#### 查看 DOM 结构

```bash
# 查看页面摘要
npx harness-electron dom --format summary

# 查看完整的 DOM 树
npx harness-electron dom --format tree

# 查看 HTML 格式
npx harness-electron dom --format html
```

#### 交互操作

```bash
# 点击元素
npx harness-electron click --css ".button"

# 输入文本
npx harness-electron type --css "#configName" --value "My Config"

# 等待元素可见
npx harness-electron wait --for visible --css ".config-item"

# 等待 URL 变化
npx harness-electron wait --for url --value "/dashboard"
```

#### 截图

```bash
# 截取整个视口
npx harness-electron screenshot --path ./screenshot.png

# 截取特定元素
npx harness-electron screenshot --path ./element.png --css ".config-item"

# 截取整个页面
npx harness-electron screenshot --path ./full-page.png --full-page
```

#### 执行 JavaScript

```bash
# 执行自定义脚本
npx harness-electron evaluate --script 'document.querySelectorAll(".button").forEach(btn => btn.click())'

# 获取元素属性
npx harness-electron evaluate --script 'document.querySelector(".config-item").getAttribute("data-index")'
```

#### 断言测试

```bash
# 检查元素是否存在
npx harness-electron assert --kind exists --css ".config-item"

# 检查元素是否可见
npx harness-electron assert --kind visible --css ".config-item"

# 检查文本内容
npx harness-electron assert --kind text --css ".config-name" --expected "My Config"

# 检查 URL
npx harness-electron assert --kind url --expected "/dashboard"
```

### 断开连接

```bash
npx harness-electron disconnect
```

### 测试示例

完整的测试流程示例：

```bash
# 1. 启动应用
npx electron . --remote-debugging-port=9222

# 2. 连接 Harness
npx harness-electron connect --port 9222

# 3. 点击添加配置按钮
npx harness-electron click --css ".button"

# 4. 填写配置名称
npx harness-electron type --css "#configName" --value "Test Config"

# 5. 填写模型名称
npx harness-electron type --css "#modelName" --value "gpt-3.5-turbo"

# 6. 保存配置
npx harness-electron evaluate --script 'document.querySelectorAll(".button").forEach(btn => { if(btn.textContent.includes("保存")) btn.click() })'

# 7. 检查模型
npx harness-electron evaluate --script 'document.querySelectorAll(".button-success").forEach(btn => btn.click())'

# 8. 等待检查完成
sleep 3

# 9. 截图验证
npx harness-electron screenshot --path ./test-result.png

# 10. 断开连接
npx harness-electron disconnect
```

## 数据存储

应用使用 `localStorage` 存储配置数据：

- **存储键**：`modelCheckerConfigs`
- **数据格式**：JSON 数组
- **自动保存**：每次配置变更时自动保存

## 开发说明

### 技术栈

- **Electron**：桌面应用框架
- **HTML/CSS**：用户界面
- **JavaScript**：前端逻辑
- **Chrome DevTools Protocol**：用于自动化测试

### 修改代码后重新加载

修改 `src/` 目录下的文件后，应用会自动重新加载。

### 调试

应用启动时会自动暴露 CDP 调试端口（9222），可以使用 Chrome DevTools 进行调试。

## 故障排除

### 应用无法启动

- 确保 Node.js 版本 >= 20
- 删除 `node_modules/` 并重新安装依赖
- 检查端口 9222 是否被占用

### 检查失败

- 检查 API URL 和端点是否正确
- 验证 API Key 是否有效
- 查看浏览器控制台的错误信息

### Harness 连接失败

- 确保应用已启动并暴露调试端口
- 检查端口号是否正确（默认 9222）
- 尝试重新连接

## 许可证

MIT License

## 贡献

欢迎提交 Issue 和 Pull Request！

## 联系方式

如有问题或建议，请通过以下方式联系：

- 提交 GitHub Issue
- 发送邮件

---

**注意**：本工具仅用于测试模型 API 的可用性，不会存储或传输您的 API Key 到任何第三方服务器。所有数据均存储在本地。
