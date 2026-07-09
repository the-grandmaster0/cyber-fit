
import app from './app.js';

const PORT = process.env.PORT || 3001; // Default port

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
