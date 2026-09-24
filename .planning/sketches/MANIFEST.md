# Sketch Manifest

## Design Direction
Refazer a tela de Plano do RestoFit com leitura **densa e técnica**: rotinas em primeiro plano
(estilo Hevy/Strong), semana compacta que não vira uma parede de linhas depois de montada, e
métricas de relance (séries, tempo estimado, volume semanal por músculo com faixa-alvo). Mantém a
identidade do app: tema escuro estilo iOS, acento `#C2410C`, fonte do sistema.

## Decisões (sketch 001, variante E)
- Direção final **simplificada**: uma cor só (acento), sem barras de músculo nem painel de volume; dado técnico em uma linha por rotina (exercícios · séries · ~min) e um resumo da semana (dias · séries · tempo).
- Ordem: título Plano → **Treinador IA em destaque** (card em gradiente laranja, selo "IA", brilho sutil, texto "Inteligência artificial que monta e revisa seu plano…") → **Próximo treino** (Hoje/Amanhã/dia + rotina + Iniciar) → semana numa linha de 7 pontos (toque abre o sheet do dia) → **Rotinas** em lista com os dias agendados à direita.
- Desktop: duas colunas (Próximo treino + semana | Rotinas); cabeçalhos com a mesma altura para os cards começarem na mesma linha.

## Decisões (sketch 002, variante C2)
- Topo: voltar · nome editável · ícone · ⋮ (Copiar e Excluir rotina saem do fim da tela). Resumo "N exercícios · N séries · ~N min".
- Exercício: foto, nome, **4 × 8** · 60 kg e só um ⋮ (editar, mover para cima/baixo, remover). Tocar na linha abre o ajuste de séries/carga.
- Superset: botão redondo 🔗 **entre** dois exercícios junta num toque; dentro do superset a 🔗 fica laranja e separa. Colchete laranja + etiqueta "Superset · sem descanso entre eles".
- Mapa do corpo mantido como está; Progressão e "Excluir da progressão automática" descem para "Configurações da rotina", no fim.

## Reference Points
Hevy, Strong.

## Sketches

| # | Name | Design Question | Winner | Tags |
|---|------|----------------|--------|------|
| 001 | plano-semanal | Qual estrutura deixa a semana legível e as rotinas em primeiro plano? | **E**: Próximo treino + faixa | layout, plano, semana, rotinas |
| 002 | rotina-editar | Lista de exercícios limpa, superset óbvio e reordenar fácil? | **C2**: menu ⋮ + ícone de superset | rotina, exercicios, superset |
