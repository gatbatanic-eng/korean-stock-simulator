const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const stocksModule = require('./routes/stocks');
app.use('/api/auth', require('./routes/auth'));
app.use('/api/stocks', stocksModule.router);
app.use('/api/portfolio', require('./routes/portfolio'));
app.use('/api/ranking', require('./routes/ranking'));
app.use('/api/admin', require('./routes/admin'));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`\n🚀 주식 모의투자 서버 실행 중: http://localhost:${PORT}\n`);
  stocksModule.crawlAllStocks().catch(err =>
    console.error('[stocks] 크롤링 오류:', err.message)
  );
});
