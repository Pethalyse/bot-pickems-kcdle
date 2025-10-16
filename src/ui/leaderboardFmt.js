const rankEmoji = (i) => {
    if (i === 0) return '🥇';
    if (i === 1) return '🥈';
    if (i === 2) return '🥉';
    const nums = ['0️⃣','1️⃣','2️⃣','3️⃣','4️⃣','5️⃣','6️⃣','7️⃣','8️⃣','9️⃣','🔟'];
    const n = i+1;
    return n <= 10 ? nums[n] : `#${n}`;
};

export function formatLbLines(rows) {
    return rows.map((r, i) => {
        const pct = r.total > 0 ? Math.round((r.points / r.total) * 100) : 0;
        const name = r.display_name ? `**${r.display_name}**` : `<@${r.user_id}>`;
        return `${rankEmoji(i)} ${name}\n→ ${pct}% — ${r.points}/${r.total}`;
    }).join('\n\n');
}
