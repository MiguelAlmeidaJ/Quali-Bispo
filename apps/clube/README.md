# Clube Quali (Next.js)

## Estrutura

- `app/`: rota pública e estilos globais.
- `src/components/layout/`: Header, Footer, marca temporária e botão WhatsApp.
- `src/components/sections/`: uma seção visual por componente, na ordem da página.
- `src/components/ui/`: componentes visuais pequenos e reutilizáveis.
- `src/config/`: contatos e links externos.
- `src/data/`: catálogo inicial, unidades e perguntas frequentes.

## Manutenção

Edite preços e procedimentos em `src/data/catalog.ts`. Edite telefone/WhatsApp em `src/config/contact.ts`. Para alterar uma seção, modifique somente seu componente. A ordem da página fica em `app/page.tsx`.

**Pendente:** substituir a marca tipográfica temporária pelo PNG oficial, validar equivalência visual pixel a pixel e conectar autenticação da área do associado exclusivamente à API. Não transportar senhas embutidas do HTML antigo para o navegador.
