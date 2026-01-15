# CEP Crawler API

API para crawler assíncrono de CEPs utilizando fila de mensagens e MongoDB.

## Stack Tecnológica

| Tecnologia | Uso |
|------------|-----|
| **Node.js 22** | Runtime |
| **TypeScript** | Linguagem |
| **Express** | Framework HTTP |
| **MongoDB** | Banco de dados |
| **Mongoose** | ODM |
| **ElasticMQ** | Fila SQS-compatible |
| **AWS SDK** | Cliente SQS |
| **Zod** | Validação de schemas |
| **Docker** | Containerização |

## Arquitetura

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Cliente   │────▶│  API HTTP   │────▶│   MongoDB   │
└─────────────┘     └──────┬──────┘     └─────────────┘
                          │                    ▲
                          ▼                    │
                   ┌─────────────┐             │
                   │  ElasticMQ  │             │
                   │   (Fila)    │             │
                   └──────┬──────┘             │
                          │                    │
                          ▼                    │
                   ┌─────────────┐             │
                   │   Worker    │─────────────┘
                   │             │
                   │  ┌───────┐  │
                   │  │ViaCEP │  │
                   │  │  API  │  │
                   │  └───────┘  │
                   └─────────────┘
```

### Fluxo de Processamento

1. Cliente envia `POST /cep/crawl` com range de CEPs
2. API valida, cria registro no MongoDB e enfileira CEPs
3. Worker consome fila respeitando rate limit
4. Para cada CEP, consulta ViaCEP e persiste resultado
5. Cliente consulta status e resultados via GET

## Estrutura do Projeto

```
src/
├── config/           # Configurações (env, database, queue)
├── models/           # Schemas Mongoose (Crawl, Result)
├── routes/           # Rotas Express
├── services/         # Lógica de negócio
├── validators/       # Schemas Zod
├── api.ts            # Entry point da API
└── worker.ts         # Consumidor da fila
```

## Como Executar

### Pré-requisitos

- Node.js 22+
- Docker e Docker Compose
- npm

### Opção 1: Docker Compose (Recomendado)

```bash
# Subir todos os serviços
docker compose up -d --build

# Ver logs
docker compose logs -f

# Parar
docker compose down
```

### Opção 2: Desenvolvimento Local

```bash
# 1. Instalar dependências
npm install

# 2. Subir MongoDB e ElasticMQ
docker run -d --name mongodb -p 27017:27017 mongo:7
docker run -d --name elasticmq -p 9324:9324 -p 9325:9325 \
  -v "$(pwd)/elasticmq.conf:/opt/elasticmq.conf" \
  softwaremill/elasticmq-native:latest

# 3. Criar .env
cp .env.example .env

# 4. Rodar API (Terminal 1)
npm run dev:api

# 5. Rodar Worker (Terminal 2)
npm run dev:worker
```

## Endpoints da API

### Health Check

```http
GET /health
```

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### Criar Crawl

```http
POST /cep/crawl
Content-Type: application/json

