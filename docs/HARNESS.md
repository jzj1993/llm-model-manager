# Harness 自动化测试指南

本项目可通过 [@harnessgg/electron](https://www.harness.gg/electron) 连接 Electron 应用并执行自动化操作。

## 安装

```bash
npm install -D @harnessgg/electron
```

## 启动应用并暴露调试端口

```bash
npx electron . --remote-debugging-port=9222
```

## 连接应用

```bash
npx harness-electron connect --port 9222
```

## 常用命令

### 查看 DOM

```bash
npx harness-electron dom --format summary
npx harness-electron dom --format tree
npx harness-electron dom --format html
```

### 交互操作

```bash
npx harness-electron click --css ".button"
npx harness-electron type --css "#configName" --value "My Config"
npx harness-electron wait --for visible --css ".config-item"
npx harness-electron wait --for url --value "/dashboard"
```

### 截图

```bash
npx harness-electron screenshot --path ./screenshot.png
npx harness-electron screenshot --path ./element.png --css ".config-item"
npx harness-electron screenshot --path ./full-page.png --full-page
```

### 执行脚本

```bash
npx harness-electron evaluate --script 'document.querySelectorAll(".button").forEach(btn => btn.click())'
npx harness-electron evaluate --script 'document.querySelector(".config-item").getAttribute("data-index")'
```

### 断言

```bash
npx harness-electron assert --kind exists --css ".config-item"
npx harness-electron assert --kind visible --css ".config-item"
npx harness-electron assert --kind text --css ".config-name" --expected "My Config"
npx harness-electron assert --kind url --expected "/dashboard"
```

## 断开连接

```bash
npx harness-electron disconnect
```

## 端到端示例流程

```bash
# 1) 启动应用
npx electron . --remote-debugging-port=9222

# 2) 连接 Harness
npx harness-electron connect --port 9222

# 3) 点击添加配置按钮
npx harness-electron click --css ".button"

# 4) 填写配置名称
npx harness-electron type --css "#configName" --value "Test Config"

# 5) 填写模型名称
npx harness-electron type --css "#modelName" --value "gpt-3.5-turbo"

# 6) 保存配置
npx harness-electron evaluate --script 'document.querySelectorAll(".button").forEach(btn => { if (btn.textContent.includes("保存")) btn.click() })'

# 7) 触发检查
npx harness-electron evaluate --script 'document.getElementById("checkSelectedButton")?.click()'

# 8) 等待结果
sleep 3

# 9) 截图
npx harness-electron screenshot --path ./test-result.png

# 10) 断开连接
npx harness-electron disconnect
```

## 常见问题

### 无法连接 Harness

- 确认应用已使用 `--remote-debugging-port=9222` 启动
- 确认端口未被其他进程占用
- 重新执行 `connect` 命令
