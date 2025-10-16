import pool from './pool.js';

export const leaguesRepo = {
    async upsert({ id, name, slug, image_url }) {
        await pool.query(
            `INSERT INTO leagues (id, name, slug, image_url)
       VALUES ($1,$2,$3,$4)
       ON CONFLICT (id) DO UPDATE SET
         name=EXCLUDED.name,
         slug=EXCLUDED.slug,
         image_url=EXCLUDED.image_url`,
            [id, name ?? null, slug ?? null, image_url ?? null]
        );
    },

    async bulkUpsert(list) {
        for (const l of list) {
            await this.upsert({ id: l.id, name: l.name, slug: l.slug, image_url: l.image_url });
        }
    },

    async listAll() {
        const { rows } = await pool.query(`SELECT id, name, slug FROM leagues ORDER BY name ASC`);
        return rows;
    },

    async listPaged(offset = 0, limit = 25) {
        const { rows } = await pool.query(
            `SELECT id, name, slug FROM leagues ORDER BY name ASC OFFSET $1 LIMIT $2`, [offset, limit]
        );
        return rows;
    },

    async searchByName(q, limit = 25) {
        const { rows } = await pool.query(
            `SELECT id, name, slug FROM leagues WHERE name ILIKE $1 OR slug ILIKE $1
       ORDER BY name ASC LIMIT $2`, [`%${q}%`, limit]
        );
        return rows;
    },

    async byIds(ids = []) {
        if (!ids.length) return [];
        const { rows } = await pool.query(
            `SELECT id, name, slug FROM leagues WHERE id = ANY($1) ORDER BY name ASC`, [ids]
        );
        return rows;
    }
};
