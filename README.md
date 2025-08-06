# TransElectron

TransElectron - A tool that wraps a website into an Electron-based desktop client（一个将网站包装成基于 Electron 的桌面客户端的工具）.

## 功能

- 将网站嵌入到 Electron 应用中（通过 config.json 配置 homeUrl）
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

## 操作指南

其他人拿到这个项目后，可以按照以下步骤操作：

### 1. 下载依赖

克隆仓库后，进入项目目录，运行以下命令安装依赖：

```bash
npm install
```

或者使用 Yarn：

```bash
yarn install
```

### 2. 配置个性化信息

- **编辑 config.json**：修改 `appName`、`title`、`homeUrl`等字段来个性化应用名称、标题、主页URL。
- **添加 logo**：将你的 logo PNG 文件放置在 `build/icons/logo.png` 路径下，用于生成应用图标。如果不存在，发布脚本会提示错误。

### 3. 运行应用

运行以下命令启动开发模式：

```bash
npm start
```

或者使用 Yarn：

```bash
yarn start
```

### 4. 打包和发布

- **安装构建工具**：如果未安装 electron-builder，运行 `npm install electron-builder --save-dev` 或 `yarn add electron-builder --dev`。
- **开发环境启动**：编辑 `dev-app-update.yml` 文件设置 `owner` 和 `repo`，然后运行 `yarn dev`。开发环境中，更新配置从 `dev-app-update.yml` 加载。
- **打包**：根据平台运行 `npm run build:mac` (macOS) 或 `npm run build:win` (Windows)。生产环境中，更新配置从构建时生成的 `app-update.yml` 加载，该文件基于 `package.json` 的 `build.publish` 配置生成。
- **发布**：编辑 `.env` 文件设置 `GITHUB_OWNER`、`GITHUB_REPO` 和 `GH_TOKEN`，然后运行 `./publish.sh`或 `bash publish.sh` 来构建并发布到 GitHub Releases。构建脚本使用 `.env` 更新 `package.json` 中的发布配置。

### 5. 其他注意事项

- 确保 ImageMagick 已安装，用于图标生成（macOS: `brew install imagemagick`）。
- 更新 `package.json` 中的 `name` 和 `build.productName` 以匹配 config.json 中的 appName。
- 对于自动更新，确保 GitHub 仓库配置正确。
- 如果修改了代码，测试后重新打包。

## 注意事项

- 如果网站需要登录或有其他特殊要求，可能需要在main.js中进行额外配置
- 如果需要与网站进行更深入的交互，可能需要使用preload脚本和IPC通信

## config.json中的配置留存（该文件不允许存在注释内容，所以放在这了）
- "appName": "TransElectron",
- "title": "TransElectron-将网站包装成基于 Electron 的桌面客户端",
- "homeUrl": "https://transall.toolsai.com.cn"

- "appName": "ToolsAI",
- "title": "ToolsAI-兔子AI，你的AI工具导航网站",
- "homeUrl": "https://toolsai.com.cn"

- "appName": "TransAll",
- "title": "TransAll-你的全能格式转换工具",
- "homeUrl": "https://transall.toolsai.com.cn"

## .env文件格式示例（用于构建和发布）
- GITHUB_OWNER=buaicode
- GITHUB_REPO=ToolsAI-Electron
- GH_TOKEN=你的Github Token