export const updateUserPassword = async (userId, newHashedPassword) => {
  await pool.query(
    "UPDATE users SET password = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2",
    [newHashedPassword, userId],
  );
};

