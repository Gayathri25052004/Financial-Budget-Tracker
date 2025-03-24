const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const sqlite3 = require("sqlite3").verbose();
const app = express();
const port = 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Database setup
const db = new sqlite3.Database("./finance.db", (err) => {
    if (err) {
        console.error("Error connecting to database:", err.message);
        process.exit(1);
    }
    console.log("Connected to the finance database.");
});

// Create tables
db.serialize(() => {
    db.run(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE,
            password TEXT
        )`, (err) => {
            if (err) console.error("Error creating users table:", err.message);
        });

    db.run(`
        CREATE TABLE IF NOT EXISTS expenses (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            userId INTEGER,
            description TEXT,
            amount REAL,
            date TEXT,
            type TEXT,
            FOREIGN KEY (userId) REFERENCES users(id)
        )`, (err) => {
            if (err) console.error("Error creating expenses table:", err.message);
        });

    db.run(`
        CREATE TABLE IF NOT EXISTS searches (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            userId INTEGER,
            searchTerm TEXT,
            searchDate TEXT,
            FOREIGN KEY (userId) REFERENCES users(id)
        )`, (err) => {
            if (err) console.error("Error creating searches table:", err.message);
        });
});

// API Endpoints

// Register
app.post("/api/register", (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
        return res.status(400).json({ error: "Username and password are required" });
    }

    db.run(
        `INSERT INTO users (username, password) VALUES (?, ?)`,
        [username, password],
        function (err) {
            if (err) {
                console.error("Register error:", err.message);
                return res.status(400).json({ error: err.message });
            }
            console.log(`User registered with ID: ${this.lastID}`);
            res.json({ id: this.lastID });
        }
    );
});

// Login
app.post("/api/login", (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
        return res.status(400).json({ error: "Username and password are required" });
    }

    db.get(
        `SELECT id FROM users WHERE username = ? AND password = ?`,
        [username, password],
        (err, row) => {
            if (err) {
                console.error("Login error:", err.message);
                return res.status(500).json({ error: "Internal server error" });
            }
            if (row) {
                console.log(`User ${username} logged in with ID: ${row.id}`);
                res.json({ userId: row.id });
            } else {
                res.status(401).json({ error: "Invalid credentials" });
            }
        }
    );
});

// Create expense
app.post("/api/expenses", (req, res) => {
    const { userId, description, amount, date, type } = req.body;
    if (!userId || !description || !amount || !date) {
        return res.status(400).json({ error: "All fields (userId, description, amount, date) are required" });
    }

    db.run(
        `INSERT INTO expenses (userId, description, amount, date, type) VALUES (?, ?, ?, ?, ?)`,
        [userId, description, amount, date, type || "expense"],
        function (err) {
            if (err) {
                console.error("Expense creation error:", err.message);
                return res.status(400).json({ error: err.message });
            }
            console.log(`Expense created with ID: ${this.lastID}`);
            res.json({ id: this.lastID });
        }
    );
});

// Get expenses
app.get("/api/expenses/:userId", (req, res) => {
    const userId = req.params.userId;
    if (!userId) {
        return res.status(400).json({ error: "userId is required" });
    }

    db.all(
        `SELECT * FROM expenses WHERE userId = ?`,
        [userId],
        (err, rows) => {
            if (err) {
                console.error("Get expenses error:", err.message);
                return res.status(500).json({ error: "Internal server error" });
            }
            res.json(rows);
        }
    );
});

// Update expense
app.put("/api/expenses/:id", (req, res) => {
    const { userId, description, amount, date, type } = req.body;
    const id = req.params.id;
    if (!userId || !id || !description || !amount || !date) {
        return res.status(400).json({ error: "All fields (userId, id, description, amount, date) are required" });
    }

    db.run(
        `UPDATE expenses SET description = ?, amount = ?, date = ?, type = ? WHERE id = ? AND userId = ?`,
        [description, amount, date, type || "expense", id, userId],
        function (err) {
            if (err) {
                console.error("Update expense error:", err.message);
                return res.status(400).json({ error: err.message });
            }
            if (this.changes === 0) {
                return res.status(404).json({ error: "Expense not found or not owned by user" });
            }
            console.log(`Expense ${id} updated`);
            res.json({ success: true });
        }
    );
});

// Delete expense
app.delete("/api/expenses/:id", (req, res) => {
    const id = req.params.id;
    if (!id) {
        return res.status(400).json({ error: "Expense ID is required" });
    }

    db.run(
        `DELETE FROM expenses WHERE id = ?`,
        [id],
        function (err) {
            if (err) {
                console.error("Delete expense error:", err.message);
                return res.status(400).json({ error: err.message });
            }
            if (this.changes === 0) {
                return res.status(404).json({ error: "Expense not found" });
            }
            console.log(`Expense ${id} deleted`);
            res.json({ success: true });
        }
    );
});

// Create search
app.post("/api/searches", (req, res) => {
    const { userId, searchTerm, searchDate } = req.body;
    if (!userId || !searchTerm || !searchDate) {
        return res.status(400).json({ error: "All fields (userId, searchTerm, searchDate) are required" });
    }

    db.run(
        `INSERT INTO searches (userId, searchTerm, searchDate) VALUES (?, ?, ?)`,
        [userId, searchTerm, searchDate],
        function (err) {
            if (err) {
                console.error("Search creation error:", err.message);
                return res.status(400).json({ error: err.message });
            }
            console.log(`Search created with ID: ${this.lastID}`);
            res.json({ id: this.lastID });
        }
    );
});

// Get searches
app.get("/api/searches/:userId", (req, res) => {
    const userId = req.params.userId;
    if (!userId) {
        return res.status(400).json({ error: "userId is required" });
    }

    db.all(
        `SELECT * FROM searches WHERE userId = ?`,
        [userId],
        (err, rows) => {
            if (err) {
                console.error("Get searches error:", err.message);
                return res.status(500).json({ error: "Internal server error" });
            }
            res.json(rows);
        }
    );
});

// Start server
app.listen(port, () => {
    console.log(`Server listening at http://localhost:${port}`);
});

// Graceful shutdown
process.on('SIGINT', () => {
    db.close((err) => {
        if (err) console.error("Error closing database:", err.message);
        console.log("Database connection closed.");
        process.exit(0);
    });
});