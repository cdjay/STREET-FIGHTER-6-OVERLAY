# SF6 Live Overlay
![Uploading Screenshot 2026-01-16 11-18-15.png…]()

> Street Fighter 6 直播专用 Overlay - OBS 文字源 + 自动生成曲线图方案

## ✅ 功能特性

- ✅ **零缓存问题** - 使用 OBS 文字源，实时读取 TXT 文件
- ✅ **自动生成曲线图** - 每次数据更新自动生成透明背景 PNG
- ✅ **段位图标自动输出** - 自动生成 `obs-output/rank.png`
- ✅ **常用角色输出** - 自动生成 `favorite-character.txt`（全大写）
- ✅ **简化控制面板** - 一键开始获取数据、会话结束/清除、历史 ID 快捷打开
- ✅ **ML 段位正确显示** - rank42 → Master League 5

---

## 🚀 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 启动服务器

- Windows 一键启动：`start-live.bat`
- 或手动启动：

```bash
node server.js
```

### 3. 安装油猴脚本

1. 安装 Tampermonkey 浏览器扩展
2. 安装 `sf6-live-local.user.js` 脚本（允许访问 `localhost`）

### 4. 开始获取数据

打开控制页面：

```
http://localhost:8080/config-simple.html
```

输入 Capcom User ID → 点击"开始获取数据"，会自动打开卡片页并开始同步。

### 5. 配置 OBS

