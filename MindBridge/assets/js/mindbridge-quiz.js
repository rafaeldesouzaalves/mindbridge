/* ================================================================
   MINDBRIDGE — QUIZ DE TRIAGEM EMOCIONAL (JavaScript)
   Organizado em blocos numerados. Cada bloco tem uma
   responsabilidade clara e separada dos demais.

   FLUXO GERAL:
     1. Usuário clica numa opção  → selectOption() registra resposta
     2. Botão "Próximo" é liberado → goTo(step) avança o passo
     3. Passo 8 concluído         → showResult() monta o resultado
     4. JS analisa as 8 respostas → gera tags, insight e cards
     5. Usuário clica "Refazer"   → restartQuiz() reseta tudo
================================================================ */

document.addEventListener('DOMContentLoaded', function () {


    /* ============================================================
       1. ESTADO GLOBAL DO QUIZ
       Um objeto simples que armazena a resposta de cada passo.
       As chaves são "step1" a "step8" e os valores são os
       data-val dos botões clicados (ex: { step1: "ansioso" }).
    ============================================================ */
    var respostas = {};
  
    /* Número total de passos — usado para calcular a barra de progresso */
    var TOTAL_PASSOS = 8;
  
  
    /* ============================================================
       2. SELEÇÃO DE OPÇÕES
       Ao clicar num botão de opção (opt-btn ou scale-btn), esta
       função:
         a) Remove .selected de todos os botões daquele grupo
         b) Adiciona .selected no botão clicado
         c) Registra a resposta em respostas[step]
         d) Habilita o botão "Próximo" do passo atual
    ============================================================ */
  
    /* Seleciona todos os botões de opção e adiciona o listener */
    var todosBotoes = document.querySelectorAll('.opt-btn, .scale-btn');
  
    todosBotoes.forEach(function (botao) {
      botao.addEventListener('click', function () {
        selectOption(botao);
      });
    });
  
    /**
     * Registra a escolha do usuário e habilita a navegação.
     * @param {HTMLButtonElement} botaoClicado - O botão que foi clicado
     */
    function selectOption(botaoClicado) {
      var step = botaoClicado.getAttribute('data-step');   /* ex: "3" */
      var val  = botaoClicado.getAttribute('data-val');    /* ex: "ansioso" */
  
      /* Remove .selected de todos os botões do mesmo grupo (mesmo step) */
      var grupoId = 'optionsStep' + step;
      var grupoEl = document.getElementById(grupoId);
  
      /* Para o step 3 (escala) o grupo tem id diferente */
      if (!grupoEl) {
        grupoEl = document.querySelector('[id^="optionsStep' + step + '"]');
      }
  
      if (grupoEl) {
        grupoEl.querySelectorAll('.opt-btn, .scale-btn').forEach(function (b) {
          b.classList.remove('selected');
        });
      }
  
      /* Marca o botão clicado como selecionado */
      botaoClicado.classList.add('selected');
  
      /* Salva a resposta no objeto de estado */
      respostas['step' + step] = val;
  
      /* Habilita o botão "Próximo" do passo atual */
      var btnProximo = document.getElementById('next' + step);
      if (btnProximo) {
        btnProximo.disabled = false;
      }
    }
  
  
    /* ============================================================
       3. NAVEGAÇÃO ENTRE PASSOS
       goTo(numeroPasso) é chamada pelos botões "Próximo" e "Voltar"
       via atributo onclick no HTML.
  
       Ela:
         a) Esconde o passo atual (remove .active)
         b) Exibe o passo destino (adiciona .active)
         c) Atualiza a barra de progresso e o contador textual
         d) Faz scroll suave para o topo do container
    ============================================================ */
  
    /**
     * Navega para um passo específico do quiz.
     * @param {number} numeroPasso - O número do step destino (1–8)
     */
    window.goTo = function (numeroPasso) {
      /* Esconde todos os passos */
      var todosSteps = document.querySelectorAll('.quiz-step');
      todosSteps.forEach(function (step) {
        step.classList.remove('active');
      });
  
      /* Exibe apenas o passo destino */
      var stepDestino = document.getElementById('step' + numeroPasso);
      if (stepDestino) {
        stepDestino.classList.add('active');
      }
  
      /* Atualiza a barra de progresso:
         passo 1 = 12%, passo 8 = 100% (escala proporcional) */
      var porcentagem = Math.round((numeroPasso / TOTAL_PASSOS) * 100);
      var progressFill = document.getElementById('progressFill');
      if (progressFill) {
        progressFill.style.width = porcentagem + '%';
      }
  
      /* Atualiza o contador textual ("Passo X de 8") */
      var stepCounter = document.getElementById('stepCounter');
      if (stepCounter) {
        stepCounter.textContent = 'Passo ' + numeroPasso + ' de ' + TOTAL_PASSOS;
      }
  
      /* Scroll suave para o topo do container do quiz */
      var quizContainer = document.getElementById('quizContainer');
      if (quizContainer) {
        quizContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    };
  
  
    /* ============================================================
       4. EXIBIÇÃO DO RESULTADO
       showResult() é chamada quando o usuário clica em
       "Ver meu resultado" (botão do passo 8).
  
       Ela lê as 8 respostas armazenadas em `respostas` e:
         a) Decide se exibe o banner de crise
         b) Monta o ícone e texto personalizados do cabeçalho
         c) Gera as tags do perfil emocional
         d) Seleciona o insight contextualizado
         e) Monta os cards de recomendação (até 4)
         f) Esconde o quiz e exibe a seção de resultado
    ============================================================ */
  
    /**
     * Monta e exibe a seção de resultado com base nas respostas coletadas.
     * Chamada via onclick no HTML (window.showResult).
     */
    window.showResult = function () {
  
      /* Lê todas as respostas (com fallbacks seguros) */
      var sentimento  = respostas.step1 || 'bem';
      var duracao     = respostas.step2 || 'dias';
      var intensidade = parseInt(respostas.step3 || '2', 10);
      var sono        = respostas.step4 || 'bom';
      var social      = respostas.step5 || 'conectado';
      var autoestima  = respostas.step6 || 'bem';
      var pensamentos = respostas.step7 || 'nao';
      var necessidade = respostas.step8 || 'tecnicas';
  
      /* ----------------------------------------------------------
         4a. BANNER DE CRISE
         Exibe quando: pensamentos frequentes OU intensidade máxima.
         Adiciona a classe .visible que remove o display:none do CSS.
      ---------------------------------------------------------- */
      var crisisBanner = document.getElementById('crisisBanner');
      if (crisisBanner) {
        var mostrarCrise = (pensamentos === 'frequente') || (intensidade >= 5);
        if (mostrarCrise) {
          crisisBanner.classList.remove('hidden');
        }
      }
  
      /* ----------------------------------------------------------
         4b. CABEÇALHO DO RESULTADO
         Ícone, título e descrição personalizados por sentimento.
      ---------------------------------------------------------- */
  
      /* Mapa: sentimento → ícone Tabler (classe CSS) */
      var mapaIcones = {
        ansioso:  'ti-wind',
        esgotado: 'ti-battery-low',
        triste:   'ti-droplet',
        irritado: 'ti-flame',
        perdido:  'ti-compass',
        bem:      'ti-leaf'
      };
  
      /* Mapa: sentimento → título do resultado */
      var mapaTitulos = {
        ansioso:  'Ansiedade em foco',
        esgotado: 'Sinais de esgotamento',
        triste:   'Tristeza presente',
        irritado: 'Tensão emocional',
        perdido:  'Momento de incerteza',
        bem:      'Explorando com cuidado'
      };
  
      /* Mapa: sentimento → descrição do resultado */
      var mapaDescricoes = {
        ansioso:  'Reconhecer a ansiedade é o primeiro passo. Temos técnicas e pessoas prontas para te apoiar agora.',
        esgotado: 'Burnout e esgotamento são sinais sérios do corpo pedindo atenção. Você chegou ao lugar certo.',
        triste:   'A tristeza merece ser acolhida, não suprimida. Estamos aqui para caminhar com você.',
        irritado: 'Irritação intensa costuma esconder outras emoções. Vamos explorar isso juntos com cuidado.',
        perdido:  'Não saber o que sentir também é um sentimento válido. Podemos ajudar a clarear esse momento.',
        bem:      'Investir em saúde mental quando estamos bem é um dos maiores cuidados que existem.'
      };
  
      /* Atualiza o DOM com os valores personalizados */
      var resultIcon = document.getElementById('resultIcon');
      if (resultIcon) {
        var icone = mapaIcones[sentimento] || 'ti-heart';
        resultIcon.innerHTML = '<i class="ti ' + icone + '"></i>';
      }
  
      var resultTitle = document.getElementById('resultTitle');
      if (resultTitle) {
        resultTitle.textContent = mapaTitulos[sentimento] || 'Resultado personalizado';
      }
  
      var resultDesc = document.getElementById('resultDesc');
      if (resultDesc) {
        resultDesc.textContent = mapaDescricoes[sentimento] || 'Preparamos indicações para você.';
      }
  
      /* ----------------------------------------------------------
         4c. TAGS DO PERFIL EMOCIONAL
         Cada tag é uma "etiqueta" visual que resume um aspecto
         do perfil detectado. As cores codificam gravidade:
           - padrão (roxo): sentimento base
           - amber: atenção moderada (duração, sono)
           - red: risco ou urgência (intensidade, crise)
           - green: aspecto positivo
      ---------------------------------------------------------- */
      var tags = [];
  
      /* Tag 1: sentimento principal (sempre presente) */
      var labelsSentimento = {
        ansioso:  'Ansiedade',
        esgotado: 'Esgotamento',
        triste:   'Tristeza',
        irritado: 'Irritação',
        perdido:  'Desorientação',
        bem:      'Exploração'
      };
      tags.push({ texto: labelsSentimento[sentimento] || sentimento, cor: '' });
  
      /* Tag 2: duração (atenção para semanas ou meses) */
      if (duracao === 'meses') {
        tags.push({ texto: 'Persistente', cor: 'amber' });
      } else if (duracao === 'semanas') {
        tags.push({ texto: 'Recorrente', cor: 'amber' });
      }
  
      /* Tag 3: intensidade alta */
      if (intensidade >= 4) {
        tags.push({ texto: 'Alta intensidade', cor: 'red' });
      }
  
      /* Tag 4: sono afetado */
      if (sono !== 'bom') {
        tags.push({ texto: 'Sono afetado', cor: 'amber' });
      }
  
      /* Tag 5: isolamento social */
      if (social === 'isolado' || social === 'evitando') {
        tags.push({ texto: 'Isolamento', cor: '' });
      }
  
      /* Tag 6: conflitos interpessoais */
      if (social === 'conflito') {
        tags.push({ texto: 'Conflitos', cor: 'amber' });
      }
  
      /* Tag 7: autocrítica severa */
      if (autoestima === 'critica' || autoestima === 'vazio') {
        tags.push({ texto: 'Autocrítica', cor: '' });
      }
  
      /* Tag 8: pensamentos em crise */
      if (pensamentos === 'frequente') {
        tags.push({ texto: 'Crise emocional', cor: 'red' });
      }
  
      /* Renderiza as tags no DOM */
      var resultTags = document.getElementById('resultTags');
      if (resultTags) {
        resultTags.innerHTML = tags.map(function (tag) {
          return '<span class="result-tag ' + tag.cor + '">' + tag.texto + '</span>';
        }).join('');
      }
  
      /* ----------------------------------------------------------
         4d. INSIGHT CONTEXTUALIZADO
         Texto educativo e empático sobre o perfil detectado.
         Evita linguagem de diagnóstico; posiciona como orientação.
      ---------------------------------------------------------- */
      var insights = {
        ansioso:  'Ansiedade frequente pode indicar que seu sistema nervoso está em modo de alerta constante. Técnicas de respiração e apoio profissional fazem uma diferença real nesse processo.',
        esgotado: 'Esgotamento acumulado é um sinal de que você foi além dos seus limites por muito tempo. Recuperar energia exige mais do que descanso — exige cuidado intencional com você mesmo.',
        triste:   'Tristeza que persiste merece atenção. Falar com alguém — seja um profissional ou uma comunidade — alivia muito o peso que vem com esse sentimento.',
        irritado: 'Irritação constante costuma ser ansiedade ou estresse se expressando de outra forma. O corpo e a mente pedem atenção quando chegamos nesse ponto.',
        perdido:  'Sentir-se emocionalmente perdido é mais comum do que parece, especialmente em momentos de transição. Apoio externo ajuda a enxergar o caminho com mais clareza.',
        bem:      'Cuidar da saúde mental preventivamente é um ato profundo de amor-próprio. Você está no caminho certo ao explorar isso agora.'
      };
  
      var insightText = document.getElementById('insightText');
      if (insightText) {
        insightText.textContent = insights[sentimento] || 'Estas indicações são um ponto de partida, não um diagnóstico.';
      }
  
      /* ----------------------------------------------------------
         4e. CARDS DE RECOMENDAÇÃO
         O JS monta um array de recomendações e depois renderiza
         os 4 primeiros como cards no DOM.
  
         Critérios de seleção:
           - "tecnicas" → técnicas imediatas de respiração/grounding
           - sentimento ansioso → técnica 5-4-3-2-1
           - esgotado ou meses → artigo sobre burnout
           - sono ruim → relaxamento guiado para dormir
           - profissional ou intensidade ≥ 4 → indicação de psicólogo
           - comunidade ou isolamento → grupos de apoio
           - pensamentos frequentes → CVV (urgente, sempre primeiro)
           - aprender → biblioteca de técnicas
      ---------------------------------------------------------- */
      var recomendacoes = [];
  
      /* CRISE: sempre aparece primeiro quando detectada */
      if (pensamentos === 'frequente') {
        recomendacoes.unshift({
          tipo: '🔴 Prioridade',
          titulo: 'Apoio em crise — CVV 188',
          descricao: 'Se você está em crise, o CVV atende 24h, gratuitamente, com total sigilo. Você merece ajuda agora.',
          acao: 'Ligar agora',
          variante: 'urgent'
        });
      }
  
      /* Técnica imediata: para quem pediu técnicas ou intensidade baixa a média */
      if (necessidade === 'tecnicas' || intensidade <= 3) {
        recomendacoes.push({
          tipo: 'Técnica imediata',
          titulo: 'Respiração 4-7-8',
          descricao: 'Acalma o sistema nervoso em 3 minutos. Ideal para crises de ansiedade e antes de dormir.',
          acao: 'Ver técnica',
          variante: 'highlight'
        });
      }
  
      /* Técnica de grounding para ansiedade */
      if (sentimento === 'ansioso' || sentimento === 'perdido') {
        recomendacoes.push({
          tipo: 'Técnica guiada',
          titulo: 'Grounding 5-4-3-2-1',
          descricao: 'Use os 5 sentidos para sair do piloto automático e voltar ao presente agora.',
          acao: 'Praticar agora',
          variante: ''
        });
      }
  
      /* Artigo sobre burnout para esgotamento ou longa duração */
      if (sentimento === 'esgotado' || duracao === 'meses') {
        recomendacoes.push({
          tipo: 'Leitura essencial',
          titulo: 'Sinais de burnout',
          descricao: 'Entenda o que seu corpo tenta te avisar — e como sair desse ciclo com cuidado e intenção.',
          acao: 'Ler artigo',
          variante: ''
        });
      }
  
      /* Relaxamento para sono ruim */
      if (sono !== 'bom') {
        recomendacoes.push({
          tipo: 'Técnica para dormir',
          titulo: 'Relaxamento guiado',
          descricao: 'Um roteiro de 5 min para desacelerar a mente e o corpo antes de dormir.',
          acao: 'Ouvir agora',
          variante: ''
        });
      }
  
      /* Profissional: para quem pediu, intensidade alta ou duração longa */
      if (necessidade === 'profissional' || intensidade >= 4 || duracao === 'meses') {
        recomendacoes.push({
          tipo: 'Profissional',
          titulo: 'Falar com psicólogo',
          descricao: 'Especialistas verificados, atendimento online, sigilo garantido e valores acessíveis.',
          acao: 'Ver profissionais',
          variante: 'highlight'
        });
      }
  
      /* Comunidade: para quem pediu ou se sente isolado */
      if (necessidade === 'comunidade' || social === 'isolado' || social === 'evitando') {
        recomendacoes.push({
          tipo: 'Comunidade',
          titulo: 'Grupos de apoio',
          descricao: 'Pessoas reais passando pelo mesmo. Sem julgamentos — só apoio genuíno.',
          acao: 'Entrar na comunidade',
          variante: ''
        });
      }
  
      /* Reescrita da autocrítica: para quem se critica muito */
      if (autoestima === 'critica' || autoestima === 'vazio') {
        recomendacoes.push({
          tipo: 'Autoestima',
          titulo: 'Reescrevendo a autocrítica',
          descricao: 'Como notar e suavizar a voz interna mais dura — técnicas de TCC em vídeo curto.',
          acao: 'Ver técnica',
          variante: ''
        });
      }
  
      /* Biblioteca: para quem quer aprender */
      if (necessidade === 'aprender') {
        recomendacoes.push({
          tipo: 'Biblioteca',
          titulo: 'Entendendo emoções',
          descricao: 'Vídeos curtos e artigos para entender o que acontece com você e como lidar.',
          acao: 'Explorar biblioteca',
          variante: ''
        });
      }
  
      /* Fallback: caso nenhuma regra se aplique (não deve ocorrer) */
      if (recomendacoes.length === 0) {
        recomendacoes.push({
          tipo: 'Explorar',
          titulo: 'Biblioteca de técnicas',
          descricao: 'Recursos sobre respiração, mindfulness e autoestima para quem quer aprender.',
          acao: 'Explorar',
          variante: 'highlight'
        });
      }
  
      /* Renderiza os 4 primeiros cards no DOM */
      var recGrid = document.getElementById('recGrid');
      if (recGrid) {
        var html = recomendacoes.slice(0, 4).map(function (rec) {
          var classeCard = 'rec-card' + (rec.variante ? ' ' + rec.variante : '');
          return (
            '<div class="' + classeCard + '">' +
              '<span class="rec-type">'  + rec.tipo     + '</span>' +
              '<p   class="rec-title">'  + rec.titulo   + '</p>' +
              '<p   class="rec-desc">'   + rec.descricao + '</p>' +
              '<button class="rec-action">' + rec.acao + ' <i class="ti ti-arrow-right"></i></button>' +
            '</div>'
          );
        }).join('');
  
        recGrid.innerHTML = html;
      }
  
      /* ----------------------------------------------------------
         4f. TROCA DE VISIBILIDADE
         Esconde todos os passos e exibe a seção de resultado.
      ---------------------------------------------------------- */
      var todosSteps = document.querySelectorAll('.quiz-step');
      todosSteps.forEach(function (step) {
        step.classList.remove('active');
      });
  
      /* Esconde o contador de passo */
      var stepCounter = document.getElementById('stepCounter');
      if (stepCounter) {
        stepCounter.style.display = 'none';
      }
  
      /* Preenche a barra de progresso completamente (100%) */
      var progressFill = document.getElementById('progressFill');
      if (progressFill) {
        progressFill.style.width = '100%';
      }
  
      /* Exibe a seção de resultado */
      var quizResult = document.getElementById('quizResult');
      if (quizResult) {
        quizResult.classList.add('visible');
      }
  
      /* Scroll para o topo do resultado */
      var quizContainer = document.getElementById('quizContainer');
      if (quizContainer) {
        quizContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    };
  
  
    /* ============================================================
       5. REINICIAR O QUIZ
       restartQuiz() é chamada pelo botão "Refazer o quiz".
  
       Ela:
         a) Limpa o objeto de respostas
         b) Remove .selected de todos os botões
         c) Desabilita todos os botões "Próximo"
         d) Esconde o resultado e o banner de crise
         e) Restaura o contador e a barra de progresso
         f) Exibe o passo 1
    ============================================================ */
  
    /**
     * Reinicia o quiz do zero, limpando estado e DOM.
     * Chamada via onclick no HTML (window.restartQuiz).
     */
    window.restartQuiz = function () {
  
      /* Limpa todas as respostas salvas */
      respostas = {};
  
      /* Remove .selected de todos os botões de opção */
      document.querySelectorAll('.opt-btn, .scale-btn').forEach(function (btn) {
        btn.classList.remove('selected');
      });
  
      /* Desabilita todos os botões "Próximo" (voltam ao estado inicial) */
      for (var i = 1; i <= TOTAL_PASSOS; i++) {
        var btnProximo = document.getElementById('next' + i);
        if (btnProximo) {
          btnProximo.disabled = true;
        }
      }
  
      /* Esconde o resultado */
      var quizResult = document.getElementById('quizResult');
      if (quizResult) {
        quizResult.classList.remove('visible');
      }
  
      /* Esconde o banner de crise (volta ao estado oculto) */
      var crisisBanner = document.getElementById('crisisBanner');
      if (crisisBanner) {
        crisisBanner.classList.add('hidden');
      }
  
      /* Restaura o contador textual */
      var stepCounter = document.getElementById('stepCounter');
      if (stepCounter) {
        stepCounter.style.display = '';
        stepCounter.textContent = 'Passo 1 de ' + TOTAL_PASSOS;
      }
  
      /* Restaura a barra de progresso para o início */
      var progressFill = document.getElementById('progressFill');
      if (progressFill) {
        progressFill.style.width = '12%';
      }
  
      /* Limpa os cards de recomendação gerados anteriormente */
      var recGrid = document.getElementById('recGrid');
      if (recGrid) {
        recGrid.innerHTML = '';
      }
  
      /* Limpa as tags do perfil */
      var resultTags = document.getElementById('resultTags');
      if (resultTags) {
        resultTags.innerHTML = '';
      }
  
      /* Volta para o passo 1 */
      goTo(1);
    };
  
  
    /* ============================================================
       6. SOMBRA REFORÇADA NO HEADER AO ROLAR
       Mesma lógica do mindbridge-home.js: adiciona sombra extra
       ao header quando o usuário já rolou além do topo, dando
       sensação de profundidade e separação do conteúdo.
    ============================================================ */
  
    var header = document.querySelector('.header');
  
    function atualizarSombraHeader() {
      if (!header) return;
      if (window.scrollY > 10) {
        header.style.boxShadow = '0 4px 20px rgba(83, 74, 183, 0.16)';
      } else {
        header.style.boxShadow = ''; /* restaura a sombra padrão do CSS */
      }
    }
  
    window.addEventListener('scroll', atualizarSombraHeader);
    atualizarSombraHeader(); /* executa uma vez ao carregar a página */
  
  
  }); /* fim do DOMContentLoaded */