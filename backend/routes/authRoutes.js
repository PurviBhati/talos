import express from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { query } from "../db/index.js";

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || "openclaw-secret-key";

// POST /api/auth/login
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ error: "Email and password required" });

    const result = await query("SELECT * FROM users WHERE email = $1", [email]);
    if (result.rows.length === 0)
      return res.status(401).json({ error: "Invalid email or password" });

    const user = result.rows[0];
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid)
      return res.status(401).json({ error: "Invalid email or password" });

    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role,
        name: user.name,
        department: user.department,
        teams_display_name: user.teams_display_name,
        tenant_id: user.tenant_id || process.env.DEFAULT_TENANT_ID || "tenant-default",
      },
      JWT_SECRET,
      { expiresIn: "8h" }
    );

    res.json({
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role, department: user.department },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/register (admin only in production)
router.post("/register", authenticateToken, async (req, res) => {
  if (req.user.role !== "admin")
    return res.status(403).json({ error: "Admin only" });
  try {
    const { name, email, password, role, department, teams_display_name } = req.body;
    const tenantId = req.user.tenant_id || process.env.DEFAULT_TENANT_ID || "tenant-default";
    if (!name || !email || !password)
      return res.status(400).json({ error: "Name, email and password required" });

    const hash = await bcrypt.hash(password, 10);
    const result = await query(
      `INSERT INTO users (tenant_id, name, email, password_hash, role, department, teams_display_name)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id, name, email, role, department, tenant_id`,
      [tenantId, name, email, hash, role || "manager", department || null, teams_display_name || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.code === "23505") return res.status(400).json({ error: "Email already exists" });
    res.status(500).json({ error: err.message });
  }
});

// GET /api/auth/me
router.get("/me", authenticateToken, (req, res) => {
  res.json(req.user);
});

// GET /api/auth/users (admin only)
router.get("/users", authenticateToken, async (req, res) => {
  if (req.user.role !== "admin")
    return res.status(403).json({ error: "Admin only" });
  const result = await query(
    "SELECT id, name, email, role, department, teams_display_name, created_at FROM users WHERE tenant_id = $1 ORDER BY created_at",
    [req.user.tenant_id || process.env.DEFAULT_TENANT_ID || "tenant-default"]
  );
  res.json(result.rows);
});

// DELETE /api/auth/users/:id (admin only)
router.delete("/users/:id", authenticateToken, async (req, res) => {
  if (req.user.role !== "admin")
    return res.status(403).json({ error: "Admin only" });
  await query("DELETE FROM users WHERE id = $1 AND tenant_id = $2", [req.params.id, req.user.tenant_id || process.env.DEFAULT_TENANT_ID || "tenant-default"]);
  res.json({ message: "Deleted" });
});

// Middleware
export function authenticateToken(req, res, next) {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "No token provided" });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

export function authenticateTokenIfPresent(req, _res, next) {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return next();
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    req.user = null;
    next();
  }
}

export default router;