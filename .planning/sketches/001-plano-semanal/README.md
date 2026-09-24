---
sketch: 001
name: plano-semanal
question: "Qual estrutura deixa a semana montada legível e coloca as rotinas em primeiro plano, com leitura densa e técnica?"
winner: "E"
tags: [layout, plano, semana, rotinas]
---

# Sketch 001: Plano semanal

## Design Question
Depois de montada, a tela de Plano (`frontend/src/views/Plan.jsx`) vira uma parede de sub-linhas por dia.
Qual estrutura mantém a semana compacta, deixa as rotinas como protagonistas e mostra dados técnicos
(séries, tempo, volume por músculo) de relance?

## How to View
Sirva a pasta (o tema é carregado por caminho relativo):
    cd .planning/sketches && python -m http.server 8765
    http://127.0.0.1:8765/001-plano-semanal/index.html

Use os botões **Montado / Cheio / Vazio** para trocar o estado; a barra no canto inferior direito
troca tema (escuro/claro), largura (celular/tablet/desktop) e liga a anotação.

## Variants

### Rodada 2 (simplificada, pedida depois da rodada 1)
- **D: Lista limpa**: semana como lista de 7 linhas, uma linha por dia ("Seg  Push Day", "Sáb  Push Day + Core", "Descanso"), e rotinas numa lista simples (ícone, nome, exercícios · séries · tempo). Sem barras nem cores por rotina.
- **E: Próximo treino + faixa**: Treinador com IA em destaque (gradiente laranja, selo "IA", brilho sutil) logo abaixo do título; depois card "Próximo treino" com Iniciar, semana numa linha de 7 pontos, rotinas em lista com os dias à direita ("Seg · Sáb").
- **F: Só rotinas**: uma única lista; cada rotina tem os 7 dias marcáveis logo abaixo. A semana é derivada das marcações, sem seção própria.

### Rodada 1
- **A: Faixa + cards densos**: 7 blocos de dia que nunca crescem (pílulas por rotina + séries), KPIs da semana, volume por músculo com faixa-alvo 10–20, e cards de rotina que expandem com a lista de exercícios. Caminho de menor resistência no CSS atual (`.list/.item`).
- **B: Matriz rotina × dia**: KPIs no topo, tabela em que cada célula agenda/desagenda com um toque, rodapé com séries por dia, volume por músculo ao lado.
- **C: Cards grandes (Hevy)**: semana resumida em 7 círculos, ações "Nova rotina / Planos prontos", cards grandes com prévia dos exercícios, chips de dia dentro do card e "Iniciar rotina".

## What to Look For
- No estado **Cheio** (6 rotinas, dias com 2 rotinas): qual continua legível?
- Onde fica mais rápido agendar uma rotina num dia?
- Quanto dado técnico é útil antes de virar ruído (volume por músculo, séries/dia, tempo)?
- Em desktop, a divisão em duas colunas faz sentido?
