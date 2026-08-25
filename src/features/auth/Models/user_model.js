export const updateUserPassword = async (userId, newHashedPassword) => {
  await pool.execute(
    "UPDATE users SET password = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
    [newHashedPassword, userId],
  );
};

