# Cabinet HQ Studio

Dashboard React independente para operar o perfil e as listas de uma HQ no Cabinet. A interface usa a API real do Cabinet; não há catálogo ou conta de demonstração embutidos.

## Requisitos

- Node.js 20.19 ou mais recente
- API do Cabinet disponível (por padrão, `http://localhost:8080`)
- Conta de operador ativa associada a uma HQ

## Configuração

Copie `.env.example` para `.env.local` e ajuste os endereços se necessário:

```env
VITE_API_URL=http://localhost:8080
VITE_PUBLIC_APP_URL=http://localhost:3000
```

`VITE_API_URL` aponta para o backend. `VITE_PUBLIC_APP_URL` aponta para o site Cabinet e é usado para compartilhar a seção pública de listas do perfil.

## Desenvolvimento

```bash
npm install
npm run dev
```

Entre com o identificador da HQ, o e-mail do operador e a senha. A sessão é autenticada pelo backend.

## Funcionalidades conectadas

- Atualizar nome público, apresentação, site, avatar e capa do perfil.
- Criar, editar e excluir listas; escolher capa e visibilidade; editar descrição com negrito, itálico, citação e links.
- Buscar obras do catálogo Cabinet e de fontes externas; importar uma obra externa para adicioná-la a uma lista.
- Adicionar e remover obras, salvar notas editoriais e reordenar os itens.
- Consultar operadores e, como proprietário, criar e remover acessos.
- Ver seguidores, listas e itens reais. A API atual não fornece visitas ao perfil nem histórico de crescimento, então esses números não são exibidos.

Descrições rich text de listas usam a migração `V64__add_rich_hq_list_descriptions.sql` no backend.

## Produção

```bash
npm run typecheck
npm run build
npm run preview
```
