#!/bin/bash

# 加载 .env 文件以设置环境变量
# 这允许环境变量在脚本中可用，而不导出到父shell
set -a
source .env
set +a

# 设置国内镜像以加速 Electron 及 electron-builder 依赖下载（若用户未自定义）
: ${ELECTRON_MIRROR:="https://npmmirror.com/mirrors/electron/"}
: ${ELECTRON_BUILDER_DOWNLOAD_MIRROR:="https://npmmirror.com/mirrors/electron-builder-binaries/"}
export ELECTRON_MIRROR ELECTRON_BUILDER_DOWNLOAD_MIRROR

# 切换到图标生成目录并检查/生成应用图标
# 此部分确保所有平台所需的图标文件存在
cd build/icons

# 检查源 logo.png 文件是否存在
# 如果不存在，输出错误并退出脚本
if [ ! -f "logo.png" ]; then
  echo "Error: logo.png does not exist in build/icons. Please provide it before generating icons."
  exit 1
fi

# 生成新版 macOS (Big Sur 及以上) 图标
# 如果 icon.icns 不存在，则生成它
if [ ! -f "icon.icns" ]; then
  # 获取原图宽度和高度
  WIDTH=$(magick identify -format "%w" logo.png)
  HEIGHT=$(magick identify -format "%h" logo.png)
  # 计算圆角半径为宽度的18%，取整数
  RADIUS=$(echo "$WIDTH * 0.18" | bc -l | cut -d. -f1)
  # 使用 ImageMagick 创建硬圆角蒙版并应用，确保切掉部分完全透明
  magick logo.png -alpha Set \( -size ${WIDTH}x${HEIGHT} xc:none -fill white -draw "roundrectangle 0,0 $WIDTH,$HEIGHT $RADIUS,$RADIUS" \) -compose CopyOpacity -composite rounded_logo.png
  # 添加透明边距：缩小到824x824并居中扩展到1024x1024
  # 这符合 macOS 图标规范中的边距要求
  magick rounded_logo.png -resize 824x824\> -background none -gravity center -extent 1024x1024 padded_logo.png
  # 创建 iconset 目录
  mkdir -p icon.iconset
  # 生成各种分辨率的 PNG 文件，用于 icns 格式
  # ! 表示忽略宽高比强制调整大小
  magick padded_logo.png -resize 16x16! icon.iconset/icon_16x16.png
  magick padded_logo.png -resize 32x32! icon.iconset/icon_16x16@2x.png
  magick padded_logo.png -resize 32x32! icon.iconset/icon_32x32.png
  magick padded_logo.png -resize 64x64! icon.iconset/icon_32x32@2x.png
  magick padded_logo.png -resize 128x128! icon.iconset/icon_128x128.png
  magick padded_logo.png -resize 256x256! icon.iconset/icon_128x128@2x.png
  magick padded_logo.png -resize 256x256! icon.iconset/icon_256x256.png
  magick padded_logo.png -resize 512x512! icon.iconset/icon_256x256@2x.png
  magick padded_logo.png -resize 512x512! icon.iconset/icon_512x512.png
  magick padded_logo.png -resize 1024x1024! icon.iconset/icon_512x512@2x.png
  # 使用 iconutil 将 iconset 转换为 icns 文件
  iconutil -c icns icon.iconset -o icon.icns
fi

# 生成旧版 macOS 图标
# 如果 icon_legacy.icns 不存在，则生成它
# 旧版不添加额外边距，但应用圆角
if [ ! -f "icon_legacy.icns" ]; then
  # 获取原图宽度和高度
  WIDTH=$(magick identify -format "%w" logo.png)
  HEIGHT=$(magick identify -format "%h" logo.png)
  # 计算圆角半径为宽度的18%，取整数
  RADIUS=$(echo "$WIDTH * 0.18" | bc -l | cut -d. -f1)
  # 使用 ImageMagick 创建硬圆角蒙版并应用，确保切掉部分完全透明
  magick logo.png -alpha Set \( -size ${WIDTH}x${HEIGHT} xc:none -fill white -draw "roundrectangle 0,0 $WIDTH,$HEIGHT $RADIUS,$RADIUS" \) -compose CopyOpacity -composite legacy_rounded.png
  # 创建 legacy.iconset 目录
  mkdir -p legacy.iconset
  # 生成各种分辨率的 PNG 文件
  magick legacy_rounded.png -resize 16x16! legacy.iconset/icon_16x16.png
  magick legacy_rounded.png -resize 32x32! legacy.iconset/icon_16x16@2x.png
  magick legacy_rounded.png -resize 32x32! legacy.iconset/icon_32x32.png
  magick legacy_rounded.png -resize 64x64! legacy.iconset/icon_32x32@2x.png
  magick legacy_rounded.png -resize 128x128! legacy.iconset/icon_128x128.png
  magick legacy_rounded.png -resize 256x256! legacy.iconset/icon_128x128@2x.png
  magick legacy_rounded.png -resize 256x256! legacy.iconset/icon_256x256.png
  magick legacy_rounded.png -resize 512x512! legacy.iconset/icon_256x256@2x.png
  magick legacy_rounded.png -resize 512x512! legacy.iconset/icon_512x512.png
  magick legacy_rounded.png -resize 1024x1024! legacy.iconset/icon_512x512@2x.png
  # 转换为 icns 文件
  iconutil -c icns legacy.iconset -o icon_legacy.icns
