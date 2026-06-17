/* ================================================================
   MINDBRIDGE — COMUNIDADE (JavaScript)
   Interações exclusivas desta página. Comportamentos globais
   (menu mobile, scroll do header, reveal, botão topo) ficam no
   mindbridge-home.js, que também é carregado nesta página.
================================================================ */

document.addEventListener('DOMContentLoaded', function () {


  /* ============================================================
     1. ESTADO DE LOGIN — avatar vs botão "Entrar"
     Lê mb_usuario do localStorage; se existir, adiciona .logado
     ao body, preenche o avatar com as iniciais e redireciona o
     href para a página de perfil do usuário.
  ============================================================ */
  const navAvatar = document.getElementById('navAvatar');
  const feedAvatar = document.getElementById('feedAvatar');

  function aplicarEstadoLogin(usuario) {
    // Adiciona classe ao body para que o CSS mostre avatar e esconda "Entrar"
    document.body.classList.add('logado');

    if (navAvatar && usuario.nome) {
      // Extrai iniciais (até 2 letras) do nome do usuário
      const iniciais = usuario.nome
        .split(' ')
        .slice(0, 2)
        .map(function (p) { return p[0]; })
        .join('')
        .toUpperCase();

      navAvatar.textContent = iniciais;
      navAvatar.setAttribute('aria-label', 'Perfil de ' + usuario.nome);

      // Atualiza o link do avatar para a página de perfil, se informado
      if (usuario.href) {
        navAvatar.setAttribute('href', usuario.href);
      }
    }

    // Atualiza também a inicial do avatar no formulário do feed
    if (feedAvatar && usuario.nome) {
      feedAvatar.textContent = usuario.nome[0].toUpperCase();
    }
  }

  // Verifica se há sessão salva no localStorage ao carregar a página
  try {
    const dadosSalvos = localStorage.getItem('mb_usuario');
    if (dadosSalvos) {
      aplicarEstadoLogin(JSON.parse(dadosSalvos));
    }
  } catch (e) {
    // Se o JSON estiver corrompido, ignora silenciosamente
  }

  /*
    API pública para login sem recarregar a página.
    Uso: window.mbLogin({ nome: 'Ana Gabrielly', href: '/perfil' })
    A página de login pode chamar isso após autenticar o usuário.
  */
  window.mbLogin = function (usuario) {
    try {
      localStorage.setItem('mb_usuario', JSON.stringify(usuario));
    } catch (e) { /* localStorage indisponível — continua sem persistir */ }
    aplicarEstadoLogin(usuario);
  };

  /*
    API pública para logout.
    Uso: window.mbLogout()
  */
  window.mbLogout = function () {
    try { localStorage.removeItem('mb_usuario'); } catch (e) { }
    document.body.classList.remove('logado');
    if (navAvatar) {
      navAvatar.innerHTML = '<i class="ti ti-user"></i>';
      navAvatar.setAttribute('href', 'mindbridge-login.html');
      navAvatar.setAttribute('aria-label', 'Entrar ou ver perfil');
    }
    if (feedAvatar) { feedAvatar.textContent = 'V'; }
  };


  /* ============================================================
     2. FILTROS DE TEMA — mostra/oculta posts pelo atributo data-tema
  ============================================================ */
  const filtros = document.querySelectorAll('.com-filtro-btn');
  const posts = document.querySelectorAll('.com-feed .comunidade-card');

  function aplicarFiltro(temaEscolhido) {
    posts.forEach(function (post) {
      const temaDoPost = post.getAttribute('data-tema');
      // Mostra todos no filtro "todos"; caso contrário, filtra pelo tema
      post.style.display = (temaEscolhido === 'todos' || temaDoPost === temaEscolhido)
        ? 'flex'
        : 'none';
    });
  }

  filtros.forEach(function (botao) {
    botao.addEventListener('click', function () {
      // Remove .ativo de todos e aplica só ao chip clicado
      filtros.forEach(function (b) { b.classList.remove('ativo'); });
      botao.classList.add('ativo');
      aplicarFiltro(botao.getAttribute('data-tema-filtro'));
    });
  });


  /* ============================================================
     3. NOVA PUBLICAÇÃO — valida, monta o card e insere no topo do feed
  ============================================================ */
  const novoPostTexto  = document.getElementById('novoPostTexto');
  const novoPostTema   = document.getElementById('novoPostTema');
  const novoPostAnonimo = document.getElementById('novoPostAnonimo');
  const novoPostBotao  = document.getElementById('novoPostBotao');
  const feedColuna     = document.getElementById('feedColuna');

  // Habilita o botão Publicar somente quando há texto digitado
  function atualizarEstadoBotaoPublicar() {
    if (!novoPostTexto || !novoPostBotao) return;
    novoPostBotao.disabled = novoPostTexto.value.trim() === '';
  }

  if (novoPostTexto) {
    novoPostTexto.addEventListener('input', atualizarEstadoBotaoPublicar);
    atualizarEstadoBotaoPublicar(); // garante estado correto ao carregar
  }

  // Rótulos legíveis para cada valor do <select> de tema
  const rotulosTema = {
    ansiedade: 'Ansiedade', burnout: 'Burnout', luto: 'Luto',
    sono: 'Sono', autoestima: 'Autoestima', relacionamentos: 'Relacionamentos'
  };

  // Escapa HTML para evitar injeção de código no texto digitado
  function escaparHTML(texto) {
    const div = document.createElement('div');
    div.textContent = texto;
    return div.innerHTML;
  }

  if (novoPostBotao) {
    novoPostBotao.addEventListener('click', function () {
      const texto = novoPostTexto.value.trim();
      if (texto === '') return;

      const tema        = novoPostTema.value;
      const ehAnonimo   = novoPostAnonimo.checked;

      // Usa dados do usuário logado, se disponível
      let nomeExibido = ehAnonimo ? 'Anônimo' : 'Você';
      let inicialAvatar = ehAnonimo ? '?' : 'V';
      try {
        const dadosSalvos = localStorage.getItem('mb_usuario');
        if (dadosSalvos && !ehAnonimo) {
          const usuario = JSON.parse(dadosSalvos);
          nomeExibido   = usuario.nome || 'Você';
          inicialAvatar = nomeExibido[0].toUpperCase();
        }
      } catch (e) { }

      // Monta o card seguindo a mesma estrutura dos posts existentes
      const novoCard = document.createElement('div');
      novoCard.className = 'comunidade-card';
      novoCard.setAttribute('data-tema', tema);
      novoCard.innerHTML = `
        <span class="tag-topico">${rotulosTema[tema] || tema}</span>
        <div class="comunidade-card-header">
          <div class="avatar">${inicialAvatar}</div>
          <div>
            <p class="nome">${escaparHTML(nomeExibido)}</p>
            <p class="tempo">Agora mesmo</p>
          </div>
        </div>
        <p class="mensagem">"${escaparHTML(texto)}"</p>
        <button class="btn-abraco"><i class="ti ti-heart"></i> Abraço virtual <span class="contador-abraco">(0)</span></button>
        <div class="card-resposta">
          <input type="text" placeholder="Escreva uma mensagem de apoio..." maxlength="120">
          <button type="button" aria-label="Enviar mensagem"><i class="ti ti-send"></i></button>
        </div>
        <div class="respostas-lista"></div>
      `;

      // Insere o novo post no topo do feed
      feedColuna.insertBefore(novoCard, feedColuna.firstChild);

      // Ativa interações no card recém-criado
      ativarAbraco(novoCard);
      ativarResposta(novoCard);

      // Aplica filtro ativo ao novo card para consistência
      const filtroAtivo = document.querySelector('.com-filtro-btn.ativo');
      if (filtroAtivo) aplicarFiltro(filtroAtivo.getAttribute('data-tema-filtro'));

      // Limpa o formulário e confirma com toast
      novoPostTexto.value = '';
      novoPostAnonimo.checked = false;
      atualizarEstadoBotaoPublicar();
      mostrarToast('Sua publicação foi compartilhada com a comunidade 💜');
    });
  }


  /* ============================================================
     4. ABRAÇO VIRTUAL — incrementa contador e marca como enviado
  ============================================================ */
  function ativarAbraco(card) {
    const botao = card.querySelector('.btn-abraco');
    if (!botao) return;

    botao.addEventListener('click', function () {
      if (botao.classList.contains('enviado')) return; // impede duplo clique

      const contador = botao.querySelector('.contador-abraco');
      if (contador) {
        const atual = parseInt(contador.textContent.replace(/\D/g, ''), 10) || 0;
        contador.textContent = '(' + (atual + 1) + ')';
      }

      // Marca como enviado e troca ícone para coração preenchido
      botao.classList.add('enviado');
      botao.querySelector('i').className = 'ti ti-heart-filled';
      mostrarToast('Abraço virtual enviado! 💜');
    });
  }


  /* ============================================================
     5. RESPOSTAS — envia mensagem de apoio e exibe na lista do card
  ============================================================ */
  function ativarResposta(card) {
    const input         = card.querySelector('.card-resposta input');
    const botaoEnviar   = card.querySelector('.card-resposta button');
    const listaRespostas = card.querySelector('.respostas-lista');

    function enviarResposta() {
      const texto = input.value.trim();
      if (texto === '') return;

      // Cria e adiciona o elemento de resposta na lista
      const respostaEl = document.createElement('div');
      respostaEl.className = 'resposta-enviada';
      respostaEl.innerHTML = '<strong>Você:</strong> ' + escaparHTML(texto);
      listaRespostas.appendChild(respostaEl);

      input.value = '';
      input.focus();
      mostrarToast('Mensagem de apoio enviada!');
    }

    if (botaoEnviar) botaoEnviar.addEventListener('click', enviarResposta);

    // Enter também envia a resposta
    if (input) {
      input.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') { e.preventDefault(); enviarResposta(); }
      });
    }
  }

  // Ativa abraço e resposta em todos os posts já presentes no HTML
  document.querySelectorAll('.com-feed .comunidade-card').forEach(function (card) {
    ativarAbraco(card);
    ativarResposta(card);
  });


  /* ============================================================
     6. CARREGAR MAIS — revela posts ocultos ao clicar no botão
  ============================================================ */
  const botaoCarregarMais = document.getElementById('feedCarregarMais');

  if (botaoCarregarMais) {
    botaoCarregarMais.addEventListener('click', function () {
      const postsOcultos = document.querySelectorAll('.com-feed .post-oculto');

      postsOcultos.forEach(function (post) {
        post.classList.remove('post-oculto');
        post.style.display = 'flex';
        ativarAbraco(post);    // ativa interações nos posts recém-revelados
        ativarResposta(post);
      });

      // Esconde o botão após revelar todos os posts extras
      botaoCarregarMais.style.display = 'none';

      // Reaplica o filtro ativo para os novos posts respeitarem a seleção
      const filtroAtivo = document.querySelector('.com-filtro-btn.ativo');
      if (filtroAtivo) aplicarFiltro(filtroAtivo.getAttribute('data-tema-filtro'));
    });
  }


  /* ============================================================
     7. TOAST — notificação flutuante de feedback rápido
     Reimplementado aqui porque o mindbridge-home.js não expõe
     a função para fora do seu próprio DOMContentLoaded.
  ============================================================ */
  const toast     = document.getElementById('toast');
  const toastTexto = document.getElementById('toastTexto');
  let toastTimeout;

  function mostrarToast(mensagem) {
    if (!toast) return;
    toastTexto.textContent = mensagem;
    toast.classList.add('visivel');

    // Esconde automaticamente após 2,8 segundos
    clearTimeout(toastTimeout);
    toastTimeout = setTimeout(function () {
      toast.classList.remove('visivel');
    }, 2800);
  }

});