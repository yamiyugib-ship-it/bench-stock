export async function initializeDatabase(database) {
  await database.query(`
    CREATE TABLE IF NOT EXISTS supplies (
      id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      name text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 80),
      name_key text GENERATED ALWAYS AS (lower(name)) STORED UNIQUE,
      quantity integer NOT NULL CHECK (quantity BETWEEN 0 AND 999999)
    )
  `);
}

export function createInventoryRepository(database) {
  return {
    async list() {
      const { rows } = await database.query('SELECT id, name, quantity FROM supplies ORDER BY name_key');
      return rows;
    },

    async create(name, quantity) {
      const { rows } = await database.query(`
        INSERT INTO supplies (name, quantity) VALUES ($1, $2)
        ON CONFLICT (name_key) DO NOTHING
        RETURNING id, name, quantity
      `, [name, quantity]);
      return rows[0];
    },

    async adjust(id, change, maximumQuantity) {
      const { rows } = await database.query(`
        UPDATE supplies SET quantity = quantity + $2::integer
        WHERE id = $1 AND quantity + $2::integer BETWEEN 0 AND $3
        RETURNING id, name, quantity
      `, [id, change, maximumQuantity]);
      return rows[0];
    },

    async exists(id) {
      const { rows } = await database.query('SELECT 1 FROM supplies WHERE id = $1', [id]);
      return rows.length > 0;
    },
  };
}