fi

# 生成 Windows 图标
# 如果 icon.ico 不存在，则生成它
if [ ! -f "icon.ico" ]; then
  # 获取原图宽度和高度
  WIDTH=$(magick identify -format "%w" logo.png)
  HEIGHT=$(magick identify -format "%h" logo.png)
  # 计算圆角半径为宽度的18%，取整数
  RADIUS=$(echo "$WIDTH * 0.18" | bc -l | cut -d. -f1)
  # 使用 ImageMagick 创建硬圆角蒙版并应用，确保切掉部分完全透明
  magick logo.png -alpha Set \( -size ${WIDTH}x${HEIGHT} xc:none -fill white -draw "roundrectangle 0,0 $WIDTH,$HEIGHT $RADIUS,$RADIUS" \) -compose CopyOpacity -composite win_rounded.png
  # 生成所需分辨率的 PNG 文件
  magick win_rounded.png -resize 256x256! icon-256.png
  magick win_rounded.png -resize 48x48! icon-48.png
  magick win_rounded.png -resize 32x32! icon-32.png
  magick win_rounded.png -resize 24x24! icon-24.png
  magick win_rounded.png -resize 16x16! icon-16.png
  # 将多个 PNG 合成为 ICO 文件
  magick icon-256.png icon-48.png icon-32.png icon-24.png icon-16.png icon.ico
fi

# 返回项目根目录
cd ../..

# 从 config.json 和 .env 同步配置到 package.json
# 检查 jq 工具是否安装，如果未安装则退出
command -v jq >/dev/null 2>&1 || { echo "Error: jq is required but not installed. Please install jq to proceed." >&2; exit 1; }

# 从 config.json 提取应用名称和标题
NAME=$(jq -r '.name' config.json)
VERSION=$(jq -r '.version' config.json)
DESCRIPTION=$(jq -r '.description' config.json)
PRODUCTNAME=$(jq -r '.productName' config.json)

# 生成应用 ID
APP_ID="com.$(echo "$NAME" | tr '[:upper:]' '[:lower:]').electron.app"

# 使用 jq 更新 package.json 中的字段
# 包括名称、描述、产品名、appId 和发布配置
jq --arg name "$NAME" --arg ver "$VERSION" --arg desc "$DESCRIPTION" --arg product "$PRODUCTNAME" --arg appid "$APP_ID" --arg provider "$GITHUB_PROVIDER" --arg owner "$GITHUB_OWNER" --arg repo "$GITHUB_REPO" \
    '.name = $name | .version = $ver | .description = $desc | .build.productName = $product | .build.appId = $appid | .build.publish[0].provider = $provider | .build.publish[0].owner = $owner | .build.publish[0].repo = $repo' \
    package.json > temp.json && mv temp.json package.json

# macOS 下更新版本并构建/发布
npm run build:mac -- --publish always

# 从 package.json 获取当前版本号
VERSION=$(node -p "require('./package.json').version")

# 使用 GitHub API 获取对应版本的 release ID
# 需要 GH_TOKEN 环境变量进行认证
RELEASE_ID=$(curl -s -H "Authorization: token $GH_TOKEN" https://api.github.com/repos/$GITHUB_OWNER/$GITHUB_REPO/releases | jq -r --arg version "v$VERSION" '.[] | select(.tag_name == $version) | .id')

# 如果找到 release ID，则将该 release 的 draft 状态设置为 false（发布它）
if [ -n "$RELEASE_ID" ]; then
    curl -H "Authorization: token $GH_TOKEN" \
         -H "Accept: application/vnd.github.v3+json" \
         -X PATCH https://api.github.com/repos/$GITHUB_OWNER/$GITHUB_REPO/releases/$RELEASE_ID \
         -d '{"draft": false}'
fi

# 注意: 请确保 .env 中有正确的 GH_TOKEN，并在运行前更新版本号如果需要自定义。
# 此脚本假设 ImageMagick 和 iconutil 已安装，用于图标生成。