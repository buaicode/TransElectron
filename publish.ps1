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

# 设置国内镜像以加速 Electron 及 electron-builder 依赖下载（若用户未自定义）
if (-not $Env:ELECTRON_MIRROR) { $Env:ELECTRON_MIRROR = "https://npmmirror.com/mirrors/electron/" }
if (-not $Env:ELECTRON_BUILDER_DOWNLOAD_MIRROR) { $Env:ELECTRON_BUILDER_DOWNLOAD_MIRROR = "https://npmmirror.com/mirrors/electron-builder-binaries/" }

# 切换到图标生成目录并检查/生成应用图标
Push-Location -Path "build/icons"

# 检查源 logo.png 文件是否存在
if (-not (Test-Path "logo.png")) {
    Write-Error "Error: logo.png does not exist in build/icons. Please provide it before generating icons."
    exit 1
}

# 生成新版 macOS (Big Sur 及以上) 图标
# 如果 icon.icns 不存在，则生成它
if (-not (Test-Path "icon.icns")) {
    # 获取原图宽度和高度
    $dimensions = magick identify -format "%w %h" logo.png
    $dimensions = $dimensions -split " "
    $WIDTH = [int]$dimensions[0]
    $HEIGHT = [int]$dimensions[1]
    # 计算圆角半径为宽度的18%，取整数
    $RADIUS = [int]($WIDTH * 0.18)
    # 使用 ImageMagick 创建硬圆角蒙版并应用，确保切掉部分完全透明
    magick logo.png -alpha Set `( -size "${WIDTH}x${HEIGHT}" xc:none -fill white -draw "roundrectangle 0,0 $WIDTH,$HEIGHT $RADIUS,$RADIUS" `) -compose CopyOpacity -composite rounded_logo.png
    # 添加透明边距：缩小到824x824并居中扩展到1024x1024
    # 这符合 macOS 图标规范中的边距要求
    magick rounded_logo.png -resize 824x824`> -background none -gravity center -extent 1024x1024 padded_logo.png
    # 创建 iconset 目录
    New-Item -Path "icon.iconset" -ItemType Directory -Force
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
    # 转换为 icns 文件 - Windows下尝试调用iconutil，但会忽略错误
    try {
        iconutil -c icns icon.iconset -o icon.icns
    } catch {
        Write-Warning "iconutil not available on Windows. ICNS file will not be created."
        # 注意：Windows环境通常无法执行iconutil，但保留逻辑以保持与Mac脚本一致
    }
}

# 生成旧版 macOS 图标
# 如果 icon_legacy.icns 不存在，则生成它
if (-not (Test-Path "icon_legacy.icns")) {
    # 获取原图宽度和高度
    $dimensions = magick identify -format "%w %h" logo.png
    $dimensions = $dimensions -split " "
    $WIDTH = [int]$dimensions[0]
    $HEIGHT = [int]$dimensions[1]
    # 计算圆角半径为宽度的18%，取整数
    $RADIUS = [int]($WIDTH * 0.18)
    # 使用 ImageMagick 创建硬圆角蒙版并应用，确保切掉部分完全透明
    magick logo.png -alpha Set `( -size "${WIDTH}x${HEIGHT}" xc:none -fill white -draw "roundrectangle 0,0 $WIDTH,$HEIGHT $RADIUS,$RADIUS" `) -compose CopyOpacity -composite legacy_rounded.png
    # 创建 legacy.iconset 目录
    New-Item -Path "legacy.iconset" -ItemType Directory -Force
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
    # 转换为 icns 文件 - Windows下尝试调用iconutil，但会忽略错误
    try {
        iconutil -c icns legacy.iconset -o icon_legacy.icns
    } catch {
        Write-Warning "iconutil not available on Windows. Legacy ICNS file will not be created."
        # 注意：Windows环境通常无法执行iconutil，但保留逻辑以保持与Mac脚本一致
    }
}

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

# 强制 PowerShell 控制台与管道均使用 UTF-8，防止 jq 输出中文被重新编码
$OutputEncoding = [Console]::OutputEncoding = [System.Text.Encoding]::UTF8

# 从 config.json 提取应用名称和标题，使用 PowerShell 原生命令确保 UTF-8 读取不乱码
$configText = Get-Content -Path "config.json" -Raw -Encoding utf8
$configObj  = $configText | ConvertFrom-Json
$NAME        = $configObj.name
$VERSION     = $configObj.version
$DESCRIPTION = $configObj.description
$PRODUCTNAME = $configObj.productName

# 生成应用 ID
$APP_ID      = "com.$(($NAME).ToLower()).electron.app"

# 使用 jq 生成新的 package.json
$tempJson = jq --arg name "$NAME" --arg ver "$VERSION" --arg desc "$DESCRIPTION" --arg product "$PRODUCTNAME" --arg appid "$APP_ID" --arg provider "$GITHUB_PROVIDER" --arg owner "$GITHUB_OWNER" --arg repo "$GITHUB_REPO" `
    '.name = $name | .version = $ver | .description = $desc | .build.productName = $product | .build.appId = $appid | .build.publish[0].provider = $provider | .build.publish[0].owner = $owner | .build.publish[0].repo = $repo | .build.publish[0].releaseType = \"release\"' `
    package.json

# 使用 UTF8Encoding($false) 写入文件，避免 BOM 导致 electron-builder 解析失败
[System.IO.File]::WriteAllText("package.json", $tempJson, (New-Object System.Text.UTF8Encoding $false))

# 构建/发布 Windows 版本
# 忽略“发布超过 2 小时”限制
cross-env EP_GH_IGNORE_TIME=true GH_TOKEN=$GH_TOKEN npx electron-builder --win --publish always

# 从 package.json 获取当前版本号
$VERSION = node -p "require('./package.json').version"

# 使用 GitHub API 获取对应版本的 release ID
$RELEASE_ID = & curl.exe -s -H "Authorization: token $GH_TOKEN" "https://api.github.com/repos/$GITHUB_OWNER/$GITHUB_REPO/releases" | jq -r --arg version "v$VERSION" 'try (.[] | select(.tag_name == $version) | .id) catch empty'

# 如果找到 release ID，则将该 release 的 draft 状态设置为 false（发布它）
if ($RELEASE_ID) {
    Write-Host "Found release ID $RELEASE_ID for v$VERSION, attempting to publish release..."    
    $headers = @{ Authorization = "token $GH_TOKEN"; Accept = "application/vnd.github+json" }
    $body = @{ draft = $false } | ConvertTo-Json
    try {
        Invoke-RestMethod -Uri "https://api.github.com/repos/$GITHUB_OWNER/$GITHUB_REPO/releases/$RELEASE_ID" -Method Patch -Headers $headers -Body $body -ErrorAction Stop | Out-Null
        $PATCH_RESPONSE = "204"  # GitHub returns 200 or 204 on success; treat as success
    } catch {
        $PATCH_RESPONSE = $_.Exception.Response.StatusCode.value__
        Write-Warning $_.Exception.Message
    }
    Write-Host "GitHub API PATCH response status code: $PATCH_RESPONSE"
} else {
    Write-Warning "Release for version v$VERSION not found (draft not created). Build or upload might have failed."
}

# 注意: 请确保 .env 中有正确的 GH_TOKEN，并在运行前更新版本号如果需要自定义。
# 此脚本假设 Windows 版本的 ImageMagick 和 jq 已安装，用于图标生成和JSON处理。