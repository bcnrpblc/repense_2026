# Checklist de Testes - PG Repense

Este documento contém cenários de teste manuais para validação do sistema antes do deploy.

## 1. Autenticação

### 1.1 Login Admin
- [ ] Login com credenciais válidas
- [ ] Login com email inválido mostra erro genérico
- [ ] Login com senha errada mostra erro genérico
- [ ] Token é salvo no localStorage
- [ ] Redirecionamento para dashboard após login
- [ ] Rate limiting após 10 tentativas

### 1.2 Login Professor
- [ ] Login com credenciais válidas
- [ ] Login com professor inativo mostra "Professor inativo"
- [ ] Redirecionamento para dashboard do professor
- [ ] Rate limiting após 10 tentativas

### 1.3 Logout
- [ ] Logout limpa o token
- [ ] Redirecionamento para página de login
- [ ] Não é possível acessar páginas protegidas após logout

### 1.4 Proteção de Rotas
- [ ] `/admin/*` redireciona para login se não autenticado
- [ ] `/teacher/*` redireciona para login se não autenticado
- [ ] Admin não pode acessar área do professor
- [ ] Professor não pode acessar área admin

## 2. Gestão de Turmas (Admin)

### 2.1 Listagem
- [ ] Turmas são exibidas corretamente
- [ ] Filtro por status funciona (ativas/inativas)
- [ ] Filtro por grupo funciona (Igreja/Espiritualidade/Evangelho)
- [ ] Filtro por professor funciona
- [ ] Contagem de vagas está correta

### 2.2 Criação
- [ ] Modal abre ao clicar "Criar Turma"
- [ ] Validação de campos obrigatórios
- [ ] Turma é criada e aparece na lista
- [ ] Toast de sucesso é exibido

### 2.3 Edição
- [ ] Botão editar abre modal/página de edição
- [ ] Dados são preenchidos corretamente
- [ ] Alterações são salvas
- [ ] Toggle ativar/desativar funciona

### 2.4 Alunos da Turma
- [ ] Lista de alunos é exibida
- [ ] Status de cada inscrição está correto
- [ ] Botões de ação aparecem para inscrições ativas
- [ ] Filtro por status funciona

## 3. Gestão de Alunos (Admin)

### 3.1 Listagem
- [ ] Alunos são exibidos com paginação
- [ ] Busca por nome funciona
- [ ] Busca por CPF funciona (com e sem máscara)
- [ ] Busca por email funciona
- [ ] Badges de cursos completos estão corretos

### 3.2 Perfil do Aluno
- [ ] Dados pessoais são exibidos
- [ ] Inscrições ativas aparecem na aba correta
- [ ] Histórico mostra todas as inscrições
- [ ] Frequência mostra todas as presenças
- [ ] Contadores estão corretos

### 3.3 Edição de Aluno
- [ ] Modal de edição abre corretamente
- [ ] CPF é exibido mas não editável
- [ ] Validação de email funciona
- [ ] Alterações são salvas
- [ ] Toast de sucesso é exibido

## 4. Ações de Inscrição

### 4.1 Conclusão de Inscrição
- [ ] Modal de confirmação abre
- [ ] Mensagem mostra nome do aluno e turma
- [ ] Após confirmar, status muda para "concluído"
- [ ] Vaga é liberada na turma
- [ ] Toast de sucesso é exibido

### 4.2 Cancelamento de Inscrição
- [ ] Modal de confirmação abre (variante danger)
- [ ] Mensagem mostra aviso sobre liberação de vaga
- [ ] Após confirmar, status muda para "cancelado"
- [ ] Vaga é liberada na turma
- [ ] Toast de sucesso é exibido

### 4.3 Transferência
- [ ] Modal mostra apenas turmas do mesmo grupo
- [ ] Turmas lotadas não aparecem
- [ ] Turma atual não aparece
- [ ] Confirmação mostra turma de destino
- [ ] Após transferir, nova inscrição é criada
- [ ] Inscrição antiga fica como "transferido"

## 5. Validação de Inscrição

### 5.1 Regras de Negócio
- [ ] Não pode se inscrever em turma lotada
- [ ] Não pode se inscrever em turma inativa
- [ ] Homem não pode se inscrever em turma exclusiva feminina
- [ ] Não pode ter duas inscrições ativas no mesmo grupo
- [ ] Não pode se reinscrever em curso já concluído
- [ ] Reinscrição após cancelamento requer confirmação

### 5.2 API de Validação
- [ ] `POST /api/enrollment/validate` retorna `canEnroll: true` quando permitido
- [ ] Retorna `canEnroll: false` com `reason` quando bloqueado
- [ ] Retorna `requiresConfirmation: true` para reinscrição após cancelamento

