const R = require('ramda');

const decodeUser = user => ({
  ...R.omit(R.prop('meta'), user),
  meta: (JSON.parse(user.meta)),
});

module.exports = dbP => ({
  async findById(id) {
    const db = await dbP;
    const [[user]] = await db.query('SELECT * FROM users WHERE id=? LIMIT 1;', [id]);
    if (!user) {
      return null;
    }
    return decodeUser(user);
  },
  async getAll() {
    const db = await dbP;
    const [users] = await db.query('SELECT * FROM users', []);
    return users.map(decodeUser);
  },
  async getAccess(id) {
    const db = await dbP;
    const [[user]] = await db.query('SELECT access FROM users WHERE id=? LIMIT 1;', [id]);
    if (!user) {
      return null;
    }
    return user.access;
  },
  async store({ id, ...rest }) {
    const db = await dbP;
    db.query('INSERT INTO users(id, access, meta) VALUES(?,?,?)', [id, 'NONE', JSON.stringify(rest)]);
    return this.findById(id);
  },
  async updateMeta({
    id, meta, access, ...rest
  }) {
    const db = await dbP;
    await db.query(
      'UPDATE users SET meta=? WHERE id=?',
      [JSON.stringify({ ...meta, ...rest }), id],
    );
    return this.findById(id);
  },
  async delete({ id }) {
    const db = await dbP;
    return db.query('DELETE FROM users WHERE id=:id', { id });
  },
  async setAccess({ id, access }) {
    const db = await dbP;
    await db.query('UPDATE users SET access=? WHERE id=?', [access, id]);
    return this.findById(id);
  },
  async migrate() {
    const db = await dbP;
    return db.query("CREATE TABLE IF NOT EXISTS `users` ( `id` VARCHAR(32) NOT NULL , `access` ENUM('NONE','USER','ADMIN','') NOT NULL , `meta` TEXT NOT NULL , PRIMARY KEY (`id`)) ENGINE = InnoDB;");
  },

  async drop() {
    const db = await dbP;
    return db.query('DROP TABLE IF EXISTS `users`;');
  },
});

