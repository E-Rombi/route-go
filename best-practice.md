Aqui está um guia completo em formato Markdown (MD), estruturado para ser um manual de referência rápido e técnico para implementação de VRPTW (Vehicle Routing Problem with Time Windows) usando o Google OR-Tools.

---

# 🚚 Guia de Melhores Práticas: Google OR-Tools para VRPTW

Este guia compila estratégias essenciais, configurações de performance e "armadilhas" comuns ao resolver Problemas de Roteamento de Veículos com Janelas de Tempo (VRPTW) utilizando o OR-Tools.

---

## 1. Preparação e Modelagem de Dados

A qualidade da solução depende inteiramente de como você alimenta o solver.

### **Use Apenas Inteiros (Integer Only)**

O OR-Tools trabalha internamente com `int64`. Não use `float` para distâncias, custos ou tempo.

* **Dica:** Se precisar de precisão (ex: R$ 10,50 ou 1.5km), multiplique tudo por um fator de escala (100 ou 1000) antes de passar para o solver e divida no final.
* **Exemplo:** 1.5 km  1500 metros.

### **Matriz de Distância/Tempo**

Evite calcular distâncias euclidianas "on-the-fly" dentro do callback.

* **Prática:** Pré-calcule a matriz de distância/tempo e armazene-a na memória (array/vector). O callback deve ser apenas uma busca de índice .
* **Performance:** Para problemas grandes (> 1000 nós), a matriz completa () pode estourar a memória. Nesses casos, considere calcular apenas vizinhos próximos ou usar uma matriz esparsa.

### **Índices vs. Locais**

O OR-Tools usa dois conceitos que confundem iniciantes:

1. **Node Index:** O índice do local na sua matriz de dados.
2. **Manager Index:** O índice interno que o solver usa.

* **Regra:** Sempre use `manager.NodeToIndex(node)` e `manager.IndexToNode(index)` para converter entre os dois mundos.

---

## 2. Configurando Janelas de Tempo (Time Windows)

O VRPTW adiciona a dimensão de "Tempo" ao problema.

### **Dimensão de Tempo (Time Dimension)**

Ao criar a dimensão de tempo:

```python
routing.AddDimension(
    transit_callback_index,
    30,    # "Slack" (Tempo de espera permitido)
    3000,  # "Capacity" (Horizonte total de tempo/turno máximo)
    False, # fix_start_cumul_to_zero
    "Time"
)

```

* **Slack (Folga):** Fundamental para VRPTW. Se o veículo chegar antes da janela abrir, ele precisa "esperar". O parâmetro `slack` define o tempo máximo que ele pode esperar. Se for ilimitado, defina um valor alto.
* **Fix Start to Zero:** Geralmente `False` para permitir que o veículo saia em horários flexíveis, ou `True` se o turno começa exatamente às 08:00 (representado como 0).

### **Service Time (Tempo de Atendimento)**

Não esqueça que a visita consome tempo, não apenas o deslocamento.

* **Implementação:** Inclua o tempo de serviço no seu `transit_callback` ou adicione-o diretamente ao acumulado do nó.
* *Fórmula:* Custo do arco  = Tempo de Viagem  + Tempo de Serviço em .



---

## 3. Estratégias de Busca (Solver Parameters)

A escolha da heurística define a velocidade vs. qualidade da solução.

### **Primeira Solução (First Solution Strategy)**

O solver precisa de uma solução válida inicial para começar a otimizar.

* `PATH_CHEAPEST_ARC`: Geralmente o mais rápido e eficiente para roteamento.
* `CHRISTOFIDES`: Bom para problemas métricos, mas pode ser lento.
* `PARALLEL_CHEAPEST_INSERTION`: Tende a produzir soluções iniciais "mais bonitas" visualmente.
* **Recomendação:** Comece com `PATH_CHEAPEST_ARC`.

### **Metaheurísticas (Local Search)**

Depois de achar a primeira solução, o solver tenta melhorá-la.

* `GUIDED_LOCAL_SEARCH` (GLS): **O padrão ouro para roteamento.** Ele escapa de mínimos locais penalizando arcos muito usados.
* `TABU_SEARCH`: Boa alternativa se o GLS estiver lento.
* `GREEDY_DESCENT`: Rápido, mas para em mínimos locais. Use apenas para debug ou tempo real crítico.

### **Limites de Tempo (Time Limits)**

O OR-Tools pode rodar para sempre tentando melhorar 0.01%.

* Sempre defina um `search_parameters.time_limit`.
* Para dev/testes: 2 a 10 segundos.
* Para produção: 30 a 60 segundos geralmente atingem 98% da otimalidade.

---

## 4. Lidando com Infactibilidade (Infeasibility)

O pesadelo do VRPTW é o solver retornar "Nenhuma solução encontrada" sem explicar o porquê.

### **Sempre Permita "Dropar" Nós (Penalty)**

Nunca obrigue o solver a visitar todos os nós rigidamente, a menos que tenha certeza absoluta da viabilidade.

* **Prática:** Use `routing.AddDisjunction([node_index], penalty)`.
* **Lógica:** Se for impossível visitar o nó devido à janela de tempo, o solver irá ignorá-lo e pagar a penalidade. Isso garante que você receba uma rota (mesmo que parcial) e saiba quais clientes ficaram de fora.
* **Valor da Penalidade:** Deve ser maior que qualquer custo de viagem possível, mas menor que infinito.

### **Log de Busca**

Ative o log para entender o progresso:
`search_parameters.log_search = True`
Isso mostra se o solver está preso ou se está convergindo rapidamente.

---

## 5. Dicas Avançadas de Performance

### **Escalabilidade**

* **Até 100 nós:** Resolve em milissegundos.
* **Até 1000 nós:** Resolve em segundos/minutos.
* **Acima de 2000 nós:** O modelo exato começa a sofrer.
* *Solução:* Use clusterização (ex: K-Means ou DBSCAN) para dividir o problema em sub-regiões menores e resolva cada uma independentemente.



### **Perfis de Veículos (Frota Heterogênea)**

Se você tem caminhões e motos:

* Configure múltiplos callbacks de trânsito.
* Associe cada veículo a um callback específico usando `routing.SetArcCostEvaluatorOfVehicle()`.

### **Soft Constraints (Restrições Suaves)**

Em vez de proibir algo (Hard Constraint), penalize.

* *Exemplo:* É melhor chegar 10 minutos atrasado do que não entregar.
* Use `SetCumulVarSoftUpperBound` na dimensão de tempo. Você define um limite "ideal" e uma penalidade por unidade de tempo excedida.

---

## Resumo da Configuração Ideal (Template Mental)

| Parâmetro | Configuração Recomendada | Por quê? |
| --- | --- | --- |
| **First Solution** | `PATH_CHEAPEST_ARC` | Rápido e bom ponto de partida. |
| **Local Search** | `GUIDED_LOCAL_SEARCH` | Melhor convergência para rotas. |
| **Time Limit** | 10s - 60s | Retornos decrescentes após 1 min. |
| **Units** | Inteiros (Metros/Segundos) | Precisão e requisito do solver. |
| **Dropping** | `AddDisjunction` com penalidade alta | Evita falha total se o problema for inviável. |

---

### Gostaria que eu gerasse um exemplo de código em Python ou Go aplicando essas configurações para um cenário de VRPTW?