import express from "express";
import path from "path";
import { fileURLToPath } from "url";

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 8080;

// servir estáticos da pasta /public
app.use(express.static(path.join(__dirname, "public")));

// rota de saúde
app.get("/health", (_req, res) => {
  res.status(200).send("ok");
});

// fallback simples
app.get("*", (_req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, () => {
  console.log(`Hokmah Expositor rodando em http://localhost:${PORT}`);
});