详见下方的 **[OBS 配置指南](#obs-配置指南)**

---

## 📂 项目结构

```
SF6LIVE/
├── server.js                    # HTTP 服务器主程序
├── session-manager.js           # 会话管理模块
├── output-txt.js                # TXT/段位图标输出
├── output-chart.js              # 曲线图 HTML 生成
├── generate-chart-png.js        # 曲线图 PNG 自动生成
├── sf6-live-local.user.js       # 油猴脚本
├── config-simple.html           # 简化控制面板
├── js/config-simple.js          # 控制面板脚本
├── start-live.bat               # 一键启动脚本（Windows）
├── package.json                 # 依赖配置
├── obs-output/                  # OBS 输出目录（运行时生成）
├── images/                      # 段位图标
│   └── rank1_s.png ~ rank42_s.png
└── README.md                    # 本文件
```

---

## 📁 项目文件说明

### 核心文件（必需）

#### 服务器端
| 文件 | 类型 | 功能 | 状态 |
|------|------|------|------|
| **server.js** | JavaScript | HTTP 服务器主程序，接收数据、生成文件 | ✅ 核心必需 |
| **session-manager.js** | JavaScript | 会话管理模块，追踪 MR 历史、胜负记录 | ✅ 核心必需 |
| **output-txt.js** | JavaScript | 生成 TXT 文件 + 段位图标输出 | ✅ 核心必需 |
| **output-chart.js** | JavaScript | 生成 MR 曲线图 HTML | ✅ 核心必需 |
| **generate-chart-png.js** | JavaScript | 使用 Puppeteer 将图表转为 PNG | ✅ 核心必需 |

#### 客户端
| 文件 | 类型 | 功能 | 状态 |
|------|------|------|------|
| **sf6-live-local.user.js** | Tampermonkey 脚本 | 从 Capcom API 获取数据并发送到本地 | ✅ 核心必需 |
| **config-simple.html** | HTML | 简化版控制面板（开始获取/会话控制） | ✅ 推荐使用 |
| **js/config-simple.js** | JavaScript | 控制面板脚本 | ✅ 推荐使用 |
| **start-live.bat** | 批处理 | 一键启动服务器 + 打开控制页 | ✅ 推荐使用 |

### 资源文件

#### images/ 目录
- **rank1_s.png ~ rank42_s.png**
- 功能：段位图标（1-42）
- 用途：自动复制生成 `obs-output/rank.png`
- 状态：✅ 需要显示段位图标时必需

### 运行时生成的文件

| 文件 | 功能 | 生成时机 |
|------|------|----------|
| **session.json** | 会话数据（MR 历史、胜负记录） | 首次接收数据时 |
| **player_data.json** | 当前玩家数据快照 | 每次数据更新时 |
| **localStorage.json** | LocalStorage 模拟文件 | 每次数据更新时 |
| **chart-generator.html** | 曲线图 HTML | 每次图表生成时 |

### 最小文件集合（核心功能）

```
必需文件：
├── server.js
├── session-manager.js
├── output-txt.js
├── output-chart.js
├── generate-chart-png.js
├── sf6-live-local.user.js
├── config-simple.html
├── js/config-simple.js
├── start-live.bat
├── package.json
└── images/ (可选)
```

---

## 🔄 工作流程

```
sf6-live-local.user.js (油猴脚本)
        ↓
    从 Capcom API 获取数据
        ↓
    POST /receiver 发送到服务器
        ↓
server.js (HTTP 服务器)
        ↓
    ┌───┴───┬───────────────┬──────────────┐
    ↓       ↓               ↓              ↓
session-  output-txt.js   output-chart.js  generate-
manager.js    ↓               ↓              chart-png.js
    ↓   生成 TXT + rank.png   ↓              ↓
session.json      ↓        chart-generator.html
            obs-output/              ↓
            *.txt *.png         Puppeteer 截图
                               ↓
                          mr-chart.png
```

---

## 📄 输出文件

### TXT 文件（实时更新）

服务器会自动生成以下 TXT 文件到 `obs-output` 目录：

| 文件名 | 内容 | 示例 | OBS 用途 |
|--------|------|------|----------|
| `player-name.txt` | 玩家名称 | 户型鉴定师 Lv.8 | 文字源 |
| `mr.txt` | MR 值 | 1828 | 文字源 |
| `lp.txt` | LP 值 | 50271 | 文字源 |
| `rank-name.txt` | 段位名称 | Master League 5 | 文字源 |
| `rank-number.txt` | 段位编号 | 42 | 文字源 |
| `rank-image-path.txt` | 段位图标路径参考 | images/rank42_s.png | 参考 |
| `favorite-character.txt` | 常用角色（全大写） | ZANGIEF | 文字源 |
| `mr-change.txt` | MR 变化 | +50 | 文字源 |
| `win-loss.txt` | 胜负记录 | 5/3 | 文字源 |
| `start-mr.txt` | 会话起始 MR | 1778 | 文字源 |
| `peak-mr.txt` | 会话最高 MR | 1850 | 文字源 |
| `full-info.txt` | 完整信息组合 | 多行文本 | 文字源 |

### 图片文件（自动生成）

| 文件名 | 说明 | OBS 用途 |
|--------|------|----------|
| `rank.png` | 当前段位图标 | 图像源 |
| `mr-chart.png` | MR 曲线图，1436x180，透明背景 | 图像源 |

---

## 🎥 OBS 配置指南

### 方案说明

使用 **OBS 文字源** 代替浏览器源，彻底解决缓存问题。

### 优点
- ✅ **零缓存问题** - 实时读取 TXT 文件
- ✅ **性能更好** - 资源占用低
- ✅ **更稳定** - 不会出现浏览器兼容性问题
- ✅ **更灵活** - 可以单独控制每个元素

---

### 方案 1: 分别添加文字源（推荐）

#### 1. 添加玩家名称

1. 在 OBS 中点击 **来源** → **+** → **文本（GDI+）**
2. 命名为 "SF6-玩家名称"
3. 勾选 **从文件读取**
4. 点击 **浏览**，选择：`obs-output/player-name.txt`
5. 设置字体：
   - 字体：**Microsoft YaHei UI** 或 **思源黑体**
   - 大小：**48**
   - 颜色：**白色 (#FFFFFF)**
   - 勾选 **轮廓**，颜色：**黑色**，大小：**4**
   - 勾选 **投影**

#### 2. 添加 MR 值

1. 添加新的 **文本（GDI+）**
2. 命名为 "SF6-MR"
3. 从文件读取：`obs-output/mr.txt`
4. 设置字体：
   - 字体：**Arial** 或 **Consolas**
   - 大小：**64**
   - 颜色：**青色 (#00B3FF)**
   - 勾选 **轮廓**，颜色：**黑色**，大小：**4**
   - 勾选 **投影**

#### 3. 添加段位名称

1. 添加新的 **文本（GDI+）**
2. 命名为 "SF6-段位"
3. 从文件读取：`obs-output/rank-name.txt`
4. 设置字体：
   - 字体：**Arial**
   - 大小：**36**
   - 颜色：**金色 (#FFCC00)**
   - 勾选 **轮廓**，颜色：**黑色**，大小：**3**

#### 4. 添加常用角色

1. 添加新的 **文本（GDI+）**
2. 命名为 "SF6-常用角色"
3. 从文件读取：`obs-output/favorite-character.txt`
4. 设置字体：
   - 字体：**Arial** 或 **Consolas**
   - 大小：**28**
   - 颜色：**白色 (#FFFFFF)**
   - 勾选 **轮廓**，颜色：**黑色**，大小：**3**

#### 5. 添加 MR 变化

1. 添加新的 **文本（GDI+）**
2. 命名为 "SF6-MR变化"
3. 从文件读取：`obs-output/mr-change.txt`
4. 设置字体：
   - 字体：**Arial**
   - 大小：**48**
   - 颜色：**绿色 (#00FF88)** （正数）或 **红色 (#FF4466)** （负数）
   - 勾选 **轮廓**，颜色：**黑色**，大小：**4**

#### 6. 添加胜负记录

1. 添加新的 **文本（GDI+）**
2. 命名为 "SF6-胜负"
3. 从文件读取：`obs-output/win-loss.txt`
4. 设置字体：
   - 字体：**Arial**
   - 大小：**36**
   - 颜色：**白色 (#FFFFFF)**
   - 勾选 **轮廓**，颜色：**黑色**，大小：**3**

#### 7. 添加段位图标（自动）

1. 添加 **图像** 源
2. 命名为 "SF6-段位图标"
3. 图像文件：`obs-output/rank.png`
4. **说明**：服务器会在每次数据更新时自动复制对应段位图标到 `rank.png`

#### 8. 添加曲线图（自动生成）

1. 添加 **图像** 源
2. 命名为 "SF6-曲线图"
3. 图像文件：`obs-output/mr-chart.png`
4. 尺寸：1436x180
5. 位置：根据需要调整

**✨ 自动生成：** 每次数据更新时，服务器会自动生成最新的曲线图 PNG！

**特性：**
- ✅ 透明背景
- ✅ 自动更新
- ✅ 无需手动截图
- ✅ OBS 图片源会自动刷新

---

### 方案 2: 使用单个文字源（简单）

1. 添加 **文本（GDI+）**
2. 命名为 "SF6-完整信息"
3. 从文件读取：`obs-output/full-info.txt`
4. 设置字体：
   - 字体：**Microsoft YaHei UI**
   - 大小：**36**
   - 颜色：**白色 (#FFFFFF)**
   - 勾选 **轮廓**，颜色：**黑色**，大小：**3**
   - 勾选 **投影**

---

### 布局建议

#### 左下角布局

```
┌─────────────────────────────────────┐
│  [段位图标]  户型鉴定师 Lv.8        │
│              Master League 5         │
│              MR: 1828  (+50)         │
│              胜负: 5/3               │
└─────────────────────────────────────┘
```

**位置参考**（2560x1440 分辨率）：
- 段位图标：X=60, Y=1200, 大小=256x128
- 玩家名称：X=340, Y=1220
- 段位名称：X=340, Y=1270
- MR 值：X=340, Y=1310
- MR 变化：X=520, Y=1310
- 胜负：X=340, Y=1360

---

### 测试步骤

1. **重启服务器**：
   ```bash
   node server.js
   ```

2. **触发数据更新**：
   - 访问 Capcom API 页面让油猴脚本发送数据

3. **检查输出文件**：
   - 打开 `obs-output` 目录
   - 确认所有 TXT 文件已生成
   - 查看内容是否正确

4. **在 OBS 中查看**：
   - 文字源应该立即显示最新内容
   - 无需刷新，自动更新

---

## ❓ 常见问题

### Q: 文字源不更新？
A: 检查文件路径是否正确，确保 OBS 有读取权限。

### Q: 中文显示乱码？
A: 确保 TXT 文件编码为 UTF-8，并在 OBS 中选择支持中文的字体。

### Q: 如何自动切换段位图标？
A: 已内置自动输出 `obs-output/rank.png`，OBS 图片源固定指向该文件即可自动更新。

### Q: 曲线图怎么办？
A: **已实现自动生成！**
- 服务器会在每次数据更新时自动生成 `mr-chart.png`
- 在 OBS 中添加图片源即可
- 透明背景，自动刷新

### Q: 曲线图不更新？
A:
1. 检查 `obs-output/mr-chart.png` 文件是否存在
2. 查看服务器控制台是否有 `[Chart PNG] ✓ 已生成曲线图` 日志
3. 确保安装了 Chrome 或 Edge 浏览器
4. 如果仍然不更新，手动运行：`node generate-chart-png.js`

### Q: 油猴脚本不发送数据？
A: 确认 Tampermonkey 已启用脚本，并允许访问 `localhost`。

---

## 📦 依赖

- **Node.js** - 运行服务器
- **puppeteer-core** - 自动生成曲线图 PNG
- **chrome-launcher** - 查找系统 Chrome 浏览器
- **Tampermonkey** - 浏览器扩展，运行油猴脚本

---

## 🧹 可选精简

- **images/**：如果不在 OBS 显示段位图标，可删除
- **generate-chart-png.js**：如果不需要自动生成曲线图，可删除相关功能

---

## ✅ 总结

使用 OBS 文字源方案的优势：
- ✅ **零缓存问题** - 实时读取文件
- ✅ **ML 段位正确显示** - rank42 → Master League 5
- ✅ **性能更好** - 资源占用低
- ✅ **更稳定** - 不会出现浏览器兼容性问题
- ✅ **更灵活** - 可以单独控制每个元素

段位图标与曲线图均为自动更新图片源。

---

## 📄 License

MIT
