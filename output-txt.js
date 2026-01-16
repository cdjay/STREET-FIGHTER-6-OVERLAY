/**
 * TXT 文件输出模块
 * 将玩家数据输出为 TXT 文件供 OBS 文字源使用
 */

const fs = require('fs');
const path = require('path');

const OUTPUT_DIR = path.join(__dirname, 'obs-output');

// 确保输出目录存在
if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

/**
 * 获取段位名称
 */
function getRankName(rankNum) {
    const ranks = {
        1: 'Rookie 1', 2: 'Rookie 2', 3: 'Rookie 3', 4: 'Rookie 4',
        5: 'Iron 1', 6: 'Iron 2', 7: 'Iron 3', 8: 'Iron 4',
        9: 'Bronze 1', 10: 'Bronze 2', 11: 'Bronze 3', 12: 'Bronze 4',
        13: 'Silver 1', 14: 'Silver 2', 15: 'Silver 3', 16: 'Silver 4',
        17: 'Gold 1', 18: 'Gold 2', 19: 'Gold 3', 20: 'Gold 4',
        21: 'Platinum 1', 22: 'Platinum 2', 23: 'Platinum 3', 24: 'Platinum 4',
        25: 'Diamond 1', 26: 'Diamond 2', 27: 'Diamond 3', 28: 'Diamond 4',
        29: 'Master 1', 30: 'Master 2', 31: 'Master 3', 32: 'Master 4',
        33: 'Legendary 1', 34: 'Legendary 2', 35: 'Legendary 3', 36: 'Legendary 4', 37: 'Legendary 5',
    };

    // Master League 段位 (38+)
    if (rankNum >= 38) {
        return `Master League ${rankNum - 37}`;
    }

    return ranks[rankNum] || 'Unknown';
}

/**
 * 输出所有 TXT 文件
 */
function outputTxtFiles(data, session) {
    try {
        const playerData = data.data || data;
        const rawRank = playerData.ml ?? playerData.league_rank_number ?? 1;
        const rankNum = Number.isFinite(Number(rawRank)) ? Number(rawRank) : 1;
        const rankName = getRankName(rankNum);

        // 1. 玩家名称
        fs.writeFileSync(
            path.join(OUTPUT_DIR, 'player-name.txt'),
            playerData.fighter_name || playerData.fighterName || 'SF6 Player',
            'utf8'
        );

        // 2. MR 值
        fs.writeFileSync(
            path.join(OUTPUT_DIR, 'mr.txt'),
            String(playerData.mr || 0),
            'utf8'
        );

        // 3. LP 值
        fs.writeFileSync(
            path.join(OUTPUT_DIR, 'lp.txt'),
            String(playerData.lp || 0),
            'utf8'
        );

        // 4. 段位名称
        fs.writeFileSync(
            path.join(OUTPUT_DIR, 'rank-name.txt'),
            rankName,
            'utf8'
        );

        // 5. 段位编号（用于图片源）
        fs.writeFileSync(
            path.join(OUTPUT_DIR, 'rank-number.txt'),
            String(rankNum),
            'utf8'
        );

        // 6. 段位图片路径（相对路径）
        fs.writeFileSync(
            path.join(OUTPUT_DIR, 'rank-image-path.txt'),
            `images/rank${rankNum}_s.png`,
            'utf8'
        );
        // 7. Rank icon (copy to obs-output/rank.png)
        const rankImageName = `rank${rankNum}_s.png`;
        const rankImageSource = path.join(__dirname, 'images', rankImageName);
        const rankImageTarget = path.join(OUTPUT_DIR, 'rank.png');

        if (fs.existsSync(rankImageSource)) {
            fs.copyFileSync(rankImageSource, rankImageTarget);
        } else {
            console.warn(`[TXT Output] Rank icon not found: ${rankImageSource}`);
        }


        // 8. 常用角色（大写）
        const favoriteCharacter = String(playerData.favorite_character_tool_name || '').toUpperCase();
        fs.writeFileSync(
            path.join(OUTPUT_DIR, 'favorite-character.txt'),
            favoriteCharacter,
            'utf8'
        );

        // 如果有会话数据，输出会话相关信息
        if (session && session.isActive) {
            // 9. MR 变化
            const change = (session.currentMr || 0) - (session.startMr || 0);
            const changeText = change > 0 ? `+${change}` : String(change);
            fs.writeFileSync(
                path.join(OUTPUT_DIR, 'mr-change.txt'),
                changeText,
                'utf8'
            );

            // 10. 胜负记录
            const wins = session.matches ? session.matches.filter(m => m.win).length : 0;
            const losses = session.matches ? session.matches.filter(m => !m.win).length : 0;
            fs.writeFileSync(
                path.join(OUTPUT_DIR, 'win-loss.txt'),
                `${wins}/${losses}`,
                'utf8'
            );

            // 11. 起始 MR
            fs.writeFileSync(
                path.join(OUTPUT_DIR, 'start-mr.txt'),
                String(session.startMr || 0),
                'utf8'
            );

            // 12. 最高 MR
            fs.writeFileSync(
                path.join(OUTPUT_DIR, 'peak-mr.txt'),
                String(session.peakMr || 0),
                'utf8'
            );
        } else {
            // 没有会话时输出默认值
            fs.writeFileSync(path.join(OUTPUT_DIR, 'mr-change.txt'), '±0', 'utf8');
            fs.writeFileSync(path.join(OUTPUT_DIR, 'win-loss.txt'), '0/0', 'utf8');
            fs.writeFileSync(path.join(OUTPUT_DIR, 'start-mr.txt'), String(playerData.mr || 0), 'utf8');
            fs.writeFileSync(path.join(OUTPUT_DIR, 'peak-mr.txt'), String(playerData.mr || 0), 'utf8');
        }

        // 13. 完整信息（用于单个文字源显示所有信息）
        const fullInfo = `${playerData.fighter_name || playerData.fighterName}
${rankName}
MR: ${playerData.mr || 0}
LP: ${playerData.lp || 0}`;

        fs.writeFileSync(
            path.join(OUTPUT_DIR, 'full-info.txt'),
            fullInfo,
            'utf8'
        );

        console.log(`[TXT Output] 已更新所有 TXT 文件 - ML: ${rankNum}, MR: ${playerData.mr}`);

    } catch (error) {
        console.error('[TXT Output] 输出失败:', error);
    }
}

module.exports = {
    outputTxtFiles,
    OUTPUT_DIR,
};
