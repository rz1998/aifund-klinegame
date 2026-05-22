# aifund-klinegame

K线游戏前端 - 对接 aifund-marketdata 数据源

## 简介

K线游戏是一个通过K线形态猜测股票涨跌的训练应用。

## 技术栈

- React 19 + TypeScript
- Vite 5
- Axios
- QRCode

## 环境变量

| 变量 | 说明 | 默认值 |
|------|------|--------|
| VITE_API_BASE_URL | API 基础路径 | /api/v1 |
| VITE_API_KEY | API Key | (空) |

## 开发

```bash
npm install
npm run dev
```

## 构建

```bash
npm run build
```

## 部署

使用 Docker:

```bash
docker build -t aifund-klinegame-web:latest .
docker run -d -p 8087:80 \
  --network ai-fund_unified \
  -e VITE_API_BASE_URL=/api/v1 \
  -e VITE_API_KEY=your_api_key \
  aifund-klinegame-web:latest
```

## API 端点

- `GET /api/v1/kline-game/random` - 获取随机K线数据

## 访问地址

| 服务 | 地址 |
|------|------|
| 前端 | http://localhost:8087 |
| API (marketdata) | http://localhost:8086 |
