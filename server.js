const http = require('http');
const fs = require('fs');
const path = require('path');
const { outputTxtFiles } = require('./output-txt');
const { generateChartHTML, generateInstructions } = require('./output-chart');
const { generateChartPNG } = require('./generate-chart-png');
const { updateSession, loadSession, endSession, resetSession, getSessionStats } = require('./session-manager');

const PORT = 8080;
const DATA_FILE = path.join(__dirname, 'player_data.json');

// 创建一个简单的 HTTP 服务器
const server = http.createServer((req, res) => {
    // 设置 CORS 头
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    const url = new URL(req.url, `http://${req.headers.host}`);

    // 接收数据（从油猴脚本）
    if (url.pathname === '/receiver' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => {
            body += chunk.toString();
        });
        req.on('end', () => {
            try {
                const data = JSON.parse(body);

                // 保存到文件
                const payload = {
                    timestamp: Date.now(),
                    data: data
                };
                fs.writeFileSync(DATA_FILE, JSON.stringify(payload, null, 2));

                // 保存到 LocalStorage 模拟文件
                const storageData = {
                    'sf6live_player_data': JSON.stringify(payload)
                };
                fs.writeFileSync(path.join(__dirname, 'localStorage.json'), JSON.stringify(storageData, null, 2));

                // 自动更新会话（会自动创建新会话如果不存在）
                const { session, mrChanged, isNewSession } = updateSession(data.mr);

                // 输出 TXT 文件供 OBS 使用
                try {
                    outputTxtFiles(payload, session);

                    // 只有 MR 变化时才重新生成曲线图
                    if ((mrChanged || isNewSession) && session.mrHistory.length > 0) {
                        generateChartHTML(session.mrHistory);

                        // 异步生成 PNG（不阻塞响应）
                        setImmediate(async () => {
                            try {
                                await generateChartPNG();
                            } catch (pngError) {
                                console.error('[Chart PNG] 生成失败:', pngError);
                            }
                        });
                    }
                } catch (txtError) {
                    console.error('TXT output error:', txtError);
                }

                console.log(`[${new Date().toLocaleTimeString()}] 已更新数据: MR=${data.mr}, LP=${data.lp}, ML=${data.ml || data.league_rank_number}`);

                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ status: 'ok' }));
            } catch (e) {
                console.error('Error:', e);
                res.writeHead(500);
                res.end(JSON.stringify({ error: e.message }));
            }
        });
        return;
    }

    // 提供数据给 index.html
    if (url.pathname === '/data.json') {
        try {
            if (fs.existsSync(DATA_FILE)) {
                const data = fs.readFileSync(DATA_FILE, 'utf8');
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(data);
            } else {
                res.writeHead(404);
                res.end(JSON.stringify({ error: 'No data yet' }));
            }
        } catch (e) {
            res.writeHead(500);
            res.end(JSON.stringify({ error: e.message }));
        }
        return;
    }

    // API: 获取会话状态
    if (url.pathname === '/api/session' && req.method === 'GET') {
        try {
            const session = loadSession();
            const stats = getSessionStats(session);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                session,
                stats
            }));
        } catch (e) {
            res.writeHead(500);
            res.end(JSON.stringify({ error: e.message }));
        }
        return;
    }

    // API: 结束会话
    if (url.pathname === '/api/session/end' && req.method === 'POST') {
        try {
            endSession();
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ status: 'ok', message: '会话已结束' }));
        } catch (e) {
            res.writeHead(500);
            res.end(JSON.stringify({ error: e.message }));
        }
        return;
    }

    // API: 重置会话
    if (url.pathname === '/api/session/reset' && req.method === 'POST') {
        try {
            resetSession();
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ status: 'ok', message: '会话已重置' }));
        } catch (e) {
            res.writeHead(500);
            res.end(JSON.stringify({ error: e.message }));
        }
        return;
    }

    // 静态文件服务
    let filePath = url.pathname;
    if (filePath === '/') {
        filePath = '/index.html';
    }

    const ext = path.extname(filePath);
    const contentType = {
        '.html': 'text/html',
        '.css': 'text/css',
        '.js': 'text/javascript',
        '.json': 'application/json',
        '.png': 'image/png',
    }[ext] || 'text/plain';

    const fullPath = path.join(__dirname, filePath);

    if (fs.existsSync(fullPath) && fs.statSync(fullPath).isFile()) {
        const content = fs.readFileSync(fullPath);
        res.writeHead(200, { 'Content-Type': contentType });
        res.end(content);
    } else {
        res.writeHead(404);
        res.end('File not found');
    }
});

server.listen(PORT, () => {
    console.log(`
  SF6 Live Overlay 服务器已启动                         
═════════════════════════════════════════
    `);

    // 生成曲线图说明文件
    try {
        generateInstructions();
        console.log('[Info] 已生成曲线图说明文件');
    } catch (e) {
        console.error('[Error] 生成说明文件失败:', e);
    }

    // 服务器启动时，如果存在会话数据，自动生成图表
    setTimeout(async () => {
        try {
            const session = loadSession();
            if (session && session.mrHistory && session.mrHistory.length > 0) {
                console.log('[Init] 检测到会话数据，正在生成图表...');
                generateChartHTML(session.mrHistory);

                // 异步生成 PNG
                try {
                    await generateChartPNG();
                    console.log('[Init] ✓ 曲线图已生成');
                } catch (pngError) {
                    console.error('[Init] PNG 生成失败:', pngError);
                }
            } else {
                console.log('[Init] 无会话数据，等待首次数据更新...');
            }
        } catch (e) {
            console.error('[Init] 初始化图表失败:', e);
        }
    }, 1000);
});
