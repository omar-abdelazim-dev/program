import 'dotenv/config';
import connectDB from './config/db.js';
import app from './app.js';

connectDB();

const PORT = process.env.PORT || 5000;
app.listen(PORT, '127.0.0.1', () => console.log(`Server running on http://127.0.0.1:${PORT}`));
