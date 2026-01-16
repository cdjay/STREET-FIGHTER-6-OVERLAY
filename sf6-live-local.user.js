// ==UserScript==
// @name         SF6 Live - 数据同步到本地
// @namespace    http://tampermonkey.net/
// @version      2.3
// @description  将 SF6 Buckler 数据发送到本地服务器，自动处理 502 错误
// @author       You
// @match        https://www.streetfighter.com/6/buckler/api/*/card/*
// @match        https://www.streetfighter.com/6/buckler/api/en/card/*
// @connect      localhost
// @connect      127.0.0.1
// @grant        GM_xmlhttpRequest
// @run-at       document-end
// ==/UserScript==

(function() {
    'use strict';

    const LOCAL_SERVER = 'http://localhost:8080';
    const REFRESH_INTERVAL = 60; // 秒
    const ERROR_RETRY_INTERVAL = 3; // 错误时快速重试间隔（秒）

    let currentMr = null;
    let reloadTimer = null;

    function forceReload() {
        const base = `${window.location.origin}${window.location.pathname}`;
        window.location.href = `${base}?t=${Date.now()}`;
    }

    function scheduleReload(delaySeconds, reason) {
        if (reloadTimer) {
            clearTimeout(reloadTimer);
        }

        if (reason) {
            console.log(`[SF6 Live] ${reason}，${delaySeconds}秒后刷新...`);
        }

        reloadTimer = setTimeout(forceReload, delaySeconds * 1000);
    }

    /**
     * 检测页面是否为错误页面
     */
    function isErrorPage() {
        const bodyText = document.body.innerText.trim();

        if (!bodyText) {
            console.error('[SF6 Live] 页面内容为空');
            return true;
        }

        // 如果能正常解析 JSON，说明不是错误页面
        try {
            JSON.parse(bodyText);
            return false;
        } catch (e) {
            // 非 JSON 页面，继续判断错误类型
        }

        const lowerText = bodyText.toLowerCase();
        if (lowerText.includes('bad gateway')) {
            console.error('[SF6 Live] 检测到 502 错误');
            return true;
        }

        if (lowerText.includes('service unavailable')) {
            console.error('[SF6 Live] 检测到 503 错误');
            return true;
        }

        if (lowerText.includes('gateway timeout')) {
            console.error('[SF6 Live] 检测到 504 超时');
            return true;
        }

        if (lowerText.startsWith('<!doctype html') || lowerText.startsWith('<html')) {
            console.error('[SF6 Live] 检测到 HTML 错误页面');
            return true;
        }

        return false;
    }

    /**
     * 获取页面数据
     */
    function getPageData() {
        try {
            const text = document.body.innerText.trim();
            if (!text) return null;

            // 尝试解析 JSON
            const data = JSON.parse(text);

            // 验证必要字段
            const hasName = typeof data.fighter_name === 'string' && data.fighter_name.trim().length > 0;
            const hasRank = data.lp !== undefined || data.mr !== undefined || data.league_rank_number !== undefined || data.ml !== undefined;

            if (!hasName && !hasRank) {
                console.error('[SF6 Live] 数据不完整:', data);
                return null;
            }

            return data;
        } catch (e) {
            console.error('[SF6 Live] 解析失败:', e);
            console.error('[SF6 Live] 页面内容:', document.body.innerText.substring(0, 200));
            return null;
        }
    }

    /**
     * 发送数据到本地服务器
     */
    function sendToLocal(data) {
        const url = `${LOCAL_SERVER}/receiver`;

        // 使用 GM_xmlhttpRequest 绕过 CORS
        GM_xmlhttpRequest({
            method: 'POST',
            url: url,
            headers: {
                'Content-Type': 'application/json',
            },
            data: JSON.stringify(data),
            onload: (response) => {
                console.log(`[SF6 Live] ✓ 数据已发送! MR: ${data.mr}`);
            },
            onerror: (err) => {
                console.error('[SF6 Live] ✗ 发送失败，请确保本地服务器正在运行:');
                console.error('[SF6 Live] 在 sf6live 目录运行: node server.js');
            }
        });
    }

    /**
     * 主处理
     */
    function process() {
        // 首先检查是否为错误页面
        if (isErrorPage()) {
            scheduleReload(ERROR_RETRY_INTERVAL, '检测到错误页面');
            return;
        }

        // 获取正常数据
        const apiData = getPageData();
        if (!apiData) {
            scheduleReload(ERROR_RETRY_INTERVAL, '未找到有效数据，快速重试');
            return;
        }

        const userIdFromUrl = window.location.pathname.split('/').filter(Boolean).pop();

        const playerData = {
            fighter_name: apiData.fighter_name,
            favorite_character_tool_name: apiData.favorite_character_tool_name,
            sid: apiData.sid || userIdFromUrl,
            user_id: apiData.sid || userIdFromUrl,
            lp: apiData.lp,
            mr: apiData.mr,
            ml: apiData.ml,
            league_rank_number: apiData.league_rank_number,
        };

        // 检查 MR 变化
        if (currentMr !== null && currentMr !== playerData.mr) {
            const change = playerData.mr - currentMr;
            console.log(`[SF6 Live] MR 变化: ${change > 0 ? '+' : ''}${change}`);
        }

        currentMr = playerData.mr;
        sendToLocal(playerData);

        // 正常刷新
        scheduleReload(REFRESH_INTERVAL, '正常刷新');
    }

    // 延迟执行，确保页面完全加载
    setTimeout(() => {
        console.log('[SF6 Live] 当前 URL:', window.location.href);
        console.log('[SF6 Live] 路径匹配检查:', window.location.href.includes('/api/') && window.location.href.includes('/card/'));
        if (window.location.href.includes('/api/') && window.location.href.includes('/card/')) {
            process();
        } else {
            console.warn('[SF6 Live] URL 不匹配，脚本未执行');
        }
    }, 1000);

    console.log('[SF6 Live] 脚本已加载 v2.3 - 支持 502 错误自动重试');
})();
