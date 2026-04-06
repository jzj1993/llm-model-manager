Feature
- 首页列表上角有三个按钮，全展开、默认模式、全折叠，全折叠的时候可以显示得更紧凑。
- Provider的详细信息可以折叠展开。或者直接把界面做成二级表格形式。
- 首页列表支持折叠展开Models
- 模型列表页可以复制API key。
- 加载模型列表支持搜索过滤


BUG
- API Key去掉自动补全前缀SK
- Provider应该有自己的OpenAI和Anthropic Endpoint，切换接口类型时，不要自动填充。


技术栈
Electron Vite + React + TypeScript + Tailwind CSS + shadcn/ui
