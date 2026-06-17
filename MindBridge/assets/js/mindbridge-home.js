/* ================================================================
   MINDBRIDGE — HOME (JavaScript)
   Cada bloco abaixo controla uma interação específica da página.
   Lemos o DOM uma vez no topo e usamos eventos para reagir
   às ações do usuário.
================================================================ */

document.addEventListener('DOMContentLoaded', function () {

  /* ============================================================
     1. MENU MOBILE (hambúrguer)
     Ao clicar no botão, abre/fecha a lista de links no celular.
  ============================================================= */
  const navToggle = document.getElementById('navToggle');
  const navLinks = document.getElementById('navLinks');

  if (navToggle && navLinks) {
    navToggle.addEventListener('click', function () {
      const aberto = navLinks.classList.toggle('aberto');
      navToggle.classList.toggle('aberto', aberto);
      // Atualiza o atributo de acessibilidade (leitores de tela)
      navToggle.setAttribute('aria-expanded', aberto ? 'true' : 'false');
    });

    // Fecha o menu automaticamente quando o usuário clica em um link
    navLinks.querySelectorAll('a').forEach(function (link) {
      link.addEventListener('click', function () {
        navLinks.classList.remove('aberto');
        navToggle.classList.remove('aberto');
        navToggle.setAttribute('aria-expanded', 'false');
      });
    });
  }


  /* ============================================================
     2. SOMBRA REFORÇADA NO HEADER AO ROLAR A PÁGINA
     Dá uma sensação de profundidade extra quando o usuário
     já não está mais no topo da página.
  ============================================================= */
  const header = document.querySelector('.header');

  function atualizarSombraHeader() {
    if (!header) return;
    if (window.scrollY > 10) {
      header.style.boxShadow = '0 4px 20px rgba(83, 74, 183, 0.16)';
    } else {
      header.style.boxShadow = ''; // volta para a sombra padrão definida no CSS
    }
  }

  window.addEventListener('scroll', atualizarSombraHeader);
  atualizarSombraHeader(); // executa uma vez ao carregar a página


  /* ============================================================
     3. ANIMAÇÃO "REVEAL" — elementos aparecem suavemente
     conforme entram na tela durante o scroll.
     Usamos IntersectionObserver, que é mais performático
     do que calcular posição de scroll manualmente.
  ============================================================= */
  const elementosReveal = document.querySelectorAll('.reveal');

  if ('IntersectionObserver' in window && elementosReveal.length) {
    const observer = new IntersectionObserver(function (entradas) {
      entradas.forEach(function (entrada) {
        if (entrada.isIntersecting) {
          entrada.target.classList.add('ativo');
          observer.unobserve(entrada.target); // anima só uma vez
        }
      });
    }, { threshold: 0.15 });

    elementosReveal.forEach(function (el) {
      observer.observe(el);
    });
  } else {
    // Navegadores muito antigos sem suporte: mostra tudo direto
    elementosReveal.forEach(function (el) {
      el.classList.add('ativo');
    });
  }


  /* ============================================================
     4. QUIZ DE TRIAGEM EMOCIONAL
     Ao clicar numa opção, mostramos uma mensagem de resultado
     personalizada e destacamos o botão escolhido.
  ============================================================= */
  const quizOpcoes = document.getElementById('quizOpcoes');
  const quizPergunta = document.getElementById('quizPergunta');
  const quizResultado = document.getElementById('quizResultado');
  const quizResultadoTexto = document.getElementById('quizResultadoTexto');
  const quizRefazer = document.getElementById('quizRefazer');

  // Mensagem de acolhimento para cada estado emocional escolhido
  const mensagensQuiz = {
    ansioso: 'Sentir ansiedade é mais comum do que parece. Preparamos técnicas de respiração e profissionais especializados para te ajudar agora.',
    esgotado: 'O esgotamento merece atenção. Vamos te mostrar recursos sobre burnout e formas de recuperar sua energia.',
    triste: 'Está tudo bem não estar bem. Reunimos apoio emocional e uma comunidade pronta para te ouvir.',
    irritado: 'A irritação às vezes esconde um cansaço maior. Temos técnicas de regulação emocional que podem ajudar.',
    perdido: 'Não saber por onde começar também é um passo. Vamos te indicar o caminho mais simples para você.',
    curioso: 'Que bom ter você por aqui! Explore nossa biblioteca de técnicas e conheça a comunidade com calma.'
  };

  if (quizOpcoes) {
    quizOpcoes.querySelectorAll('.quiz-btn').forEach(function (botao) {
      botao.addEventListener('click', function () {
        const chave = botao.getAttribute('data-resultado');

        // Marca visualmente a opção escolhida
        quizOpcoes.querySelectorAll('.quiz-btn').forEach(function (b) {
          b.classList.remove('selecionado');
        });
        botao.classList.add('selecionado');

        // Troca o texto do resultado de acordo com a escolha
        quizResultadoTexto.textContent = mensagensQuiz[chave] || mensagensQuiz.curioso;

        // Pequeno delay para o usuário ver o botão selecionado antes da troca
        setTimeout(function () {
          quizPergunta.style.display = 'none';
          quizResultado.classList.add('visivel');
        }, 350);
      });
    });
  }

  // Botão "Refazer o quiz" volta para a pergunta inicial
  if (quizRefazer) {
    quizRefazer.addEventListener('click', function () {
      quizResultado.classList.remove('visivel');
      quizPergunta.style.display = 'block';
      quizOpcoes.querySelectorAll('.quiz-btn').forEach(function (b) {
        b.classList.remove('selecionado');
      });
    });
  }


  /* ============================================================
     5. ABRAÇO VIRTUAL (botão de apoio nos cards da comunidade)
     Ao clicar, incrementa o contador, muda o visual do botão
     para "enviado" e mostra um toast de confirmação.
  ============================================================= */
  document.querySelectorAll('.btn-abraco').forEach(function (botao) {
    botao.addEventListener('click', function () {
      // Evita múltiplos cliques no mesmo card
      if (botao.classList.contains('enviado')) return;

      const contador = botao.querySelector('.contador-abraco');
      if (contador) {
        // Extrai o número de dentro dos parênteses, ex: "(3)" -> 3
        const numeroAtual = parseInt(contador.textContent.replace(/\D/g, ''), 10) || 0;
        contador.textContent = '(' + (numeroAtual + 1) + ')';
      }

      botao.classList.add('enviado');
      botao.querySelector('i').className = 'ti ti-heart-filled';

      mostrarToast('Abraço virtual enviado! 💜');
    });
  });


  /* ============================================================
     6. RESPONDER MENSAGENS NA COMUNIDADE
     Permite digitar uma mensagem de apoio e "publicá-la"
     logo abaixo, sem precisar recarregar a página.
  ============================================================= */
  document.querySelectorAll('.comunidade-card').forEach(function (card) {
    const input = card.querySelector('.card-resposta input');
    const botaoEnviar = card.querySelector('.card-resposta button');
    const listaRespostas = card.querySelector('.respostas-lista');

    function enviarResposta() {
      const texto = input.value.trim();
      if (texto === '') return; // não publica mensagem vazia

      const respostaEl = document.createElement('div');
      respostaEl.className = 'resposta-enviada';
      respostaEl.innerHTML = '<strong>Você:</strong> ' + escaparHTML(texto);

      listaRespostas.appendChild(respostaEl);
      input.value = '';
      input.focus();

      mostrarToast('Mensagem de apoio enviada!');
    }

    if (botaoEnviar) {
      botaoEnviar.addEventListener('click', enviarResposta);
    }

    // Permite enviar apertando Enter, sem precisar clicar no botão
    if (input) {
      input.addEventListener('keydown', function (evento) {
        if (evento.key === 'Enter') {
          evento.preventDefault();
          enviarResposta();
        }
      });
    }
  });

  // Função simples para evitar que o texto digitado pelo usuário
  // seja interpretado como HTML (proteção básica contra injeção)
  function escaparHTML(texto) {
    const div = document.createElement('div');
    div.textContent = texto;
    return div.innerHTML;
  }


  /* ============================================================
     7. BOTÃO "VOLTAR AO TOPO"
     Aparece só depois que o usuário rola a página.
  ============================================================= */
  const btnTopo = document.getElementById('btnTopo');

  if (btnTopo) {
    window.addEventListener('scroll', function () {
      if (window.scrollY > 400) {
        btnTopo.classList.add('visivel');
      } else {
        btnTopo.classList.remove('visivel');
      }
    });

    btnTopo.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }


  /* ============================================================
     8. TOAST — pequena notificação flutuante de feedback
  ============================================================= */
  const toast = document.getElementById('toast');
  const toastTexto = document.getElementById('toastTexto');
  let toastTimeout; // guarda o temporizador para poder cancelar/reiniciar

  function mostrarToast(mensagem) {
    if (!toast) return;
    toastTexto.textContent = mensagem;
    toast.classList.add('visivel');

    clearTimeout(toastTimeout); // evita que toasts se sobreponham
    toastTimeout = setTimeout(function () {
      toast.classList.remove('visivel');
    }, 2800);
  }


  /* ============================================================
     9. AUTO-SCROLL DA FAIXA DE COMUNIDADE
     A faixa de posts rola sozinha, bem lentamente, para a direita.
     Para automaticamente quando o usuário passa o mouse ou toca
     (para ele poder ler com calma ou arrastar manualmente),
     e retoma sozinha pouco depois de soltar.
  ============================================================= */
  const comunidadeCards = document.getElementById('comunidadeCards');

  if (comunidadeCards) {
    let autoScrollAtivo = true;
    let retomarTimeout; // timer que reativa o auto-scroll após interação

    // Velocidade do scroll automático, em pixels por quadro.
    // Valor baixo = movimento bem lento e suave, fácil de ler.
    const VELOCIDADE = 0.4;

    function passoAutoScroll() {
      if (autoScrollAtivo) {
        comunidadeCards.scrollLeft += VELOCIDADE;

        // Ao chegar no final, volta para o início suavemente,
        // criando um loop contínuo em vez de "travar" na borda
        const fimDoScroll = comunidadeCards.scrollWidth - comunidadeCards.clientWidth;
        if (comunidadeCards.scrollLeft >= fimDoScroll - 1) {
          comunidadeCards.scrollLeft = 0;
        }
      }
      requestAnimationFrame(passoAutoScroll); // agenda o próximo quadro
    }

    requestAnimationFrame(passoAutoScroll);

    // Pausa o auto-scroll e agenda a retomada depois de um tempo parado
    function pausarEAgendarRetomada() {
      autoScrollAtivo = false;
      clearTimeout(retomarTimeout);
      retomarTimeout = setTimeout(function () {
        autoScrollAtivo = true;
      }, 2500); // espera 2.5s sem interação antes de voltar a rolar sozinho
    }

    // Mouse (desktop): pausa ao passar por cima, retoma ao tirar o mouse
    comunidadeCards.addEventListener('mouseenter', function () {
      autoScrollAtivo = false;
      clearTimeout(retomarTimeout);
    });

    comunidadeCards.addEventListener('mouseleave', function () {
      autoScrollAtivo = true;
    });

    // Toque (celular/tablet) e arraste manual: pausa e agenda retomada
    comunidadeCards.addEventListener('touchstart', pausarEAgendarRetomada, { passive: true });
    comunidadeCards.addEventListener('touchmove', pausarEAgendarRetomada, { passive: true });
    comunidadeCards.addEventListener('scroll', pausarEAgendarRetomada);

    // Se o usuário clicar em algo dentro do card (botão, input),
    // também pausamos para não competir com a digitação
    comunidadeCards.addEventListener('focusin', function () {
      autoScrollAtivo = false;
      clearTimeout(retomarTimeout);
    });

    comunidadeCards.addEventListener('focusout', function () {
      retomarTimeout = setTimeout(function () {
        autoScrollAtivo = true;
      }, 2500);
    });
  }

});