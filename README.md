# ToolsAI Electron 应用

这是一个简单的Electron应用，将ToolsAI网站嵌入到桌面应用中。

## 功能

- 将网站 `https://transall.toolsai.com.cn` 嵌入到Electron应用中
- 支持多标签浏览，新标签在当前窗口显示，不会打开新窗口
- 工具栏包含刷新和首页按钮（图标形式）
- 智能标签栏：只有一个标签时自动隐藏标签栏
- 支持窗口放大（全屏）和缩放功能
- 完整的快捷键支持

### 快捷键

- `Ctrl+T` / `Cmd+T`：新建标签
- `Ctrl+W` / `Cmd+W`：关闭当前标签（至少保留一个标签）
- `Ctrl+R` / `Cmd+R`：刷新当前标签
- `Ctrl+F` / `Cmd+F`：切换全屏
- `Ctrl+0` / `Cmd+0`：重置缩放
- `Ctrl+=` / `Cmd+=`：放大
- `Ctrl+-` / `Cmd+-`：缩小

### 界面功能

- **刷新按钮**：刷新当前活动标签的页面
- **首页按钮**：将当前标签导航到首页
- **新建标签按钮**：创建新的标签页
- **标签关闭按钮**：关闭对应的标签（悬停时显示）

## 安装

```bash
# 安装依赖
npm install
# 或
yarn install
```

## 运行

```bash
# 启动应用
npm start
# 或
yarn start
```

## 构建

如需构建为可执行文件，可以添加以下依赖和脚本：

```bash
# 安装electron-builder
npm install electron-builder --save-dev
# 或
yarn add electron-builder --dev
```

然后在package.json中添加构建脚本：

```json
"scripts": {
  "start": "electron .",
  "build": "electron-builder",
  "test": "echo \"Error: no test specified\" && exit 1"
}
```

## 注意事项

- 如果网站需要登录或有其他特殊要求，可能需要在main.js中进行额外配置
- 如果需要与网站进行更深入的交互，可能需要使用preload脚本和IPC通信