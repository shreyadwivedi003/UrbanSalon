import app from "./index";

const PORT = process.env.PORT || 3000;

// This only runs locally on your computer, Vercel ignores this block entirely
app.listen(PORT, () => {
  console.log(`Server running locally at http://localhost:${PORT}`);
});