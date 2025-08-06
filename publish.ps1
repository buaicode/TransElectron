# PowerShell 发布脚本 (与publish.sh功能对等的Windows版本)

# 加载 .env 文件以设置环境变量
$envContent = Get-Content -Path ".env"
foreach ($line in $envContent) {
    if ($line -match "^([^=]*)=(.*)$") {
        $name = $matches[1]
        $value = $matches[2]
        Set-Variable -Name $name -Value $value
        # 同时设置环境变量供进程使用
        [Environment]::SetEnvironmentVariable($name, $value, "Process")
    }
}

# 切换到图标生成目录并检查/生成应用图标
Push-Location -Path "build/icons"

# 检查源 logo.png 文件是否存在
if (-not (Test-Path "logo.png")) {
    Write-Error "Error: logo.png does not exist in build/icons. Please provide it before generating icons."
    exit 1
}

# Windows 下不需要生成 .icns 文件，仅生成 .ico 文件

# 生成 Windows 图标
if (-not (Test-Path "icon.ico")) {
    # 检查是否安装了 ImageMagick
    if (-not (Get-Command magick -ErrorAction SilentlyContinue)) {
        Write-Error "Error: ImageMagick is required but not installed. Please install it to proceed."
        exit 1
    }
    
    # 获取原图宽度和高度
    $dimensions = magick identify -format "%w %h" logo.png
    $dimensions = $dimensions -split " "
    $WIDTH = [int]$dimensions[0]
    $HEIGHT = [int]$dimensions[1]
    
    # 计算圆角半径为宽度的18%，取整数
    $RADIUS = [int]($WIDTH * 0.18)
    
    # 使用 ImageMagick 创建硬圆角蒙版并应用，确保切掉部分完全透明
    magick logo.png -alpha Set `( -size "${WIDTH}x${HEIGHT}" xc:none -fill white -draw "roundrectangle 0,0 $WIDTH,$HEIGHT $RADIUS,$RADIUS" `) -compose CopyOpacity -composite win_rounded.png
    
    # 生成所需分辨率的 PNG 文件
    magick win_rounded.png -resize 256x256! icon-256.png
    magick win_rounded.png -resize 48x48! icon-48.png
    magick win_rounded.png -resize 32x32! icon-32.png
    magick win_rounded.png -resize 24x24! icon-24.png
    magick win_rounded.png -resize 16x16! icon-16.png
    
    # 将多个 PNG 合成为 ICO 文件
    magick icon-256.png icon-48.png icon-32.png icon-24.png icon-16.png icon.ico
}

# 返回项目根目录
Pop-Location

# 从 config.json 和 .env 同步配置到 package.json
# 检查是否安装了 jq
if (-not (Get-Command jq -ErrorAction SilentlyContinue)) {
    Write-Error "Error: jq is required but not installed. Please install jq to proceed."
    exit 1
}

# 从 config.json 提取应用名称和标题
$APP_NAME = jq -r '.appName' config.json
$TITLE = jq -r '.title' config.json

# 生成应用 ID
$APP_ID = "com.$(($APP_NAME).ToLower()).electron.app"

# 使用 jq 更新 package.json 中的字段
jq --arg name "$APP_NAME" --arg desc "$TITLE" --arg product "$APP_NAME" --arg appid "$APP_ID" --arg owner "$GITHUB_OWNER" --arg repo "$GITHUB_REPO" \
    '.name = $name | .description = $desc | .build.productName = $product | .build.appId = $appid | .build.publish[0].owner = $owner | .build.publish[0].repo = $repo' \
    package.json > temp.json

Move-Item -Path temp.json -Destination package.json -Force

# 更新版本并构建/发布 Windows 版本
npm version patch --no-git-tag-version
npm run build:win -- --publish always

# 从 package.json 获取当前版本号
$VERSION = node -p "require('./package.json').version"

# 使用 GitHub API 获取对应版本的 release ID
$releaseInfo = curl -s -H "Authorization: token $GH_TOKEN" "https://api.github.com/repos/$GITHUB_OWNER/$GITHUB_REPO/releases"
$RELEASE_ID = $releaseInfo | jq -r --arg version "v$VERSION" '.[] | select(.tag_name == $version) | .id'

# 如果找到 release ID，则将该 release 的 draft 状态设置为 false（发布它）
if ($RELEASE_ID) {
    curl -H "Authorization: token $GH_TOKEN" \
         -H "Accept: application/vnd.github.v3+json" \
         -X PATCH "https://api.github.com/repos/$GITHUB_OWNER/$GITHUB_REPO/releases/$RELEASE_ID" \
         -d '{"draft": false}'
}

# 注意: 请确保 .env 中有正确的 GH_TOKEN，并在运行前更新版本号如果需要自定义。
# 此脚本假设 Windows 版本的 ImageMagick 和 jq 已安装，用于图标生成和JSON处理。