const express = require('express');
const cors = require('cors');
const path = require('path');
const { initDb } = require('./database');

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

async function start() {
  await initDb();
  app.listen(PORT, () => {
    console.log(`\n🚀 주식 모의투자 서버 실행 중: http://localhost:${PORT}\n`);
    stocksModule.crawlAllStocks().catch(err =>
      console.error('[stocks] 크롤링 오류:', err.message)
    );
    setInterval(() => {
      stocksModule.crawlAllStocks().catch(err =>
        console.error('[stocks] 주기적 크롤링 오류:', err.message)
      );
    }, 60 * 60 * 1000); // 1시간마다 갱신
  });
}

start().catch(err => {
  console.error('[server] 시작 실패:', err.message);
  process.exit(1);
});
