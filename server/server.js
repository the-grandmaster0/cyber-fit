
import app from './app.js';

// On Vercel (serverless) the app is exported and Vercel handles the HTTP server.
// On EB / local the app listens on PORT directly.
if (process.env.VERCEL) {
  // Vercel imports this file as a module — just export the app
} else {
  const PORT = process.env.PORT || 3001;
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

export default app;
