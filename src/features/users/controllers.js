import bcrypt from "bcryptjs";
import {
  createUser,
  getUserById,
  getAllUsers,
  deleteUserById,
  updateUser,
} from "./model.js";


export const createNewUser = async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) {
    return res
      .status(400)
      .json({ message: "Name, email and password are required" });
  }

  try {
    const hashedPassword = bcrypt.hashSync(password, 10);
    const newUser = await createUser({ name, email, password: hashedPassword });
    return res
      .status(201)
      .json({ message: "User created successfully", user: newUser });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "User creation failed" });
  }
};

export const getAllUsersController = async (req,res) => {
    try {
        const users = await getAllUsers();
        return res.status(200).json({users});
    } catch (error) {
        console.error(error);
        return res.status(500).json({message: "Failed to fetch users"});
    }
};

export const getUserByIdController = async (req, res) => {
  const userId = req.params.id;

  try {
    const user = await getUserById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    return res.status(200).json({ user });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Failed to fetch user" });
  }
};

export const updateUserController = async (req, res) => {
  const userId = req.params.id;
  const { name, email } = req.body;

  if (!name && !email) {
    return res
      .status(400)
      .json({ message: "At least name or email must be provided" });
  }

  try {
    const updatedUser = await updateUser(userId, { name, email });
    if (!updatedUser) {
      return res.status(404).json({ message: "User not found" });
    }
    return res
      .status(200)
      .json({ message: "User updated successfully", user: updatedUser });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Failed to update the user" });
  }
};

export const deleteUserController = async (req, res) => {
  const userId = req.params.id;

  try {
    const deletedUser = await deleteUserById(userId);
    if (!deletedUser) {
      return res.status(404).json({ message: "User not found" });
    }
    return res
      .status(200)
      .json({ message: "User deleted successfully", user: deletedUser });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Failed to delete the user" });
  }
};


