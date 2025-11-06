const express = require('express');
const path = require('path');

const app = express();

// Servir todos os arquivos estáticos da raiz (index.html, sucesso.html, cancelado.html)
app.use(express.static(__dirname));

// Rota raiz -> index.html
app.get('/', (_req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

const port = process.env.PORT || 8080;
app.listen(port, () => {
  console.log('Hokmah Expositor web rodando na porta ' + port);
});
