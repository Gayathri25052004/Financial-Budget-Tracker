require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
app.use(express.json());
app.use(cors());

// Connect to MongoDB (Local - Compass)
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('MongoDB Connected'))
    .catch(err => console.log('MongoDB Connection Error:', err));

// Define User Schema
const UserSchema = new mongoose.Schema({
    username: String,
    email: String,
    password: String
}, { collection: 'logincred' });  // Ensure it uses the correct collection

const User = mongoose.model('User', UserSchema);

// Signup Route
app.post('/signup', async (req, res) => {
    const { username, email, password } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ error: 'User already exists' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({ username, email, password: hashedPassword });

    try {
        await newUser.save();
        res.status(201).json({ message: 'User registered successfully' });
    } catch (err) {
        res.status(500).json({ error: 'Error registering user' });
    }
});

// Login Route
app.post('/login', async (req, res) => {
    const { email, password } = req.body;
    const user = await User.findOne({ email });

    if (!user || !(await bcrypt.compare(password, user.password))) {
        return res.status(400).json({ error: 'Invalid email or password' });
    }

    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
    res.json({ message: 'Login successful', token });
});

// Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
