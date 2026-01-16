/**
 * 会话管理模块
 * 负责追踪 MR 历史、胜负记录，并自动创建/更新会话
 */

const fs = require('fs');
const path = require('path');

const SESSION_FILE = path.join(__dirname, 'session.json');

/**
 * 创建新会话
 */
function createSession(startMr) {
    const session = {
        isActive: true,
        startMr: startMr,
        currentMr: startMr,
        peakMr: startMr,
        lastMr: startMr,
        startTime: Date.now(),
        lastUpdate: Date.now(),
        matches: [],
        mrHistory: [{
            mr: startMr,
            timestamp: Date.now()
        }]
    };
    saveSession(session);
    console.log(`[Session] 创建新会话 - 起始 MR: ${startMr}`);
    return session;
}

/**
 * 加载会话
 */
function loadSession() {
    if (!fs.existsSync(SESSION_FILE)) {
        return null;
    }
    try {
        const data = fs.readFileSync(SESSION_FILE, 'utf8');
        return JSON.parse(data);
    } catch (e) {
        console.error('[Session] 加载失败:', e);
        return null;
    }
}

/**
 * 保存会话
 */
function saveSession(session) {
    fs.writeFileSync(SESSION_FILE, JSON.stringify(session, null, 2));
}

/**
 * 结束会话
 */
function endSession() {
    if (fs.existsSync(SESSION_FILE)) {
        const session = loadSession();
        if (session) {
            session.isActive = false;
            session.endTime = Date.now();
            saveSession(session);
            console.log(`[Session] 会话已结束 - 总场次: ${session.matches.length}`);
        }
    }
}

/**
 * 更新会话数据
 * 根据 MR 变化推断胜负
 * @returns {Object} 返回 { session, mrChanged, isNewSession } 标志
 */
function updateSession(currentMr) {
    let session = loadSession();

    // 如果没有会话，创建一个
    if (!session || !session.isActive) {
        session = createSession(currentMr);
        return { session, mrChanged: false, isNewSession: true }; // 新会话不算变化
    }

    const lastMr = session.lastMr || currentMr;
    const mrDiff = currentMr - lastMr;
    let mrChanged = false;

    // MR 发生变化，推断为新的一局
    if (mrDiff !== 0) {
        const win = mrDiff > 0;
        const match = {
            mr: currentMr,
            previousMr: lastMr,
            change: mrDiff,
            win: win,
            timestamp: Date.now()
        };

        session.matches.push(match);
        mrChanged = true;
        console.log(`[Session] 记录对局: ${win ? 'WIN' : 'LOSS'} (${mrDiff > 0 ? '+' : ''}${mrDiff})`);
    }

    // 只有 MR 变化或历史记录为空时才更新历史
    if (mrChanged || session.mrHistory.length === 0) {
        // 更新当前 MR
        session.currentMr = currentMr;
        session.lastMr = currentMr;
        session.lastUpdate = Date.now();

        // 更新最高 MR
        if (currentMr > session.peakMr) {
            session.peakMr = currentMr;
        }

        // 添加到历史记录（包含胜负信息和变化值）
        session.mrHistory.push({
            mr: currentMr,
            change: mrChanged ? mrDiff : 0,
            win: mrChanged ? mrDiff > 0 : null,
            timestamp: Date.now()
        });

        // 限制历史记录数量（最多保留最近30条）
        if (session.mrHistory.length > 30) {
            session.mrHistory = session.mrHistory.slice(-30);
        }

        saveSession(session);
    } else {
        // MR 没有变化，只更新时间戳
        session.lastUpdate = Date.now();
        saveSession(session);
    }

    return { session, mrChanged, isNewSession: false };
}

/**
 * 重置会话
 */
function resetSession() {
    if (fs.existsSync(SESSION_FILE)) {
        fs.unlinkSync(SESSION_FILE);
        console.log('[Session] 会话已清除');
    }
}

/**
 * 获取会话统计
 */
function getSessionStats(session) {
    if (!session) {
        return {
            wins: 0,
            losses: 0,
            total: 0,
            winRate: 0
        };
    }

    const wins = session.matches.filter(m => m.win).length;
    const losses = session.matches.filter(m => !m.win).length;
    const total = wins + losses;

    return {
        wins,
        losses,
        total,
        winRate: total > 0 ? ((wins / total) * 100).toFixed(1) : 0
    };
}

module.exports = {
    createSession,
    loadSession,
    saveSession,
    endSession,
    updateSession,
    resetSession,
    getSessionStats,
    SESSION_FILE
};
