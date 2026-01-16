/**
 * SF6 Live Overlay - 简化版配置页面脚本
 */

document.addEventListener('DOMContentLoaded', () => {
    // DOM 元素
    const userIdInput = document.getElementById('userId');
    const startFetchBtn = document.getElementById('startFetchBtn');
    const endSessionBtn = document.getElementById('endSessionBtn');
    const clearBtn = document.getElementById('clearBtn');
    const statusDiv = document.getElementById('status');
    const sessionCard = document.getElementById('sessionCard');
    const sessionUser = document.getElementById('sessionUser');
    const historyList = document.getElementById('historyList');

    // 会话显示元素
    const sessionStartMr = document.getElementById('sessionStartMr');
    const sessionCurrentMr = document.getElementById('sessionCurrentMr');
    const sessionChange = document.getElementById('sessionChange');

    const HISTORY_KEY = 'sf6live_userid_history';
    const CURRENT_USER_KEY = 'sf6live_userid_current';

    // 显示状态消息
    function showStatus(message, type = 'success') {
        statusDiv.textContent = message;
        statusDiv.className = `status show ${type}`;

        setTimeout(() => {
            statusDiv.classList.remove('show');
        }, 3000);
    }

    function normalizeHistory(raw) {
        if (!Array.isArray(raw)) {
            return [];
        }

        return raw
            .map(entry => {
                if (typeof entry === 'string') {
                    return { userId: entry, fighterName: '' };
                }
                if (entry && typeof entry === 'object') {
                    const userId = entry.userId || entry.user_id || entry.sid || entry.id || '';
                    const fighterName = entry.fighterName || entry.fighter_name || entry.name || '';
                    return { userId: String(userId), fighterName: String(fighterName) };
                }
                return null;
            })
            .filter(entry => entry && entry.userId);
    }

    function loadHistory() {
        try {
            const raw = localStorage.getItem(HISTORY_KEY);
            const parsed = raw ? JSON.parse(raw) : [];
            return normalizeHistory(parsed);
        } catch (error) {
            return [];
        }
    }

    function saveHistory(list) {
        localStorage.setItem(HISTORY_KEY, JSON.stringify(list));
    }

    function updateHistory(userId, fighterName = '') {
        const history = loadHistory();
        const normalizedId = String(userId);
        const next = [{ userId: normalizedId, fighterName }];

        history.forEach(entry => {
            if (entry.userId !== normalizedId) {
                next.push(entry);
            } else if (!fighterName && entry.fighterName) {
                next[0].fighterName = entry.fighterName;
            }
        });

        saveHistory(next);
        return next;
    }

    function loadCurrentUser() {
        const raw = localStorage.getItem(CURRENT_USER_KEY);
        if (!raw) {
            return { userId: '', fighterName: '' };
        }
        try {
            const parsed = JSON.parse(raw);
            if (parsed && typeof parsed === 'object') {
                return {
                    userId: String(parsed.userId || parsed.user_id || parsed.sid || ''),
                    fighterName: String(parsed.fighterName || parsed.fighter_name || parsed.name || '')
                };
            }
            return { userId: String(raw), fighterName: '' };
        } catch (error) {
            return { userId: String(raw), fighterName: '' };
        }
    }

    function formatUserLabel(info) {
        if (info.fighterName && info.userId) {
            return `(${info.fighterName} ${info.userId})`;
        }
        if (info.fighterName) {
            return `(${info.fighterName})`;
        }
        if (info.userId) {
            return `(${info.userId})`;
        }
        return '';
    }

    function renderCurrentUser() {
        if (!sessionUser) {
            return;
        }
        const current = loadCurrentUser();
        sessionUser.textContent = formatUserLabel(current);
    }

    function setCurrentUser(info, updateList = false) {
        if (!info) {
            return;
        }

        const current = loadCurrentUser();
        const next = {
            userId: info.userId ? String(info.userId) : current.userId,
            fighterName: info.fighterName ? String(info.fighterName) : current.fighterName
        };

        if (!next.userId && !next.fighterName) {
            return;
        }

        localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(next));

        if (userIdInput && next.userId && document.activeElement !== userIdInput) {
            userIdInput.value = next.userId;
        }

        if (updateList && next.userId) {
            const updated = updateHistory(next.userId, next.fighterName);
            renderHistory(updated);
        }

        renderCurrentUser();
    }

    function openUserPage(userId) {
        const url = `https://www.streetfighter.com/6/buckler/api/en/card/${encodeURIComponent(userId)}`;
        window.open(url, '_blank', 'noopener');
    }

    function renderHistory(list) {
        if (!historyList) {
            return;
        }
        historyList.innerHTML = '';

        if (!list.length) {
            const empty = document.createElement('div');
            empty.className = 'history-empty';
            empty.textContent = '暂无历史记录';
            historyList.appendChild(empty);
            return;
        }

        list.forEach(entry => {
            const item = document.createElement('button');
            item.type = 'button';
            item.className = 'history-item';
            item.textContent = formatUserLabel(entry);
            item.addEventListener('click', () => {
                setCurrentUser(entry, true);
                openUserPage(entry.userId);
            });
            historyList.appendChild(item);
        });
    }

    function resolveUserInfo(payload) {
        if (!payload) {
            return null;
        }
        const data = payload.data || payload;
        const userId = data.sid || data.user_id || data.userId || data.capcom_user_id || data.capcomUserId || '';
        const fighterName = data.fighter_name || data.fighterName || '';
        if (!userId && !fighterName) {
            return null;
        }
        return { userId, fighterName };
    }

    async function fetchLatestPlayerData() {
        try {
            const response = await fetch('/data.json', { cache: 'no-store' });
            if (!response.ok) {
                return;
            }
            const payload = await response.json();
            const info = resolveUserInfo(payload);
            if (info) {
                setCurrentUser(info, true);
            }
        } catch (error) {
            console.error('Failed to fetch player data:', error);
        }
    }

    // 获取会话状态
    async function fetchSessionStatus() {
        try {
            const response = await fetch('/api/session');
            if (response.ok) {
                const data = await response.json();
                if (data.session && data.session.isActive) {
                    updateSessionDisplay(data.session, data.stats);
                } else {
                    sessionCard.style.display = 'none';
                }
            }
        } catch (error) {
            console.error('Failed to fetch session status:', error);
        }
    }

    // 更新会话显示
    function updateSessionDisplay(session, stats) {
        sessionCard.style.display = 'block';
        sessionStartMr.textContent = session.startMr || '-';
        sessionCurrentMr.textContent = session.currentMr || '-';

        const change = (session.currentMr || 0) - (session.startMr || 0);
        sessionChange.textContent = change > 0 ? `+${change}` : change;
        sessionChange.style.color = change > 0 ? '#00FF88' : (change < 0 ? '#FF4466' : '#fff');
    }

    // 打开卡片页开始获取数据
    function startFetchData() {
        const userId = userIdInput.value.trim();
        if (!userId) {
            showStatus('请输入 Capcom User ID', 'error');
            return;
        }

        setCurrentUser({ userId }, true);
        openUserPage(userId);
        showStatus('已打开卡片页，油猴将自动开始获取数据', 'success');
    }

    // 结束会话（保留记录）
    async function endSession() {
        if (!confirm('确定要结束当前会话并保留记录吗？')) {
            return;
        }

        try {
            const response = await fetch('/api/session/end', {
                method: 'POST'
            });

            if (response.ok) {
                showStatus('会话已结束，记录已保留', 'success');
                sessionCard.style.display = 'none';
            } else {
                showStatus('操作失败', 'error');
            }
        } catch (error) {
            showStatus('网络错误', 'error');
        }
    }

    // 清除所有数据
    async function clearAllData() {
        if (!confirm('确定要清除历史记录吗？这将删除会话记录并重新开始！')) {
            return;
        }

        try {
            const response = await fetch('/api/session/reset', {
                method: 'POST'
            });

            if (response.ok) {
                showStatus('历史记录已清除，下次更新时将创建新会话', 'success');
                sessionCard.style.display = 'none';
            } else {
                showStatus('操作失败', 'error');
            }
        } catch (error) {
            showStatus('网络错误', 'error');
        }
    }

    // 按钮事件
    startFetchBtn.addEventListener('click', startFetchData);
    endSessionBtn.addEventListener('click', endSession);
    clearBtn.addEventListener('click', clearAllData);

    // 初始化
    fetchSessionStatus();
    fetchLatestPlayerData();
    renderHistory(loadHistory());
    renderCurrentUser();

    // 定期刷新会话状态（每5秒）
    setInterval(() => {
        fetchSessionStatus();
        fetchLatestPlayerData();
    }, 5000);

    console.log('[Config] 简化版配置页面已加载');
});
