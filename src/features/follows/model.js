import pool from "../../core/db/connection.js";


export const followUser = async (followerId, followingUuid) => {
  // Lookup target user by UUID
  const [targetUsers] = await pool.execute(
    "SELECT id FROM users WHERE uuid = ?",
    [followingUuid],
  );
  if (targetUsers.length === 0)
    return { error: "User not found" };
  const followingId = targetUsers[0].id;
  
  if (followerId === followingId)
    return { error: "You cannot follow yourself" };
  const [existing] = await pool.execute(
    "SELECT 1 FROM follows WHERE follower_id = ? AND following_id = ?",
    [followerId, followingId],
  );
  if (existing.length > 0) {
    await pool.execute(
      "DELETE FROM follows WHERE follower_id = ? AND following_id = ?",
      [followerId, followingId],
    );
    return { following: false };
  }
  await pool.execute(
    "INSERT INTO follows (follower_id, following_id) VALUES (?, ?)",
    [followerId, followingId],
  );
  return { following: true };
};
export const unfollowUser = async (followerId, followingUuid) => {
  // Lookup target user by UUID
  const [targetUsers] = await pool.execute(
    "SELECT id FROM users WHERE uuid = ?",
    [followingUuid],
  );
  if (targetUsers.length === 0)
    return { error: "User not found" };
  const followingId = targetUsers[0].id;
  
  await pool.execute(
    "DELETE FROM follows WHERE follower_id = ? AND following_id = ?",
    [followerId, followingId],
  );
  return { following: false };
};
export const listFollowing = async (userUuid) => {
  // Lookup user by UUID
  const [users] = await pool.execute(
    "SELECT id FROM users WHERE uuid = ?",
    [userUuid],
  );
  if (users.length === 0) return [];
  const userId = users[0].id;
  
  const [rows] = await pool.execute(
    "SELECT u.uuid, u.name, u.email FROM follows f JOIN users u ON u.id = f.following_id WHERE f.follower_id = ? ORDER BY f.created_at DESC",
    [userId],
  );
  return rows;
};

export const listFollowers = async (userUuid) => {
  // Lookup user by UUID
  const [users] = await pool.execute(
    "SELECT id FROM users WHERE uuid = ?",
    [userUuid],
  );
  if (users.length === 0) return [];
  const userId = users[0].id;
  
  const [rows] = await pool.execute(
    "SELECT u.uuid, u.name, u.email FROM follows f JOIN users u ON u.id = f.follower_id WHERE f.following_id = ? ORDER BY f.created_at DESC",
    [userId],
  );
  return rows;
};
