# Guia de Deployment - PG Repense

Este documento contém instruções detalhadas para deploy do sistema em ambiente de produção.

## Pré-requisitos

- Servidor com Node.js 18+ 
- PostgreSQL 14+
- Domínio configurado (opcional, mas recomendado)
- Certificado SSL (Let's Encrypt ou similar)

## 1. Preparação do Ambiente

### 1.1 Variáveis de Ambiente

Crie o arquivo `.env.production`:

```env
# Database
DATABASE_URL="postgresql://user:password@host:5432/repense_prod?sslmode=require"

# JWT - IMPORTANTE: Use uma chave forte e única!
JWT_SECRET="chave-secreta-muito-forte-com-pelo-menos-32-caracteres"

# Ambiente
NODE_ENV=production

# Opcional: URL da aplicação
NEXTAUTH_URL=https://seu-dominio.com
```

### 1.2 Gerar JWT_SECRET Seguro

```bash
# Linux/macOS
openssl rand -base64 32

# Ou use Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

**IMPORTANTE**: Nunca reutilize a chave do ambiente de desenvolvimento!

## 2. Configuração do Banco de Dados

### 2.1 Criar Banco de Produção

```sql
CREATE DATABASE repense_prod;
CREATE USER repense_user WITH ENCRYPTED PASSWORD 'senha-forte';
GRANT ALL PRIVILEGES ON DATABASE repense_prod TO repense_user;
```

### 2.2 Executar Migrações

```bash
# No servidor de produção
npx prisma migrate deploy
```

### 2.3 Criar Admin Inicial

```bash
# Execute o seed apenas para criar o admin
npx prisma db seed -- --admin-only
```

Ou crie manualmente via API:
```bash
curl -X POST https://seu-dominio.com/api/auth/admin/signup \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@repense.com", "password": "senha-inicial-segura"}'
```

## 3. Build e Deploy

### 3.1 Build da Aplicação

```bash
# Instalar dependências
npm ci --production=false

# Gerar cliente Prisma
npx prisma generate

# Build da aplicação
npm run build
```

### 3.2 Iniciar Servidor

```bash
# Produção
npm start

# Ou com PM2 (recomendado)
pm2 start npm --name "repense" -- start
pm2 save
pm2 startup
```

### 3.3 Configuração PM2 (ecosystem.config.js)

```javascript
module.exports = {
  apps: [{
    name: 'repense',
    script: 'npm',
    args: 'start',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    instances: 'max',
    exec_mode: 'cluster'
  }]
};
```

## 4. Configuração do Nginx

```nginx
server {
    listen 80;
    server_name seu-dominio.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name seu-dominio.com;

    ssl_certificate /etc/letsencrypt/live/seu-dominio.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/seu-dominio.com/privkey.pem;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Static files caching
    location /_next/static {
        proxy_pass http://localhost:3000;
        add_header Cache-Control "public, max-age=31536000, immutable";
    }

    location /static {
        proxy_pass http://localhost:3000;
        add_header Cache-Control "public, max-age=31536000, immutable";
    }
}
```

## 5. Checklist de Segurança

### 5.1 Obrigatório

- [ ] JWT_SECRET forte e único (32+ caracteres)
- [ ] Senhas do banco são fortes
- [ ] HTTPS habilitado
- [ ] Cabeçalhos de segurança configurados
- [ ] Rate limiting ativo nos endpoints de auth
- [ ] NODE_ENV=production configurado
- [ ] Logs não expõem dados sensíveis

### 5.2 Recomendado

- [ ] Firewall configurado (apenas portas 80, 443, 22)
- [ ] Fail2ban ou similar para SSH
- [ ] Backups automáticos do banco
- [ ] Monitoramento de uptime
- [ ] Alertas de erro configurados

## 6. Backup e Restore

### 6.1 Backup do Banco

```bash
# Backup completo
pg_dump -h localhost -U repense_user -d repense_prod -F c -f backup_$(date +%Y%m%d).dump

# Backup agendado (crontab)
0 3 * * * pg_dump -h localhost -U repense_user -d repense_prod -F c -f /backups/repense_$(date +\%Y\%m\%d).dump
```

### 6.2 Restore do Banco

```bash
# Restaurar backup
pg_restore -h localhost -U repense_user -d repense_prod -c backup.dump
```

## 7. Estratégia de Migração

### 7.1 Migrações em Produção

1. **Backup**: Sempre faça backup antes de migrar
2. **Teste**: Execute em staging primeiro
3. **Janela**: Planeje janela de manutenção se necessário
4. **Rollback**: Tenha plano de rollback pronto

```bash
# Verificar migrações pendentes
npx prisma migrate status

# Aplicar migrações
npx prisma migrate deploy

# Em caso de erro, restaure o backup
pg_restore -h localhost -U repense_user -d repense_prod -c backup.dump
```

### 7.2 Migrações de Schema

Para alterações que requerem downtime:

1. Coloque o sistema em modo de manutenção
2. Faça backup
3. Execute a migração
4. Valide os dados
5. Remova o modo de manutenção

## 8. Monitoramento

### 8.1 Logs

```bash
# PM2 logs
pm2 logs repense

# Logs do Nginx
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log
```

### 8.2 Health Check

O sistema possui endpoints implícitos de health:
- `/api/auth/admin/me` - Verifica autenticação
- `/` - Página inicial (verifica renderização)

### 8.3 Métricas Recomendadas

- Tempo de resposta das APIs
- Taxa de erro 4xx/5xx
- Uso de CPU/memória
- Conexões de banco de dados
- Taxa de requisições

## 9. Troubleshooting

### Erro 502 Bad Gateway

1. Verifique se o Node.js está rodando: `pm2 status`
2. Verifique logs: `pm2 logs repense`
3. Reinicie se necessário: `pm2 restart repense`

### Erro de Conexão com Banco

1. Verifique conectividade: `pg_isready -h host -p 5432`
2. Confirme credenciais no `.env`
3. Verifique logs do PostgreSQL

### Performance Lenta

1. Verifique índices: `EXPLAIN ANALYZE` nas queries lentas
2. Analise logs de slow queries do PostgreSQL
3. Considere aumentar `statement_timeout` se necessário

## 10. Contatos de Emergência

Configure alertas para:
- Equipe de infraestrutura
- Desenvolvedores responsáveis
- DBA (se houver)

## 11. Recursos Adicionais

- [Next.js Production Checklist](https://nextjs.org/docs/deployment)
- [Prisma Production Deployment](https://www.prisma.io/docs/guides/deployment)
- [PostgreSQL Tuning](https://wiki.postgresql.org/wiki/Tuning_Your_PostgreSQL_Server)
