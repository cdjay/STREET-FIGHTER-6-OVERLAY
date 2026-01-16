/**
 * 曲线图 PNG 生成模块（简化版）
 * 使用 HTML Canvas API 生成曲线图，然后通过浏览器截图保存
 */

const fs = require('fs');
const path = require('path');

const OUTPUT_DIR = path.join(__dirname, 'obs-output');
const CHART_HTML = path.join(__dirname, 'chart-generator.html');

/**
 * 生成曲线图 HTML 文件
 */
function generateChartHTML(mrHistory) {
    if (!mrHistory || mrHistory.length === 0) {
        console.log('[Chart PNG] 没有历史数据，跳过生成');
        return;
    }

    // 限制数据点数量
    const maxPoints = 30;
    const data = mrHistory.slice(-maxPoints);

    const html = `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body {
            margin: 0;
            padding: 0;
            background: transparent;
        }
        canvas {
            display: block;
        }
    </style>
</head>
<body>
    <canvas id="chart" width="1436" height="180"></canvas>
    <script>
        const canvas = document.getElementById('chart');
        const ctx = canvas.getContext('2d');
        const data = ${JSON.stringify(data)};

        // 配置
        const config = {
            lineColor: '#00B3FF',
            fillColor: 'rgba(0, 179, 255, 0.15)',
            peakColor: '#00FF88',
            winColor: '#00FF88',
            lossColor: '#FF4466',
            neutralColor: '#888888',
            textColor: 'rgba(255, 255, 255, 0.5)',
            gridColor: 'rgba(255, 255, 255, 0.08)',
            padding: { top: 10, right: 80, bottom: 35, left: 20 },
            pointRadius: 8,
            lineWidth: 2.5,
        };

        // 计算数据范围
        const mrValues = data.map(d => d.mr);
        let minMr = Math.min(...mrValues);
        let maxMr = Math.max(...mrValues);

        // 动态计算 Y 轴 padding：MR 变化越小，padding 越小
        const mrRange = maxMr - minMr;
        const padding = Math.max(10, Math.floor(mrRange * 0.25));

        minMr = Math.floor((minMr - padding) / 10) * 10;
        maxMr = Math.ceil((maxMr + padding) / 10) * 10;

        const chartWidth = canvas.width - config.padding.left - config.padding.right;
        const chartHeight = canvas.height - config.padding.top - config.padding.bottom;

        // 转换函数
        function mrToY(mr) {
            const range = maxMr - minMr || 1;
            const normalized = (mr - minMr) / range;
            return config.padding.top + chartHeight * (1 - normalized);
        }

        function indexToX(index) {
            if (data.length <= 1) return config.padding.left + chartWidth / 2;
            const step = chartWidth / (data.length - 1);
            return config.padding.left + step * index;
        }

        // 绘制网格
        ctx.strokeStyle = config.gridColor;
        ctx.lineWidth = 1;
        for (let i = 0; i <= 5; i++) {
            const y = config.padding.top + (chartHeight / 5) * i;
            ctx.beginPath();
            ctx.moveTo(config.padding.left, y);
            ctx.lineTo(canvas.width - config.padding.right, y);
            ctx.stroke();
        }

        // 计算点位置
        const points = data.map((d, i) => ({
            x: indexToX(i),
            y: mrToY(d.mr),
            mr: d.mr,
            change: d.change || 0,
            win: d.win
        }));

        // 绘制填充区域
        if (points.length >= 2) {
            ctx.beginPath();
            ctx.moveTo(points[0].x, canvas.height - config.padding.bottom);
            for (const point of points) {
                ctx.lineTo(point.x, point.y);
            }
            ctx.lineTo(points[points.length - 1].x, canvas.height - config.padding.bottom);
            ctx.closePath();

            const gradient = ctx.createLinearGradient(0, config.padding.top, 0, canvas.height - config.padding.bottom);
            gradient.addColorStop(0, config.fillColor);
            gradient.addColorStop(1, 'rgba(0, 179, 255, 0)');
            ctx.fillStyle = gradient;
            ctx.fill();
        }

        // 绘制线条
        if (points.length >= 2) {
            ctx.strokeStyle = config.lineColor;
            ctx.lineWidth = config.lineWidth;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.beginPath();
            ctx.moveTo(points[0].x, points[0].y);
            for (let i = 1; i < points.length; i++) {
                const xc = (points[i].x + points[i - 1].x) / 2;
                const yc = (points[i].y + points[i - 1].y) / 2;
                ctx.quadraticCurveTo(points[i - 1].x, points[i - 1].y, xc, yc);
            }
            ctx.lineTo(points[points.length - 1].x, points[points.length - 1].y);
            ctx.stroke();
        }

        // 绘制数据点和变化值
        points.forEach((point, index) => {
            // 根据胜负决定颜色
            let pointColor = config.neutralColor;
            if (point.win === true) {
                pointColor = config.winColor;
            } else if (point.win === false) {
                pointColor = config.lossColor;
            }

            // 绘制数据点
            ctx.beginPath();
            ctx.arc(point.x, point.y, config.pointRadius, 0, Math.PI * 2);
            ctx.fillStyle = pointColor;
            ctx.fill();

            // 终点高亮
            if (index === points.length - 1) {
                ctx.beginPath();
                ctx.arc(point.x, point.y, config.pointRadius + 2, 0, Math.PI * 2);
                ctx.strokeStyle = '#fff';
                ctx.lineWidth = 2;
                ctx.stroke();
            }

            // 绘制变化值（第一个点不显示，因为没有变化）
            if (index > 0 && point.change !== 0) {
                const changeText = (point.change > 0 ? '+' : '') + point.change;
                ctx.font = 'bold 30px "Segoe UI", sans-serif';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'bottom';

                // 根据正负选择颜色
                ctx.fillStyle = point.change > 0 ? config.winColor : config.lossColor;
                ctx.fillText(changeText, point.x, point.y - 15);
            }
        });

        // 标签已移除（请使用 OBS 中的 start-mr.txt 文件）

        console.log('Chart generated');
    </script>
</body>
</html>`;

    fs.writeFileSync(CHART_HTML, html, 'utf8');
    console.log('[Chart PNG] 已生成曲线图 HTML:', CHART_HTML);
}

/**
 * 生成说明文件
 */
function generateInstructions() {
    const instructions = `# 曲线图 PNG 生成说明

## 方法 1: 使用浏览器截图（推荐）

1. 打开 chart-generator.html 文件
2. 按 F12 打开开发者工具
3. 按 Ctrl+Shift+P，输入 "screenshot"
4. 选择 "Capture node screenshot"
5. 点击 canvas 元素
6. 保存为 obs-output/mr-chart.png

## 方法 2: 使用在线工具

访问 http://localhost:8080/chart-generator.html
使用浏览器扩展或截图工具保存为 PNG

## 方法 3: 使用 Puppeteer（需要安装）

\`\`\`bash
npm install puppeteer
node generate-chart-png.js
\`\`\`

## OBS 设置

1. 添加 **图像** 源
2. 命名为 "SF6-曲线图"
3. 图像文件：obs-output/mr-chart.png
4. 位置：根据需要调整

注意：每次数据更新后需要重新生成 PNG 文件。
`;

    fs.writeFileSync(
        path.join(OUTPUT_DIR, 'chart-instructions.txt'),
        instructions,
        'utf8'
    );
}

module.exports = {
    generateChartHTML,
    generateInstructions,
};
