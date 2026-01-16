/**
 * 自动生成曲线图 PNG
 * 使用 Puppeteer 自动截图
 */

const puppeteer = require('puppeteer-core');
const chromeLauncher = require('chrome-launcher');
const path = require('path');
const fs = require('fs');

const OUTPUT_PATH = path.join(__dirname, 'obs-output', 'mr-chart.png');
const CHART_HTML = path.join(__dirname, 'chart-generator.html');

/**
 * 查找 Chrome 可执行文件路径
 */
function findChrome() {
    const possiblePaths = [
        'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
        'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
        process.env.LOCALAPPDATA + '\\Google\\Chrome\\Application\\chrome.exe',
        'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
        'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    ];

    for (const chromePath of possiblePaths) {
        if (fs.existsSync(chromePath)) {
            return chromePath;
        }
    }

    return null;
}

/**
 * 生成曲线图 PNG
 */
async function generateChartPNG() {
    // 检查 HTML 文件是否存在
    if (!fs.existsSync(CHART_HTML)) {
        console.log('[Chart PNG] chart-generator.html 不存在，跳过生成');
        return false;
    }

    const chromePath = findChrome();
    if (!chromePath) {
        console.error('[Chart PNG] 未找到 Chrome 或 Edge 浏览器');
        return false;
    }

    let browser = null;
    try {
        console.log('[Chart PNG] 启动浏览器...');
        browser = await puppeteer.launch({
            executablePath: chromePath,
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox'],
        });

        const page = await browser.newPage();

        // 设置视口大小
        await page.setViewport({
            width: 1436,
            height: 180,
            deviceScaleFactor: 1,
        });

        // 加载 HTML 文件
        const fileUrl = 'file://' + CHART_HTML.replace(/\\/g, '/');
        console.log('[Chart PNG] 加载页面:', fileUrl);
        await page.goto(fileUrl, { waitUntil: 'networkidle0' });

        // 等待 canvas 渲染完成
        await page.waitForSelector('#chart');
        await page.evaluate(() => new Promise(resolve => setTimeout(resolve, 500)));

        // 截图
        const element = await page.$('#chart');
        if (element) {
            await element.screenshot({
                path: OUTPUT_PATH,
                omitBackground: true, // 透明背景
            });
            console.log('[Chart PNG] ✓ 已生成曲线图:', OUTPUT_PATH);
            return true;
        } else {
            console.error('[Chart PNG] 未找到 canvas 元素');
            return false;
        }

    } catch (error) {
        console.error('[Chart PNG] 生成失败:', error.message);
        return false;
    } finally {
        if (browser) {
            await browser.close();
        }
    }
}

module.exports = {
    generateChartPNG,
};

// 如果直接运行此脚本
if (require.main === module) {
    generateChartPNG().then(success => {
        process.exit(success ? 0 : 1);
    });
}
