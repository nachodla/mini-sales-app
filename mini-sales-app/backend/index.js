const express = require("express");
const cors = require("cors");
const Database = require("better-sqlite3");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 4000;

// Middleware
app.use(cors());
app.use(express.json());

// Database setup
const db = new Database(path.join(__dirname, "sales.db"));

db.exec(`
  CREATE TABLE IF NOT EXISTS sales (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer TEXT NOT NULL,
    product TEXT NOT NULL,
    amount REAL NOT NULL,
    score INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

// GET /sales - List all sales
app.get("/sales", (req, res) => {
  try {
    const sales = db.prepare("SELECT * FROM sales ORDER BY created_at DESC").all();
    res.json(sales);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch sales" });
  }
});

// POST /sales - Create a sale
app.post("/sales", (req, res) => {
  const { customer, product, amount } = req.body;

  if (!customer || !product || !amount) {
    return res.status(400).json({ error: "customer, product and amount are required" });
  }

  if (isNaN(amount) || Number(amount) <= 0) {
    return res.status(400).json({ error: "amount must be a positive number" });
  }

  try {
    const stmt = db.prepare(
      "INSERT INTO sales (customer, product, amount) VALUES (?, ?, ?)"
    );
    const result = stmt.run(customer.trim(), product.trim(), Number(amount));
    const newSale = db.prepare("SELECT * FROM sales WHERE id = ?").get(result.lastInsertRowid);
    res.status(201).json(newSale);
  } catch (err) {
    res.status(500).json({ error: "Failed to create sale" });
  }
});

// POST /sales/:id/evaluate - Assign a score
app.post("/sales/:id/evaluate", (req, res) => {
  const { id } = req.params;
  const { score } = req.body;

  if (score === undefined || score === null) {
    return res.status(400).json({ error: "score is required" });
  }

  const scoreNum = Number(score);
  if (!Number.isInteger(scoreNum) || scoreNum < 1 || scoreNum > 5) {
    return res.status(400).json({ error: "score must be an integer between 1 and 5" });
  }

  try {
    const sale = db.prepare("SELECT * FROM sales WHERE id = ?").get(id);
    if (!sale) return res.status(404).json({ error: "Sale not found" });

    db.prepare("UPDATE sales SET score = ? WHERE id = ?").run(scoreNum, id);
    const updated = db.prepare("SELECT * FROM sales WHERE id = ?").get(id);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: "Failed to evaluate sale" });
  }
});

// GET /sales/stats - Average score (bonus)
app.get("/sales/stats", (req, res) => {
  try {
    const result = db.prepare(
      "SELECT AVG(score) as avg_score, COUNT(*) as total, COUNT(score) as evaluated FROM sales"
    ).get();
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch stats" });
  }
});

app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});
