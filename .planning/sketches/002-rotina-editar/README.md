---
sketch: 002
name: rotina-editar
question: "Como deixar a lista de exercícios da rotina limpa e o superset óbvio, mantendo reordenar fácil?"
winner: "C2"
tags: [rotina, exercicios, superset, reordenar]
---

# Sketch 002: Editar rotina

## Design Question
A tela `#/plan/r/:id` (`frontend/src/views/RoutineEdit.jsx`) está confusa: cada exercício carrega 🔗, ↑ e ↓,
e o superset ("ligar com o de cima") não é claro. A ação principal é montar e ordenar os exercícios.

## How to View
    cd .planning/sketches && python -m http.server 8765
    http://127.0.0.1:8765/002-rotina-editar/index.html

Estados: **Montada** (Push Day com 1 superset), **Longa** (10 exercícios, 2 supersets, um com 3), **Vazia**.

## Comum às 3 variantes (mesma linha do Plano, sketch 001 E)
- Topo: voltar · nome editável · ícone · ⋮ (Copiar / Excluir rotina saem do fim da tela).
- Resumo: "6 exercícios · 19 séries · ~55 min".
- Linha do exercício: foto, nome, **4 × 8** · 60 kg. Tocar abre o ajuste de séries/reps/carga.
- Mapa do corpo "O que esta sessão trabalha" mantido como está (card grande + chips).
- Progressão e "Excluir da progressão automática" descem para **Configurações da rotina**, no fim.

## Variants
- **A: Lista limpa + Organizar**: a lista não tem controles. O botão "Organizar" liga um modo com ↑↓ por bloco, ✕ por exercício, "Juntar em superset" entre blocos e "Separar" dentro do superset. Superset = card único com barra laranja e o rótulo "Superset · em sequência, sem descanso entre eles".
- **B: Blocos A · B · C1/C2**: letras como numa ficha de academia; superset vira D1/D2 com uma linha ligando as letras. Uma 🔗 entre cada par de exercícios faz/desfaz o superset num toque; alça ⠿ para arrastar (no sketch funciona com mouse).
- **C: Menu ⋮ + colchete**: cada exercício só tem ⋮ (editar, mover, superset com o de cima / separar, remover); superset mostrado com um colchete laranja e a etiqueta "Superset · sem descanso entre eles".
- **C2: C + ícone de superset** (pedido após a rodada 1): a C, com um botão 🔗 redondo **entre** cada par de exercícios para fazer o superset num toque; dentro do superset a 🔗 fica laranja e separa. O ⋮ continua para editar, mover e remover.

## What to Look For
- Em qual o superset fica óbvio sem precisar de explicação?
- Qual é mais rápido para reordenar e para criar/desfazer superset?
- No estado **Longa**, qual continua legível?
