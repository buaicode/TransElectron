#!/bin/bash

# 加载 .env 文件以设置环境变量
set -a
source .env
set +a

# 自动递增版本号 (patch 级别)
npm version patch --no-git-tag-version

# 同时运行 Mac 和 Windows 的构建和发布命令
npm run build:mac -- --publish always
npm run build:win -- --publish always

# 注意: 请确保 .env 中有正确的 GH_TOKEN，并在运行前更新版本号如果需要自定义。