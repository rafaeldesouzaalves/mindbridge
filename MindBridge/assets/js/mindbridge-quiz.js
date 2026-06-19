/* ================================================================
   MINDBRIDGE — QUIZ DE TRIAGEM EMOCIONAL (JavaScript)
   Organizado em blocos numerados. Cada bloco tem uma
   responsabilidade clara e separada dos demais.

   FLUXO GERAL:
     1. Usuário chega da home (ou entra direto nesta página)
     2. Se vier da home com ?sentimento=X na URL:
          → pré-seleciona a opção correta no Passo 1
          → habilita o botão "Próximo" do Passo 1
          → avança automaticamente para o Passo 2
          → assim o usuário não repete a pergunta que já respondeu
     3. Usuário clica numa opção  → selectOption() registra resposta
     4. Botão "Próximo" é liberado → goTo(step) avança o passo
     5. Passo 8 concluído         → showResult() monta o resultado
     6. JS analisa as 8 respostas → gera tags, insight e cards
        — cada card agora também carrega uma URL real (rec.link),
          renderizada como <a class="rec-action" href="...">
     7. Usuário clica "Refazer"   → restartQuiz() reseta tudo
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
  ============================================================ */
  var todosBotoes = document.querySelectorAll('.opt-btn, .scale-btn');

  todosBotoes.forEach(function (botao) {
    botao.addEventListener('click', function () {
      selectOption(botao);
    });
  });

  function selectOption(botaoClicado) {
    var step = botaoClicado.getAttribute('data-step');
    var val  = botaoClicado.getAttribute('data-val');

    var grupoId = 'optionsStep' + step;
    var grupoEl = document.getElementById(grupoId);

    if (!grupoEl) {
      grupoEl = document.querySelector('[id^="optionsStep' + step + '"]');
    }

    if (grupoEl) {
      grupoEl.querySelectorAll('.opt-btn, .scale-btn').forEach(function (b) {
        b.classList.remove('selected');
      });
    }

    botaoClicado.classList.add('selected');
    respostas['step' + step] = val;

    var btnProximo = document.getElementById('next' + step);
    if (btnProximo) {
      btnProximo.disabled = false;
    }
  }


  /* ============================================================
     3. INTEGRAÇÃO COM A HOME — leitura do parâmetro de URL
  ============================================================ */
  var mapaHomeParaQuiz = {
    ansioso:  'ansioso',
    esgotado: 'esgotado',
    triste:   'triste',
    irritado: 'irritado',
    perdido:  'perdido',
    curioso:  'bem'
  };

  var params          = new URLSearchParams(window.location.search);
  var sentimentoURL   = params.get('sentimento');

  if (sentimentoURL) {
    var valQuiz = mapaHomeParaQuiz[sentimentoURL] || null;

    if (valQuiz) {
      var botaoPasso1 = document.querySelector(
        '#optionsStep1 [data-val="' + valQuiz + '"]'
      );

      if (botaoPasso1) {
        selectOption(botaoPasso1);

        setTimeout(function () {
          goTo(2);
        }, 600);
      }
    }
  }


  /* ============================================================
     4. NAVEGAÇÃO ENTRE PASSOS
  ============================================================ */
  window.goTo = function (numeroPasso) {
    var todosSteps = document.querySelectorAll('.quiz-step');
    todosSteps.forEach(function (step) {
      step.classList.remove('active');
    });

    var stepDestino = document.getElementById('step' + numeroPasso);
    if (stepDestino) {
      stepDestino.classList.add('active');
    }

    var porcentagem = Math.round((numeroPasso / TOTAL_PASSOS) * 100);
    var progressFill = document.getElementById('progressFill');
    if (progressFill) {
      progressFill.style.width = porcentagem + '%';
    }

    var stepCounter = document.getElementById('stepCounter');
    if (stepCounter) {
      stepCounter.textContent = 'Passo ' + numeroPasso + ' de ' + TOTAL_PASSOS;
    }

    var quizContainer = document.getElementById('quizContainer');
    if (quizContainer) {
      quizContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };


  /* ============================================================
     5. EXIBIÇÃO DO RESULTADO
  ============================================================ */
  window.showResult = function () {

    var sentimento  = respostas.step1 || 'bem';
    var duracao     = respostas.step2 || 'dias';
    var intensidade = parseInt(respostas.step3 || '2', 10);
    var sono        = respostas.step4 || 'bom';
    var social      = respostas.step5 || 'conectado';
    var autoestima  = respostas.step6 || 'bem';
    var pensamentos = respostas.step7 || 'nao';
    var necessidade = respostas.step8 || 'tecnicas';

    /* ----------------------------------------------------------
       5a. BANNER DE CRISE
    ---------------------------------------------------------- */
    var crisisBanner = document.getElementById('crisisBanner');
    if (crisisBanner) {
      var mostrarCrise = (pensamentos === 'frequente') || (intensidade >= 5);
      if (mostrarCrise) {
        crisisBanner.classList.remove('hidden');
      }
    }

    /* ----------------------------------------------------------
       5b. CABEÇALHO DO RESULTADO
    ---------------------------------------------------------- */
    var mapaIcones = {
      ansioso:  'ti-wind',
      esgotado: 'ti-battery-low',
      triste:   'ti-droplet',
      irritado: 'ti-flame',
      perdido:  'ti-compass',
      bem:      'ti-leaf'
    };

    var mapaTitulos = {
      ansioso:  'Ansiedade em foco',
      esgotado: 'Sinais de esgotamento',
      triste:   'Tristeza presente',
      irritado: 'Tensão emocional',
      perdido:  'Momento de incerteza',
      bem:      'Explorando com cuidado'
    };

    var mapaDescricoes = {
      ansioso:  'Reconhecer a ansiedade é o primeiro passo. Temos técnicas e pessoas prontas para te apoiar agora.',
      esgotado: 'Burnout e esgotamento são sinais sérios do corpo pedindo atenção. Você chegou ao lugar certo.',
      triste:   'A tristeza merece ser acolhida, não suprimida. Estamos aqui para caminhar com você.',
      irritado: 'Irritação intensa costuma esconder outras emoções. Vamos explorar isso juntos com cuidado.',
      perdido:  'Não saber o que sentir também é um sentimento válido. Podemos ajudar a clarear esse momento.',
      bem:      'Investir em saúde mental quando estamos bem é um dos maiores cuidados que existem.'
    };

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
       5c. TAGS DO PERFIL EMOCIONAL
    ---------------------------------------------------------- */
    var tags = [];

    var labelsSentimento = {
      ansioso:  'Ansiedade',
      esgotado: 'Esgotamento',
      triste:   'Tristeza',
      irritado: 'Irritação',
      perdido:  'Desorientação',
      bem:      'Exploração'
    };
    tags.push({ texto: labelsSentimento[sentimento] || sentimento, cor: '' });

    if (duracao === 'meses') {
      tags.push({ texto: 'Persistente', cor: 'amber' });
    } else if (duracao === 'semanas') {
      tags.push({ texto: 'Recorrente', cor: 'amber' });
    }

    if (intensidade >= 4) {
      tags.push({ texto: 'Alta intensidade', cor: 'red' });
    }

    if (sono !== 'bom') {
      tags.push({ texto: 'Sono afetado', cor: 'amber' });
    }

    if (social === 'isolado' || social === 'evitando') {
      tags.push({ texto: 'Isolamento', cor: '' });
    }

    if (social === 'conflito') {
      tags.push({ texto: 'Conflitos', cor: 'amber' });
    }

    if (autoestima === 'critica' || autoestima === 'vazio') {
      tags.push({ texto: 'Autocrítica', cor: '' });
    }

    if (pensamentos === 'frequente') {
      tags.push({ texto: 'Crise emocional', cor: 'red' });
    }

    var resultTags = document.getElementById('resultTags');
    if (resultTags) {
      resultTags.innerHTML = tags.map(function (tag) {
        return '<span class="result-tag ' + tag.cor + '">' + tag.texto + '</span>';
      }).join('');
    }

    /* ----------------------------------------------------------
       5d. INSIGHT CONTEXTUALIZADO
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
      insightText.textContent =
        insights[sentimento] || 'Estas indicações são um ponto de partida, não um diagnóstico.';
    }

    /* ----------------------------------------------------------
       5e. CARDS DE RECOMENDAÇÃO
       ─────────────────────────────────────────────────────────
       NOVO: cada recomendação agora tem um campo `link`, apontando
       para a página/aba real do site:
         - CVV                → tel:188
         - Técnicas/biblioteca → mindbridge-home.html#biblioteca
         - Profissional        → mindbridge-home.html#profissionais
         - Comunidade           → mindbridge-comunidade.html

       O HTML é renderizado como <a class="rec-action" href="...">
       em vez de <button>, então o clique já navega de verdade.
       Links externos (tel:) abrem direto; links internos
       abrem na mesma aba (sem target="_blank") para manter o
       usuário dentro do fluxo do app.
    ---------------------------------------------------------- */
    var recomendacoes = [];

    /* CRISE: sempre aparece primeiro quando detectada */
    if (pensamentos === 'frequente') {
      recomendacoes.unshift({
        tipo:      '🔴 Prioridade',
        titulo:    'Apoio em crise — CVV 188',
        descricao: 'Se você está em crise, o CVV atende 24h, gratuitamente, com total sigilo. Você merece ajuda agora.',
        acao:      'Ligar agora',
        link:      'tel:188',
        variante:  'urgent'
      });
    }

    /* Técnica imediata: para quem pediu técnicas ou intensidade baixa a média */
    if (necessidade === 'tecnicas' || intensidade <= 3) {
      recomendacoes.push({
        tipo:      'Técnica imediata',
        titulo:    'Respiração 4-7-8',
        descricao: 'Acalma o sistema nervoso em 3 minutos. Ideal para crises de ansiedade e antes de dormir.',
        acao:      'Ver técnica',
        link:      'mindbridge-home.html#biblioteca',
        variante:  'highlight'
      });
    }

    /* Técnica de grounding para ansiedade */
    if (sentimento === 'ansioso' || sentimento === 'perdido') {
      recomendacoes.push({
        tipo:      'Técnica guiada',
        titulo:    'Grounding 5-4-3-2-1',
        descricao: 'Use os 5 sentidos para sair do piloto automático e voltar ao presente agora.',
        acao:      'Praticar agora',
        link:      'mindbridge-home.html#biblioteca',
        variante:  ''
      });
    }

    /* Artigo sobre burnout para esgotamento ou longa duração */
    if (sentimento === 'esgotado' || duracao === 'meses') {
      recomendacoes.push({
        tipo:      'Leitura essencial',
        titulo:    'Sinais de burnout',
        descricao: 'Entenda o que seu corpo tenta te avisar — e como sair desse ciclo com cuidado e intenção.',
        acao:      'Ler artigo',
        link:      'mindbridge-home.html#biblioteca',
        variante:  ''
      });
    }

    /* Relaxamento para sono ruim */
    if (sono !== 'bom') {
      recomendacoes.push({
        tipo:      'Técnica para dormir',
        titulo:    'Relaxamento guiado',
        descricao: 'Um roteiro de 5 min para desacelerar a mente e o corpo antes de dormir.',
        acao:      'Ouvir agora',
        link:      'mindbridge-home.html#biblioteca',
        variante:  ''
      });
    }

    /* Profissional: para quem pediu, intensidade alta ou duração longa */
    if (necessidade === 'profissional' || intensidade >= 4 || duracao === 'meses') {
      recomendacoes.push({
        tipo:      'Profissional',
        titulo:    'Falar com psicólogo',
        descricao: 'Especialistas verificados, atendimento online, sigilo garantido e valores acessíveis.',
        acao:      'Ver profissionais',
        link:      'mindbridge-home.html#profissionais',
        variante:  'highlight'
      });
    }

    /* Comunidade: para quem pediu ou se sente isolado */
    if (necessidade === 'comunidade' || social === 'isolado' || social === 'evitando') {
      recomendacoes.push({
        tipo:      'Comunidade',
        titulo:    'Grupos de apoio',
        descricao: 'Pessoas reais passando pelo mesmo. Sem julgamentos — só apoio genuíno.',
        acao:      'Entrar na comunidade',
        link:      'mindbridge-comunidade.html',
        variante:  ''
      });
    }

    /* Reescrita da autocrítica: para quem se critica muito */
    if (autoestima === 'critica' || autoestima === 'vazio') {
      recomendacoes.push({
        tipo:      'Autoestima',
        titulo:    'Reescrevendo a autocrítica',
        descricao: 'Como notar e suavizar a voz interna mais dura — técnicas de TCC em vídeo curto.',
        acao:      'Ver técnica',
        link:      'mindbridge-home.html#biblioteca',
        variante:  ''
      });
    }

    /* Biblioteca: para quem quer aprender */
    if (necessidade === 'aprender') {
      recomendacoes.push({
        tipo:      'Biblioteca',
        titulo:    'Entendendo emoções',
        descricao: 'Vídeos curtos e artigos para entender o que acontece com você e como lidar.',
        acao:      'Explorar biblioteca',
        link:      'mindbridge-home.html#biblioteca',
        variante:  ''
      });
    }

    /* Fallback: caso nenhuma regra se aplique (não deve ocorrer) */
    if (recomendacoes.length === 0) {
      recomendacoes.push({
        tipo:      'Explorar',
        titulo:    'Biblioteca de técnicas',
        descricao: 'Recursos sobre respiração, mindfulness e autoestima para quem quer aprender.',
        acao:      'Explorar',
        link:      'mindbridge-home.html#biblioteca',
        variante:  'highlight'
      });
    }

    /* Renderiza os 4 primeiros cards no DOM, agora como links reais */
    var recGrid = document.getElementById('recGrid');
    if (recGrid) {
      var html = recomendacoes.slice(0, 4).map(function (rec) {
        var classeCard = 'rec-card' + (rec.variante ? ' ' + rec.variante : '');
        var href        = rec.link || '#';
        /* tel: abre o discador; demais são navegação interna na mesma aba */
        var atributoAlvo = href.indexOf('tel:') === 0 ? '' : '';

        return (
          '<div class="' + classeCard + '">' +
            '<span class="rec-type">'  + rec.tipo      + '</span>' +
            '<p   class="rec-title">'  + rec.titulo    + '</p>' +
            '<p   class="rec-desc">'   + rec.descricao + '</p>' +
            '<a class="rec-action" href="' + href + '"' + atributoAlvo + '>' +
              rec.acao + ' <i class="ti ti-arrow-right"></i>' +
            '</a>' +
          '</div>'
        );
      }).join('');

      recGrid.innerHTML = html;
    }

    /* ----------------------------------------------------------
       5f. TROCA DE VISIBILIDADE
    ---------------------------------------------------------- */
    var todosSteps = document.querySelectorAll('.quiz-step');
    todosSteps.forEach(function (step) {
      step.classList.remove('active');
    });

    var stepCounter = document.getElementById('stepCounter');
    if (stepCounter) {
      stepCounter.style.display = 'none';
    }

    var progressFill = document.getElementById('progressFill');
    if (progressFill) {
      progressFill.style.width = '100%';
    }

    var quizResult = document.getElementById('quizResult');
    if (quizResult) {
      quizResult.classList.add('visible');
    }

    var quizContainer = document.getElementById('quizContainer');
    if (quizContainer) {
      quizContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };


  /* ============================================================
     6. REINICIAR O QUIZ
  ============================================================ */
  window.restartQuiz = function () {

    respostas = {};

    document.querySelectorAll('.opt-btn, .scale-btn').forEach(function (btn) {
      btn.classList.remove('selected');
    });

    for (var i = 1; i <= TOTAL_PASSOS; i++) {
      var btnProximo = document.getElementById('next' + i);
      if (btnProximo) {
        btnProximo.disabled = true;
      }
    }

    var quizResult = document.getElementById('quizResult');
    if (quizResult) {
      quizResult.classList.remove('visible');
    }

    var crisisBanner = document.getElementById('crisisBanner');
    if (crisisBanner) {
      crisisBanner.classList.add('hidden');
    }

    var stepCounter = document.getElementById('stepCounter');
    if (stepCounter) {
      stepCounter.style.display = '';
      stepCounter.textContent = 'Passo 1 de ' + TOTAL_PASSOS;
    }

    var progressFill = document.getElementById('progressFill');
    if (progressFill) {
      progressFill.style.width = '12%';
    }

    var recGrid = document.getElementById('recGrid');
    if (recGrid) {
      recGrid.innerHTML = '';
    }

    var resultTags = document.getElementById('resultTags');
    if (resultTags) {
      resultTags.innerHTML = '';
    }

    var urlLimpa = window.location.pathname;
    window.history.replaceState({}, '', urlLimpa);

    goTo(1);
  };


  /* ============================================================
     7. SOMBRA REFORÇADA NO HEADER AO ROLAR
  ============================================================ */
  var header = document.querySelector('.header');

  function atualizarSombraHeader() {
    if (!header) return;
    if (window.scrollY > 10) {
      header.style.boxShadow = '0 4px 20px rgba(83, 74, 183, 0.16)';
    } else {
      header.style.boxShadow = '';
    }
  }

  window.addEventListener('scroll', atualizarSombraHeader);
  atualizarSombraHeader();


}); /* fim do DOMContentLoaded */