## 6. Área do Professor

### 6.1 Dashboard
- [ ] Turmas atribuídas são exibidas
- [ ] Próximas sessões aparecem
- [ ] Contagem de alunos está correta

### 6.2 Turmas
- [ ] Lista de turmas do professor
- [ ] Detalhes da turma mostram alunos
- [ ] Botão para criar sessão

### 6.3 Sessões
- [ ] Criar nova sessão funciona
- [ ] Sessão duplicada é bloqueada (mesmo número)
- [ ] Lista de alunos para frequência
- [ ] Marcar presença funciona
- [ ] Adicionar observação funciona
- [ ] Relatório pode ser editado

## 7. Responsividade (Mobile)

### 7.1 Navegação
- [ ] Menu hamburger aparece em telas pequenas
- [ ] Sidebar desliza corretamente
- [ ] Links de navegação funcionam
- [ ] Fechar menu ao clicar em link

### 7.2 Tabelas
- [ ] Tabelas viram cards no mobile
- [ ] Cards mostram informações essenciais
- [ ] Botões de ação são acessíveis
- [ ] Scroll horizontal quando necessário

### 7.3 Modais
- [ ] Modais ocupam tela toda no mobile
- [ ] Botão de fechar visível
- [ ] Formulários são usáveis
- [ ] Teclado não cobre inputs

### 7.4 Formulários
- [ ] Inputs ocupam largura total
- [ ] Labels são legíveis
- [ ] Botões são fáceis de tocar
- [ ] Validação inline funciona

## 8. Estados de Loading

### 8.1 Páginas
- [ ] Skeleton aparece enquanto carrega
- [ ] Spinner em botões durante ações
- [ ] Loading global durante navegação

### 8.2 Modais
- [ ] Botões ficam disabled durante submit
- [ ] Indicador de loading no botão
- [ ] Não permite duplo submit

## 9. Tratamento de Erros

### 9.1 Páginas de Erro
- [ ] Error boundary captura erros
- [ ] Mensagem amigável é exibida
- [ ] Botão "Tentar Novamente" funciona
- [ ] Código do erro é exibido

### 9.2 404
- [ ] Página 404 é exibida para rotas inexistentes
- [ ] Link para voltar funciona
- [ ] Estilo consistente com o sistema

### 9.3 Erros de API
- [ ] Erros são exibidos via toast
- [ ] Mensagens em português
- [ ] Não expõe detalhes técnicos
- [ ] Rate limiting mostra mensagem adequada

## 10. Performance

### 10.1 Carregamento
- [ ] Página inicial carrega em < 3s
- [ ] Dashboard carrega em < 2s
- [ ] Listagens grandes usam paginação

### 10.2 Interações
- [ ] Busca tem debounce
- [ ] Cliques respondem imediatamente
- [ ] Não há lag perceptível em ações

## 11. Casos Edge

### 11.1 Turma Lotada
- [ ] Não permite nova inscrição
- [ ] Transferência para turma lotada é bloqueada
- [ ] Mensagem de erro clara

### 11.2 Professor Inativo
- [ ] Login é bloqueado
- [ ] Turmas do professor ainda visíveis no admin

### 11.3 Dados Inválidos
- [ ] CPF duplicado é rejeitado
- [ ] Email duplicado é rejeitado
- [ ] Telefone duplicado é rejeitado
- [ ] Datas inválidas são rejeitadas

## 12. Segurança

### 12.1 Autenticação
- [ ] Tokens expiram após 7 dias
- [ ] Não é possível acessar rotas protegidas sem token
- [ ] Token inválido retorna 401

### 12.2 Autorização
- [ ] Admin não pode acessar como professor e vice-versa
- [ ] Endpoints verificam papel do usuário
- [ ] Dados sensíveis não expostos na resposta

### 12.3 Input
- [ ] SQL injection prevenido (Prisma)
- [ ] XSS prevenido (React)
- [ ] Validação server-side em todas as rotas

---

## Como Executar

1. Configure o ambiente de teste
2. Execute cada item da checklist
3. Marque ✓ para itens aprovados
4. Documente bugs encontrados
5. Reporte para equipe de desenvolvimento

## Reportando Bugs

Para cada bug encontrado, documente:
- **Título**: Descrição curta
- **Passos**: Como reproduzir
- **Esperado**: Comportamento esperado
- **Atual**: Comportamento atual
- **Evidência**: Screenshot ou vídeo
- **Severidade**: Crítico/Alto/Médio/Baixo