{
  "cep_start": "01310100",
  "cep_end": "01310200"
}
```

**Response (202 Accepted):**
```json
{
  "message": "Crawl request accepted",
  "crawl_id": "550e8400-e29b-41d4-a716-446655440000"
}
```

### Consultar Status

```http
GET /cep/crawl/:crawl_id
```

**Response (200 OK):**
```json
{
  "crawl_id": "550e8400-e29b-41d4-a716-446655440000",
  "cep_start": "01310100",
  "cep_end": "01310200",
  "total_ceps": 101,
  "processed": 50,
  "successes": 48,
  "error_count": 2,
  "status": "running",
  "created_at": "2024-01-15T10:30:00.000Z",
  "updated_at": "2024-01-15T10:31:00.000Z"
}
```

### Consultar Resultados (Paginado)

```http
GET /cep/crawl/:crawl_id/results?page=1&limit=20
```

**Response (200 OK):**
```json
{
  "crawl_id": "550e8400-e29b-41d4-a716-446655440000",
  "results": [
    {
      "cep": "01310100",
      "success": true,
      "found": true,
      "data": {
        "cep": "01310-100",
        "logradouro": "Avenida Paulista",
        "bairro": "Bela Vista",
        "localidade": "São Paulo",
        "uf": "SP"
      },
      "error": null,
      "processed_at": "2024-01-15T10:30:05.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 101,
    "total_pages": 6
  }
}
```

## Exemplo de Teste Completo

```bash
# 1. Verificar se a API está rodando
curl http://localhost:3000/health

# 2. Criar um crawl com 100 CEPs
curl -X POST http://localhost:3000/cep/crawl \
  -H "Content-Type: application/json" \
  -d '{"cep_start": "01310100", "cep_end": "01310199"}'

# Resposta: {"message":"Crawl request accepted","crawl_id":"abc123..."}

# 3. Acompanhar o status
curl http://localhost:3000/cep/crawl/abc123...

# 4. Ver os resultados quando finalizado
curl "http://localhost:3000/cep/crawl/abc123.../results?page=1&limit=50"
```

## Configurações

| Variável | Padrão | Descrição |
|----------|--------|-----------|
| `PORT` | 3000 | Porta da API |
| `MONGODB_URI` | mongodb://localhost:27017/cep-crawler | URI do MongoDB |
| `SQS_ENDPOINT` | http://localhost:9324 | Endpoint do ElasticMQ |
| `MAX_CEP_RANGE` | 1000 | Máximo de CEPs por request |
| `RATE_LIMIT_MS` | 50 | Intervalo entre requests (20 req/s) |
| `MAX_RETRIES` | 3 | Tentativas em caso de falha |

> **Nota:** Os parâmetros `RATE_LIMIT_MS`, `MAX_CEP_RANGE` e `MAX_RETRIES` podem ser ajustados conforme necessário. No entanto, **recomenda-se manter os valores padrão** para evitar bloqueios temporários pela API do ViaCEP (rate limiting), timeouts de conexão ou sobrecarga do sistema. Valores muito agressivos podem resultar em falhas de rede e necessidade de múltiplos retries.

## Controle de Taxa (Rate Limiting)

O worker implementa rate limiting para respeitar os limites da API do ViaCEP:

- **Intervalo configurável** entre requisições (padrão: 50ms = 20 req/s)
- **Retry com exponential backoff** para falhas temporárias
- **Máximo de 3 tentativas** por CEP

## Modelos de Dados

### Collection: crawls

```javascript
{
  crawlId: "uuid",
  cepStart: "01310100",
  cepEnd: "01310200",
  totalCeps: 101,
  processed: 50,
  successes: 48,
  errorCount: 2,
  status: "running", // pending | running | finished | failed
  createdAt: Date,
  updatedAt: Date
}
```

### Collection: results

```javascript
{
  crawlId: "uuid",
  cep: "01310100",
  success: true,
  found: true,
  data: { /* dados do ViaCEP */ },
  error: null,
  attempts: 1,
  processedAt: Date
}
```

## Scripts Disponíveis

```bash
npm run build        # Compila TypeScript
npm run dev:api      # API em modo desenvolvimento
npm run dev:worker   # Worker em modo desenvolvimento
npm run start:api    # API em produção
npm run start:worker # Worker em produção
```

---

## Requisitos do Desafio

Este projeto implementa todos os requisitos do teste técnico:

- [x] API REST com Express
- [x] Processamento assíncrono via fila (ElasticMQ/SQS)
- [x] Integração com API do ViaCEP
- [x] Persistência em MongoDB
- [x] Controle de taxa de processamento
- [x] Retry com exponential backoff
- [x] Docker e Docker Compose
- [x] Validação de entrada com Zod
- [x] Paginação de resultados
