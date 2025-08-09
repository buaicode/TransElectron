# TransElectron

TransElectron - 一个将网站包装成基于 Electron 的桌面客户端的工具（A tool that wraps a website into an Electron-based desktop client）.

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

## 操作指南

### 1. 环境搭建

请确保本地已安装 Node.js 20 或更高版本（推荐使用v22.12.0 LTS 版本）。可使用 `node -v` 检查当前版本。

### 2. 下载依赖

克隆仓库后，进入项目根目录，运行以下命令安装依赖：

```bash
npm install
```

### 3. 安装所需工具

- **安装构建所需工具**：如果未安装 electron-builder，运行 `npm install electron-builder --save-dev` 或 `yarn add electron-builder --dev`。
- **安装发布所需工具**：
  - 安装 ImageMagick，用于图标生成（macOS: `brew install imagemagick`；Windows: 可访问官网下载安装包或使用 `choco install imagemagick`）；
  - 安装 jq ，用于 JSON 处理（macOS: `brew install jq`；Windows: `choco install jq` 或从 <https://stedolan.github.io/jq/download/> 获取）。

### 4. 配置个性化信息

- **编辑 config.json**：修改 `appName`、`title`、`homeUrl`、 `name`、`version`、`description`、`productName` 等字段来个性化应用名称、标题、主页URL、包名、版本号、描述、展示名称（跟应用名称相同）。
- **创建 .env 文件**：在项目根目录创建 `.env` 文件，设置 `GITHUB_PROVIDER`、`GITHUB_OWNER`、`GITHUB_REPO`、`GH_TOKEN` （只构建不发布的话，可以用示例值）。
- **编辑 package.json**：修改 `name`、`version`、`description`、`productName` 等字段来包名、版本号、描述、展示名称（如果使用 `npm run publish` 来发布，可以不用修改； 如果使用 `npm run build` 来构建，则需要修改）。
- **添加 logo**：将你的 logo PNG 文件放置在 `build/icons/logo.png` 路径下，用于生成应用图标。如果不存在，发布脚本会提示错误。
- **编辑 dev-app-update.yml 文件**：修改 `provider`、`owner`、`repo` （开发环境中，更新配置从 `dev-app-update.yml` 加载）。


### 5. 启动、打包和发布

- **启动**：运行 `npm run dev`即可。
- **打包**：运行 `npm run build` 即可。或根据平台运行 `npm run build:mac` (macOS) 或 `npm run build:win` (Windows)。生产环境中，更新配置从构建时生成的 `app-update.yml` 加载，该文件基于 `package.json` 的 `build.publish` 配置自动生成。
- **发布**：运行 `npm run publish` 即可。该命令会自动检测当前操作系统并调用对应发布脚本（macOS 调用 `publish.sh`、Windows 调用 `publish.ps1`），读取 `config.json` 跟 `.env` 中的变量并自动更新 `package.json` 的发布配置，随后构建并上传安装包到 GitHub Releases（需确保 `.env` 已正确设置，尤其是`.env` 中的 `GH_TOKEN` 已正确设置，否则无法使用发布功能，也无法使用自动更新功能以及git推送功能）。

## 注意事项

- 如果网站需要登录或有其他特殊要求，可能需要在main.js中进行额外配置
- 如果需要与网站进行更深入的交互，可能需要使用preload脚本和IPC通信

## config.json中的配置留存（该文件不允许存在注释内容，所以放在这了）
- "appName": "TransElectron",
- "title": "TransElectron-将网站包装成基于 Electron 的桌面客户端",
- "homeUrl": "https://transall.toolsai.com.cn",
- "name": "transelectron",
- "version": "1.0.0",
- "description": "将网站包装成基于 Electron 的桌面客户端",
- "productName": "TransElectron"

- "appName": "ToolsAI",
- "title": "ToolsAI-兔子AI，你的AI工具导航网站",
- "homeUrl": "https://toolsai.com.cn",
- "name": "toolsai",
- "version": "1.0.0",
- "description": "兔子AI，你的AI工具导航网站",
- "productName": "ToolsAI"

- "appName": "TransAll",
- "title": "TransAll-你的全能格式转换工具",
- "homeUrl": "https://transall.toolsai.com.cn",
- "name": "transall",
- "version": "1.0.0",
- "description": "你的全能格式转换工具",
- "productName": "TransAll"

## .env文件格式示例（用于发布、更新及git）
- GITHUB_PROVIDER=github
- GITHUB_OWNER=buaicode
- GITHUB_REPO=ToolsAI-Electron
- GH_TOKEN=你的Github Token

## Git 拉取、提交与推送要点

- 初始化时配置用户名和邮箱：`git config --global user.name "Your Name"`、`git config --global user.email "you@example.com"`。
- 使用功能分支开发，合并到 `main` 前先执行 `git pull --rebase origin main` 保持线性历史，避免无意义的 merge commit。
- 提交前检查修改：`git status`、`git diff`；按 **Conventional Commits** 编写原子化提交消息，例如 `feat: 支持多语言界面`。
- 推送前若远程存在更新，先拉取解决冲突后再 `git push`；冲突解决后可使用 `git commit --no-edit` 保留自动生成的 merge/rebase 消息。
- 推送需要身份验证：必须在 `.env` 保存 `GH_TOKEN`，并将远程地址设置为 `https://<owner>:<token>@github.com/<owner>/<repo>.git`（用户名可以用仓库 owner，也可以用 `x-access-token`），例如：
  ```bash
  git remote set-url origin https://$GITHUB_OWNER:$GH_TOKEN@github.com/$GITHUB_OWNER/$GITHUB_REPO.git
  ```
- 拉取需要身份验证时，可使用与推送相同的远程地址结构，例如：
  ```bash
  git pull https://$GITHUB_OWNER:$GH_TOKEN@github.com/$GITHUB_OWNER/$GITHUB_REPO.git main
  ```
- 如果已经使用带 Token 的远程别名 `origin`，直接执行 `git pull origin main` 即可。
- 网络故障时先测试连通性 `git ls-remote origin`，或切换网络 / 使用代理后重试 `git push`。
- **谨慎使用强制推送**：`git push --force` 仅在确需覆盖远程历史（如误提交敏感信息）时使用，并应提前告知协作者。
- 常用查看差异命令：`git log --oneline --graph --decorate --all`、`git diff --stat HEAD..origin/main`，帮助快速定位分支差异。
