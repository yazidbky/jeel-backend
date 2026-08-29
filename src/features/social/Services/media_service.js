import path from "path";
import { mediaTypeFor } from "../Middlewares/upload.js";

export const toMediaRecord = (file, index) => ({
  url: `/uploads/${path.basename(file.filename)}`,
  type: mediaTypeFor(file.mimetype),
  orderIndex: index,
});
