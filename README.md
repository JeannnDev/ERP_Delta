<p align="center">
  <img src="public/logo.svg" alt="ERP Delta Logo" width="350">
</p>

# ERP Delta — Gestão Inteligente & Moderna para Protheus

**ERP Delta** é uma plataforma modular de alta performance desenvolvida para modernizar a interação com o ecossistema Protheus (TOTVS). Utilizando o que há de mais recente no ecossistema web, o sistema serve como um **hub estratégico** de orquestração de dados, transformando processos complexos do ERP em experiências de usuário (UX) fluidas e eficientes.

> O ERP Delta não é focado em um único domínio — ele é projetado para **crescer junto com o negócio**, incorporando novos módulos de forma incremental, sem reestruturações, mantendo coesão técnica e visual em toda a plataforma.

---

## 🚀 O que é o ERP Delta?

Diferente de ferramentas isoladas, o **ERP Delta** foi projetado para ser o elo de inovação entre o **Advpl** e o **Angular**. Ele centraliza diversos módulos de gestão em uma única interface responsiva, permitindo que empresas automatizem entradas de dados e consultas rápidas sem a necessidade do SmartClient tradicional.

A arquitetura modular garante que cada área do negócio possa ser atendida de forma independente, mas integrada — seja suprimentos, produção, faturamento ou qualquer outro processo do ERP.

---

## 🧩 Módulos Disponíveis

| Módulo | Descrição |
| :--- | :--- |
| **Importação de Pedidos** | Conversão inteligente de planilhas Excel/CSV em pedidos de venda (SC5/SC6) com validação dinâmica. |
| **Gestão de Fornecedores (SA2)** | Interface refinada para controle e consulta de fornecedores cadastrados no Protheus. |
| **Auditoria de Documentos** | Rastreio e consulta de status de faturamento e notas fiscais em tempo real. |
| **Apontamento de Produção** | Módulo completo para registro de operações de chão de fábrica: setup de máquina, apontamento de horas, controle de pausas e finalização de ordens — integrado ao Protheus via REST. |
| **Workflows Guiados** | Processos complexos divididos em etapas (Steppers) para reduzir erros operacionais. |

> Novos módulos podem ser incorporados sem impacto na estrutura existente, seguindo os padrões estabelecidos de componentes, serviços e tipagem.

---

## 🛠️ Stack Tecnológica

| Camada | Tecnologia | Descrição |
| :--- | :--- | :--- |
| **Frontend** | [Angular v21](https://angular.dev/) | Estrutura moderna com Signals, Standalone Components e New Control Flow. |
| **UI System** | [PO UI](https://po-ui.io/) | Design System oficial TOTVS para componentes corporativos. |
| **Backend** | **Advpl / REST** | WebServices customizados para integridade total com Protheus. |
| **Integração** | **JSON / REST** | Comunicação de baixa latência e alta escalabilidade entre Angular e ERP. |
| **Arquivos** | **XLSX / SheetJS** | Processamento local de planilhas para agilidade extrema. |

---

## 📐 Arquitetura

O projeto segue um padrão **Standalone** e **Modular**, facilitando a expansão contínua para novos domínios do ERP:

- **Components**: Componentes reutilizáveis focados em PO UI, organizados por módulo de negócio.
- **Services**: Abstração da comunicação com o Protheus via `HttpClient` e endpoints REST.
- **Models**: Tipagens TypeScript rigorosas para garantir segurança de dados entre o ERP e a Web.
- **Routing**: Rotas lazy-loaded por módulo, garantindo performance mesmo com o crescimento da aplicação.

A escalabilidade é um princípio central do projeto — cada novo módulo é adicionado como uma unidade independente, sem quebrar funcionalidades existentes.

---

## ⚙️ Iniciando o Projeto

### Pré-requisitos
- Node.js (v20+)
- Angular CLI
- Ambiente Protheus com REST habilitado

### Instalação

```bash
npm install
ng serve
```

A aplicação estará disponível em `http://localhost:4200`.

---

## 📄 Licença

Projeto proprietário desenvolvido para integração com ambientes Protheus TOTVS. Uso interno.
