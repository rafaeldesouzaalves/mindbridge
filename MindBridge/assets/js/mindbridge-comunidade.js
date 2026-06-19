/* ================================================================
   MINDBRIDGE — COMUNIDADE (JavaScript v2 — reescrito)
   Arquivo: mindbridge-comunidade.js

   BUGS CORRIGIDOS
   ───────────────
   [FIX 1] Card não aparecia ao criar grupo.
           Causa: .cg-overlay estava aninhado dentro da
           .com-grupos-grid no HTML. O método contains()
           retornava true mas o filho direto buscado era o overlay,
           não o card-criar. O insertBefore falhava silenciosamente.
           Solução: buscar com :scope > .com-grupo-card-criar para
           garantir filho direto, sem depender de btnAbrirCG.

   [FIX 2] Descrição longa quebrava o card.
           Solução: -webkit-line-clamp: 3 no CSS (comunidade.css).
           O JS agora também trunca a string antes de inserir no
           innerHTML como camada extra de segurança.

   [FIX 3] Muitas respostas quebravam o card do feed.
           Solução: max-height + overflow-y: auto no CSS.
           O JS faz scrollTop = scrollHeight a cada nova mensagem.

   MELHORIAS
   ─────────
   • Animação de entrada nos cards criados (CSS: .card-novo-entrada)
   • Animação de entrada nos posts publicados (CSS: .post-novo-entrada)
   • Contador de caracteres na textarea do feed com aviso de limite
   • Ícone do botão "Criar grupo" muda para spinner enquanto processa
   • Stats do hero atualizam ao criar grupo e ao publicar post
   • Tooltip de tempo relativo nos posts (atualiza a cada minuto)
   • Posts do feed mostram timestamp relativo dinâmico
   • Grupos criados re-carregados do localStorage ao abrir a página

   ÍNDICE
   ──────
   0.  Utilitários globais
   1.  Estado de login
   2.  Modal "Criar grupo" — abertura / fechamento / validação
   3.  Seleção de ícone (12 opções)
   4.  Chips de tema (máx. 3)
   5.  Botões de privacidade
   6.  Criação do card e inserção na grade   ← FIX 1
   7.  Filtros de tema no feed
   8.  Formulário "Nova publicação" com contador
   9.  Abraço virtual (uma vez por card)
   10. Respostas com scroll automático       ← FIX 3
   11. Carregar mais posts ocultos
   12. Timestamps relativos dinâmicos
   13. Restaurar grupos do localStorage ao carregar a página
================================================================ */

document.addEventListener('DOMContentLoaded', function () {

  /* ============================================================
     0. UTILITÁRIOS GLOBAIS
  ============================================================ */

  /**
   * Escapa caracteres HTML especiais para evitar XSS.
   * Use sempre antes de inserir texto do usuário via innerHTML.
   * @param {string} texto — texto bruto
   * @returns {string} — texto seguro para innerHTML
   */
  function escaparHTML(texto) {
    var div = document.createElement('div');
    div.textContent = texto;
    return div.innerHTML;
  }

  /**
   * Trunca um texto a n caracteres e adiciona reticências.
   * Camada extra de segurança além do -webkit-line-clamp no CSS.
   * @param {string} texto — texto a truncar
   * @param {number} n     — comprimento máximo
   * @returns {string}
   */
  function truncar(texto, n) {
    if (!texto) return '';
    return texto.length > n ? texto.slice(0, n - 1).trimEnd() + '…' : texto;
  }

  /**
   * Exibe um toast de feedback por 2,8 s.
   * clearTimeout evita sobreposição em cliques rápidos.
   * @param {string} mensagem — texto exibido no toast
   * @param {'padrao'|'erro'|'sucesso'} tipo — estilo visual
   */
  var toastTimeout;

  function mostrarToast(mensagem, tipo) {
    var toast      = document.getElementById('toast');
    var toastTexto = document.getElementById('toastTexto');
    if (!toast) return;

    toastTexto.textContent = mensagem;

    /* Remove classes de tipo anteriores antes de aplicar a nova */
    toast.classList.remove('toast-erro', 'toast-sucesso');
    if (tipo === 'erro')    toast.classList.add('toast-erro');
    if (tipo === 'sucesso') toast.classList.add('toast-sucesso');

    toast.classList.add('visivel');

    clearTimeout(toastTimeout);
    toastTimeout = setTimeout(function () {
      toast.classList.remove('visivel', 'toast-erro', 'toast-sucesso');
    }, 2800);
  }

  /**
   * Retorna uma string de tempo relativo curta.
   * Ex.: "Agora mesmo", "Há 3 min", "Há 2 horas"
   * @param {Date} data — momento de referência
   * @returns {string}
   */
  function tempoRelativo(data) {
    var diff = Math.floor((Date.now() - data.getTime()) / 1000); /* segundos */
    if (diff < 30)            return 'Agora mesmo';
    if (diff < 60)            return 'Há ' + diff + ' seg';
    if (diff < 3600)          return 'Há ' + Math.floor(diff / 60) + ' min';
    if (diff < 86400)         return 'Há ' + Math.floor(diff / 3600) + ' hora' + (Math.floor(diff / 3600) > 1 ? 's' : '');
    return 'Há ' + Math.floor(diff / 86400) + ' dia' + (Math.floor(diff / 86400) > 1 ? 's' : '');
  }

  /* Lista de posts criados dinamicamente — usada para atualizar timestamps */
  var postsCriados = []; /* [{ el: HTMLElement, criado: Date }] */


  /* ============================================================
     1. ESTADO DE LOGIN
     Alternância visual avatar ↔ botão "Entrar" via body.logado.
  ============================================================ */

  var navAvatar  = document.getElementById('navAvatar');
  var feedAvatar = document.getElementById('feedAvatar');

  /**
   * Aplica visualmente o estado de usuário logado.
   * Insere iniciais no avatar do header e do formulário do feed.
   * @param {{ nome: string, href?: string }} usuario
   */
  function aplicarEstadoLogin(usuario) {
    document.body.classList.add('logado');

    if (navAvatar && usuario.nome) {
      var iniciais = usuario.nome
        .split(' ')
        .slice(0, 2)
        .map(function (p) { return p[0]; })
        .join('')
        .toUpperCase();

      navAvatar.textContent = iniciais;
      navAvatar.setAttribute('aria-label', 'Perfil de ' + usuario.nome);
      if (usuario.href) navAvatar.setAttribute('href', usuario.href);
    }

    if (feedAvatar && usuario.nome) {
      feedAvatar.textContent = usuario.nome[0].toUpperCase();
    }
  }

  /* Restaura sessão salva ao carregar a página */
  try {
    var dadosSalvos = localStorage.getItem('mb_usuario');
    if (dadosSalvos) aplicarEstadoLogin(JSON.parse(dadosSalvos));
  } catch (e) { /* localStorage pode estar bloqueado (modo privado) */ }

  /* Expõe mbLogin() / mbLogout() para uso em outras páginas */
  window.mbLogin = function (usuario) {
    try { localStorage.setItem('mb_usuario', JSON.stringify(usuario)); } catch (e) {}
    aplicarEstadoLogin(usuario);
  };

  window.mbLogout = function () {
    try { localStorage.removeItem('mb_usuario'); } catch (e) {}
    document.body.classList.remove('logado');
    if (navAvatar) {
      navAvatar.innerHTML = '<i class="ti ti-user"></i>';
      navAvatar.setAttribute('href', 'mindbridge-login.html');
      navAvatar.setAttribute('aria-label', 'Entrar ou ver perfil');
    }
    if (feedAvatar) feedAvatar.textContent = 'V';
  };


  /* ============================================================
     2. MODAL "CRIAR GRUPO" — abertura / fechamento
  ============================================================ */

  var cgOverlay  = document.getElementById('cgOverlay');
  var cgFechar   = document.getElementById('cgFechar');
  var cgCancelar = document.getElementById('cgCancelar');
  var cgCriar    = document.getElementById('cgCriar');
  var btnAbrirCG = document.getElementById('btnAbrirCriarGrupo');

  /* Campos do formulário */
  var cgNome      = document.getElementById('cgNome');
  var cgDesc      = document.getElementById('cgDesc');
  var cgModerador = document.getElementById('cgModerador');
  var cgLimite    = document.getElementById('cgLimite');
  var cgNomeCount = document.getElementById('cgNomeCount');
  var cgDescCount = document.getElementById('cgDescCount');
  var cgErroNome  = document.getElementById('cgErroNome');
  var cgErroTema  = document.getElementById('cgErroTema');

  /* Estado interno do modal */
  var cgIconeSel = 'ti-wind';    /* ícone selecionado (padrão) */
  var cgTemasSel = new Set();    /* temas escolhidos (1–3) */
  var cgPrivSel  = 'publico';    /* 'publico' | 'privado' */

  /* Mapas de dados para gerar o card */
  var CG_CORES = {
    ansiedade: 'cor-ansiedade', burnout: 'cor-burnout',
    luto: 'cor-luto',           sono: 'cor-sono',
    autoestima: 'cor-autoestima', relacionamentos: 'cor-relacionamentos',
    outro: 'cor-outro'
  };

  var CG_ROTULOS = {
    ansiedade: 'Ansiedade', burnout: 'Burnout', luto: 'Luto',
    sono: 'Sono', autoestima: 'Autoestima',
    relacionamentos: 'Relacionamentos', outro: 'Outro'
  };

  /* ── Abrir modal ──────────────────────────────────────────── */

  function cgAbrir() {
    /* Reseta todos os campos */
    if (cgNome)      cgNome.value = '';
    if (cgDesc)      cgDesc.value = '';
    if (cgModerador) cgModerador.value = '';
    if (cgLimite)    cgLimite.value = '50';
    if (cgNomeCount) cgNomeCount.textContent = '0/50';
    if (cgDescCount) cgDescCount.textContent = '0/180';

    /* Reseta chips de tema */
    cgTemasSel.clear();
    document.querySelectorAll('.cg-tema').forEach(function (c) { c.classList.remove('ativo'); });
    var temasContador = document.getElementById('cgTemasContador');
    if (temasContador) { temasContador.textContent = '0/3 temas'; temasContador.style.color = '#ccc'; }

    /* Reseta ícone para o padrão (ti-wind) */
    cgIconeSel = 'ti-wind';
    document.querySelectorAll('.cg-icone-btn').forEach(function (b) {
      b.classList.toggle('ativo', b.getAttribute('data-icone') === 'ti-wind');
    });
    var prevIcone = document.getElementById('cgIconePreviewIcone');
    if (prevIcone) prevIcone.className = 'ti ' + cgIconeSel;

    /* Reseta privacidade para "Público" */
    cgPrivSel = 'publico';
    document.querySelectorAll('.cg-priv').forEach(function (o) {
      o.classList.toggle('ativo', o.getAttribute('data-priv') === 'publico');
    });

    cgLimparErros();

    /* Abre o overlay e trava o scroll da página */
    if (cgOverlay) {
      cgOverlay.classList.add('aberto');
      document.body.style.overflow = 'hidden';
      /* Foca no campo Nome após a animação de entrada terminar */
      if (cgNome) setTimeout(function () { cgNome.focus(); }, 80);
    }
  }

  /* ── Fechar modal ─────────────────────────────────────────── */

  function cgFecharModal() {
    if (cgOverlay) {
      cgOverlay.classList.remove('aberto');
      document.body.style.overflow = '';
      /* Devolve foco ao elemento que abriu (acessibilidade) */
      if (btnAbrirCG) btnAbrirCG.focus();
    }
  }

  function cgLimparErros() {
    if (cgErroNome) cgErroNome.textContent = '';
    if (cgErroTema) cgErroTema.textContent = '';
    if (cgNome)     cgNome.classList.remove('com-erro');
  }

  /* Eventos de abertura */
  if (btnAbrirCG) {
    btnAbrirCG.addEventListener('click', cgAbrir);
    btnAbrirCG.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); cgAbrir(); }
    });
  }

  /* Eventos de fechamento */
  if (cgFechar)   cgFechar.addEventListener('click', cgFecharModal);
  if (cgCancelar) cgCancelar.addEventListener('click', cgFecharModal);

  /* Clique no fundo escuro fecha o modal */
  if (cgOverlay) {
    cgOverlay.addEventListener('click', function (e) {
      if (e.target === cgOverlay) cgFecharModal();
    });
  }

  /* Tecla Escape fecha o modal se estiver aberto */
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && cgOverlay && cgOverlay.classList.contains('aberto')) {
      cgFecharModal();
    }
  });

  /* ── Contadores de caracteres ─────────────────────────────── */

  if (cgNome && cgNomeCount) {
    cgNome.addEventListener('input', function () {
      cgNomeCount.textContent = cgNome.value.length + '/50';
      cgNome.classList.remove('com-erro');
      if (cgErroNome) cgErroNome.textContent = '';
    });
  }

  if (cgDesc && cgDescCount) {
    cgDesc.addEventListener('input', function () {
      cgDescCount.textContent = cgDesc.value.length + '/180';
    });
  }

  /* ============================================================
     3. SELEÇÃO DE ÍCONE (12 opções)
  ============================================================ */

  document.querySelectorAll('.cg-icone-btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      cgIconeSel = btn.getAttribute('data-icone');

      /* Atualiza estado visual de todos os botões */
      document.querySelectorAll('.cg-icone-btn').forEach(function (b) { b.classList.remove('ativo'); });
      btn.classList.add('ativo');

      /* Atualiza o badge de pré-visualização */
      var prevIcone = document.getElementById('cgIconePreviewIcone');
      if (prevIcone) prevIcone.className = 'ti ' + cgIconeSel;

      /* Atualiza também a cor de fundo do preview badge
         com base no tema selecionado (se houver) */
      var badge = document.getElementById('cgIconePreviewBadge');
      if (badge && cgTemasSel.size > 0) {
        var temaPrev = Array.from(cgTemasSel)[0];
        var coresTema = {
          ansiedade: '#5A48C8', burnout: '#2970C8', luto: '#8B7BC4',
          sono: '#1D9E75', autoestima: '#E6A817',
          relacionamentos: '#E05C8A', outro: '#888'
        };
        badge.style.backgroundColor = coresTema[temaPrev] || '#5A48C8';
      }
    });
  });

  

  /* ============================================================
     4. CHIPS DE TEMA (seleção múltipla — máx. 3)
  ============================================================ */

  document.querySelectorAll('.cg-tema').forEach(function (chip) {
    chip.addEventListener('click', function () {
      var tema = chip.getAttribute('data-tema');

      if (cgTemasSel.has(tema)) {
        /* Remove o tema já selecionado */
        cgTemasSel.delete(tema);
        chip.classList.remove('ativo');
      } else {
        /* Bloqueia se já houver 3 temas */
        if (cgTemasSel.size >= 3) {
          mostrarToast('Máximo de 3 temas por grupo.', 'erro');
          return;
        }
        cgTemasSel.add(tema);
        chip.classList.add('ativo');
      }

      /* Atualiza contador "X/3 temas" */
      var temasContador = document.getElementById('cgTemasContador');
      if (temasContador) {
        temasContador.textContent = cgTemasSel.size + '/3 temas';
        temasContador.style.color = cgTemasSel.size >= 3 ? 'var(--Roxo-Calmo)' : '#ccc';
      }

      /* Limpa erro assim que ao menos 1 tema for selecionado */
      if (cgTemasSel.size > 0 && cgErroTema) cgErroTema.textContent = '';
    });
  });


  /* ============================================================
     5. BOTÕES DE PRIVACIDADE
  ============================================================ */

  document.querySelectorAll('.cg-priv').forEach(function (opt) {
    opt.addEventListener('click', function () {
      document.querySelectorAll('.cg-priv').forEach(function (o) { o.classList.remove('ativo'); });
      opt.classList.add('ativo');
      cgPrivSel = opt.getAttribute('data-priv');
    });
  });


  /* ============================================================
     6. CRIAÇÃO DO CARD E INSERÇÃO NA GRADE   ← FIX 1
  ============================================================ */

  if (cgCriar) {
    cgCriar.addEventListener('click', function () {
      var nome   = cgNome ? cgNome.value.trim() : '';
      var valido = true;

      cgLimparErros();

      /* Validação 1: nome obrigatório */
      if (!nome) {
        if (cgNome)     cgNome.classList.add('com-erro');
        if (cgErroNome) cgErroNome.textContent = 'Dê um nome ao grupo.';
        if (cgNome)     cgNome.focus();
        valido = false;
      }

      /* Validação 2: pelo menos 1 tema obrigatório */
      if (cgTemasSel.size === 0) {
        if (cgErroTema) cgErroTema.textContent = 'Escolha ao menos um tema.';
        valido = false;
      }

      if (!valido) return;

      /* Coleta dados dos campos opcionais */
      var desc      = cgDesc      ? cgDesc.value.trim()         : '';
      var moderador = cgModerador ? cgModerador.value.trim()     : '';
      var limite    = cgLimite    ? parseInt(cgLimite.value, 10) : 0;

      /* Fallback de moderador: nome do usuário logado ou "Você" */
      if (!moderador) {
        try {
          var du = localStorage.getItem('mb_usuario');
          moderador = du ? JSON.parse(du).nome || 'Você' : 'Você';
        } catch (e) { moderador = 'Você'; }
      }

      var temasArr      = Array.from(cgTemasSel);
      var temaPrincipal = temasArr[0];
      var corClasse     = CG_CORES[temaPrincipal] || 'cor-outro';

      /* Chips de tema HTML para inserir no card */
      var tagsTemas = temasArr
        .map(function (t) {
          return '<span class="com-grupo-tag-tema">' + (CG_ROTULOS[t] || t) + '</span>';
        }).join('');

      /* Ícone de cadeado para grupos privados */
      var tagPriv = cgPrivSel === 'privado'
        ? '<i class="ti ti-lock" title="Grupo privado" aria-label="Privado" style="font-size:11px;color:#aaa;margin-left:3px;"></i>'
        : '';

      /* Texto de limite se for configurado */
      var tagLimite = limite > 0
        ? '<span style="font-size:11px;color:#aaa;">máx. ' + limite + '</span>'
        : '';

      /* ── [FIX 1] Inserção correta na grade ──────────────────
         PROBLEMA: o .cg-overlay estava dentro da .com-grupos-grid,
         então o contains(btnAbrirCG) retornava true mas o
         insertBefore falhava porque btnAbrirCG não era filho
         direto da grade (estava dentro do overlay).

         SOLUÇÃO: buscar com :scope > .com-grupo-card-criar para
         garantir que só filhos diretos da grade sejam encontrados,
         sem interferência dos elementos aninhados no overlay.    */
      var gruposGrid = document.querySelector('.com-grupos-grid');
      if (!gruposGrid) return; /* grade não encontrada — encerra */

      /* Busca o card "Criar grupo" como filho direto da grade */
      var cardCriar = gruposGrid.querySelector(':scope > .com-grupo-card-criar');

      /* Monta o HTML do novo card.
         FIX 2 extra: truncar() limita a descrição a 120 chars
         como camada de segurança além do -webkit-line-clamp CSS. */
      var novoCard = document.createElement('div');
      novoCard.className = 'com-grupo-card card-novo-entrada'; /* animação CSS */

      novoCard.innerHTML =
        /* Ícone colorido */
        '<div class="com-grupo-icone ' + corClasse + '">' +
          '<i class="ti ' + escaparHTML(cgIconeSel) + '"></i>' +
        '</div>' +
        /* Chips de tema */
        '<div class="com-grupo-temas-lista">' + tagsTemas + '</div>' +
        /* Nome em Lora (herdado pelo CSS) */
        '<h3>' + escaparHTML(truncar(nome, 50)) + '</h3>' +
        /* Descrição: truncada a 120 chars no JS + clamp no CSS */
        '<p>' + escaparHTML(truncar(desc || 'Grupo criado pela comunidade.', 120)) + '</p>' +
        /* Rodapé: membros, privacidade, badge Novo, limite */
        '<div class="com-grupo-rodape">' +
          '<span class="com-grupo-membros">' +
            '<i class="ti ti-users" aria-hidden="true"></i> 1 membro' + tagPriv +
          '</span>' +
          '<span class="com-grupo-novo-badge">' +
            '<i class="ti ti-circle-filled" style="font-size:8px;" aria-hidden="true"></i> Novo' +
          '</span>' +
          tagLimite +
        '</div>';

      /* Insere ANTES do card "Criar grupo" se ele for filho direto;
         caso contrário (HTML alterado), adiciona ao final da grade. */
      if (cardCriar) {
        gruposGrid.insertBefore(novoCard, cardCriar);
      } else {
        gruposGrid.appendChild(novoCard);
      }

      /* Scroll suave até o novo card para o usuário vê-lo */
      setTimeout(function () {
        novoCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, 100);

      /* Persiste o grupo no localStorage para futuras sessões */
      try {
        var salvos = JSON.parse(localStorage.getItem('mb_grupos_criados') || '[]');
        salvos.push({
          nome: nome, desc: desc, icone: cgIconeSel,
          temas: temasArr, privacidade: cgPrivSel,
          limite: limite, moderador: moderador,
          criadoEm: new Date().toISOString()
        });
        localStorage.setItem('mb_grupos_criados', JSON.stringify(salvos));
      } catch (e) { /* ignora erros de storage */ }

      /* Atualiza o stat de grupos no hero (se existir) */
      atualizarStatGrupos(+1);

      cgFecharModal();
      mostrarToast('Grupo "' + truncar(nome, 24) + '" criado! 💜', 'sucesso');
    });
  }


  /* ============================================================
     7. FILTROS DE TEMA NO FEED
     Chips no topo do feed mostram/ocultam posts por data-tema.
  ============================================================ */

  var filtros = document.querySelectorAll('.com-filtro-btn');
  var posts   = document.querySelectorAll('.com-feed .comunidade-card');

  /**
   * Aplica o filtro de tema mostrando/ocultando posts.
   * @param {string} temaEscolhido — valor de data-tema-filtro
   */
  function aplicarFiltro(temaEscolhido) {
    /* Seleciona novamente para incluir posts criados dinamicamente */
    var todosPosts = document.querySelectorAll('.com-feed .comunidade-card');
    todosPosts.forEach(function (post) {
      var temaPost  = post.getAttribute('data-tema');
      var exibir    = temaEscolhido === 'todos' || temaPost === temaEscolhido;
      post.style.display = exibir ? 'flex' : 'none';
    });
  }

  filtros.forEach(function (botao) {
    botao.addEventListener('click', function () {
      filtros.forEach(function (b) { b.classList.remove('ativo'); });
      botao.classList.add('ativo');
      aplicarFiltro(botao.getAttribute('data-tema-filtro'));
    });
  });


  /* ============================================================
     8. FORMULÁRIO "NOVA PUBLICAÇÃO" com contador de caracteres
  ============================================================ */

  var novoPostTexto   = document.getElementById('novoPostTexto');
  var novoPostTema    = document.getElementById('novoPostTema');
  var novoPostAnonimo = document.getElementById('novoPostAnonimo');
  var novoPostBotao   = document.getElementById('novoPostBotao');
  var feedColuna      = document.getElementById('feedColuna');

  var rotulosTema = {
    ansiedade: 'Ansiedade', burnout: 'Burnout', luto: 'Luto',
    sono: 'Sono', autoestima: 'Autoestima', relacionamentos: 'Relacionamentos'
  };

  /* Insere o contador de caracteres abaixo da textarea do feed */
  if (novoPostTexto) {
    var contadorFeed = document.createElement('p');
    contadorFeed.className = 'com-novo-post-contador';
    contadorFeed.textContent = '0/400';
    /* Insere logo depois da textarea */
    novoPostTexto.parentNode.insertBefore(contadorFeed, novoPostTexto.nextSibling);

    novoPostTexto.addEventListener('input', function () {
      var len = novoPostTexto.value.length;
      contadorFeed.textContent = len + '/400';
      /* Muda cor conforme se aproxima do limite */
      contadorFeed.classList.toggle('proximo-limite', len >= 320 && len < 400);
      contadorFeed.classList.toggle('no-limite',      len >= 400);
      /* Habilita/desabilita o botão Publicar */
      if (novoPostBotao) novoPostBotao.disabled = len === 0;
    });

    /* Estado inicial do botão */
    if (novoPostBotao) novoPostBotao.disabled = true;
  }

  if (novoPostBotao) {
    novoPostBotao.addEventListener('click', function () {
      var texto = novoPostTexto ? novoPostTexto.value.trim() : '';
      if (!texto) return;

      var tema      = novoPostTema ? novoPostTema.value : 'ansiedade';
      var ehAnonimo = novoPostAnonimo ? novoPostAnonimo.checked : false;

      /* Define nome e inicial conforme anonimato */
      var nomeExibido   = 'Você';
      var inicialAvatar = 'V';

      if (ehAnonimo) {
        nomeExibido   = 'Anônimo';
        inicialAvatar = '?';
      } else {
        try {
          var ds = localStorage.getItem('mb_usuario');
          if (ds) {
            var u = JSON.parse(ds);
            nomeExibido   = u.nome || 'Você';
            inicialAvatar = nomeExibido[0].toUpperCase();
          }
        } catch (e) {}
      }

      var agora = new Date();

      /* Cria o card do post com estrutura idêntica aos estáticos */
      var novoCard = document.createElement('div');
      novoCard.className = 'comunidade-card post-novo-entrada'; /* animação */
      novoCard.setAttribute('data-tema', tema);
      novoCard.setAttribute('data-criado', agora.toISOString()); /* para timestamps */

      novoCard.innerHTML =
        '<span class="tag-topico">' + (rotulosTema[tema] || tema) + '</span>' +
        '<div class="comunidade-card-header">' +
          '<div class="avatar">' + inicialAvatar + '</div>' +
          '<div>' +
            '<p class="nome">' + escaparHTML(nomeExibido) + '</p>' +
            '<p class="tempo" data-ts="' + agora.toISOString() + '">Agora mesmo</p>' +
          '</div>' +
        '</div>' +
        '<p class="mensagem" style="word-break:break-word;overflow-wrap:break-word;">"' +
          escaparHTML(texto) + '"</p>' +
        '<button class="btn-abraco">' +
          '<i class="ti ti-heart" aria-hidden="true"></i> Abraço virtual ' +
          '<span class="contador-abraco">(0)</span>' +
        '</button>' +
        '<div class="card-resposta">' +
          '<input type="text" placeholder="Escreva uma mensagem de apoio..." maxlength="120">' +
          '<button type="button" aria-label="Enviar mensagem"><i class="ti ti-send"></i></button>' +
        '</div>' +
        '<div class="respostas-lista"></div>';

      /* Insere o post no TOPO do feed */
      if (feedColuna) feedColuna.insertBefore(novoCard, feedColuna.firstChild);

      /* Ativa interações no card recém-criado */
      ativarAbraco(novoCard);
      ativarResposta(novoCard);

      /* Registra para atualização de timestamps */
      var elTempo = novoCard.querySelector('.tempo');
      if (elTempo) postsCriados.push({ el: elTempo, criado: agora });

      /* Reaplica o filtro ativo */
      var filtroAtivo = document.querySelector('.com-filtro-btn.ativo');
      if (filtroAtivo) aplicarFiltro(filtroAtivo.getAttribute('data-tema-filtro'));

      /* Atualiza o stat de posts no hero */
      atualizarStatPosts(+1);

      /* Limpa o formulário */
      if (novoPostTexto)   novoPostTexto.value = '';
      if (novoPostAnonimo) novoPostAnonimo.checked = false;
      if (contadorFeed)    contadorFeed.textContent = '0/400';
      if (novoPostBotao)   novoPostBotao.disabled = true;

      mostrarToast('Publicado na comunidade 💜', 'sucesso');
    });
  }


  /* ============================================================
     9. ABRAÇO VIRTUAL (uma vez por card)
     Incrementa o contador e muda o ícone para coração preenchido.
     A classe .enviado impede múltiplos cliques.
  ============================================================ */

  function ativarAbraco(card) {
    var botao = card.querySelector('.btn-abraco');
    if (!botao) return;

    botao.addEventListener('click', function () {
      if (botao.classList.contains('enviado')) return; /* bloqueia re-clique */

      /* Incrementa o contador */
      var contador = botao.querySelector('.contador-abraco');
      if (contador) {
        var atual = parseInt(contador.textContent.replace(/\D/g, ''), 10) || 0;
        contador.textContent = '(' + (atual + 1) + ')';
      }

      /* Marca como enviado e troca ícone */
      botao.classList.add('enviado');
      var icone = botao.querySelector('i');
      if (icone) icone.className = 'ti ti-heart-filled'; /* ícone preenchido */

      mostrarToast('Abraço virtual enviado! 💜');
    });
  }


  /* ============================================================
     10. RESPOSTAS COM SCROLL AUTOMÁTICO   ← FIX 3
     Campo de texto + botão enviar em cada card do feed.
     Após enviar: scroll para a última mensagem, campo limpo.
  ============================================================ */

  function ativarResposta(card) {
    var input          = card.querySelector('.card-resposta input');
    var botaoEnviar    = card.querySelector('.card-resposta button');
    var listaRespostas = card.querySelector('.respostas-lista');

    if (!input || !botaoEnviar || !listaRespostas) return;

    function enviarResposta() {
      var texto = input.value.trim();
      if (!texto) return;

      /* Cria o elemento da mensagem com animação de entrada */
      var respostaEl = document.createElement('div');
      respostaEl.className = 'resposta-enviada';
      respostaEl.innerHTML =
        '<strong>Você:</strong> ' + escaparHTML(texto);

      listaRespostas.appendChild(respostaEl);

      /* ── [FIX 3] Scroll automático para a última mensagem ──
         Após inserir, move o scroll do container até o final
         para que a resposta recém-enviada seja sempre visível. */
      listaRespostas.scrollTop = listaRespostas.scrollHeight;

      input.value = '';
      input.focus();

      mostrarToast('Mensagem de apoio enviada!');
    }

    botaoEnviar.addEventListener('click', enviarResposta);

    /* Enter envia sem criar nova linha */
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') { e.preventDefault(); enviarResposta(); }
    });
  }

  /* Ativa abraço e resposta em todos os cards estáticos do HTML */
  document.querySelectorAll('.com-feed .comunidade-card').forEach(function (card) {
    ativarAbraco(card);
    ativarResposta(card);
  });


  /* ============================================================
     11. CARREGAR MAIS POSTS OCULTOS
  ============================================================ */

  var botaoCarregarMais = document.getElementById('feedCarregarMais');

  if (botaoCarregarMais) {
    botaoCarregarMais.addEventListener('click', function () {
      var ocultos = document.querySelectorAll('.com-feed .post-oculto');

      ocultos.forEach(function (post, i) {
        /* Pequeno delay escalonado por post para entrada suave */
        setTimeout(function () {
          post.classList.remove('post-oculto');
          post.style.display = 'flex';
          /* Adiciona animação de entrada */
          post.classList.add('post-novo-entrada');
          ativarAbraco(post);
          ativarResposta(post);
        }, i * 80);
      });

      /* Oculta o botão após revelar tudo */
      setTimeout(function () {
        botaoCarregarMais.style.display = 'none';
      }, ocultos.length * 80 + 100);

      /* Reaplica o filtro ativo */
      var filtroAtivo = document.querySelector('.com-filtro-btn.ativo');
      if (filtroAtivo) {
        setTimeout(function () {
          aplicarFiltro(filtroAtivo.getAttribute('data-tema-filtro'));
        }, ocultos.length * 80 + 120);
      }
    });
  }


  /* ============================================================
     12. TIMESTAMPS RELATIVOS DINÂMICOS
     Atualiza os elementos .tempo dos posts criados dinamicamente
     a cada 30 segundos para refletir o tempo decorrido.
  ============================================================ */

  /**
   * Atualiza todos os timestamps registrados em postsCriados[].
   * Só atualiza elementos que ainda estão no DOM.
   */
  function atualizarTimestamps() {
    postsCriados = postsCriados.filter(function (item) {
      /* Remove itens cujo elemento saiu do DOM */
      if (!document.body.contains(item.el)) return false;
      item.el.textContent = tempoRelativo(item.criado);
      return true;
    });
  }

  /* Atualiza a cada 30 segundos */
  setInterval(atualizarTimestamps, 30000);


  /* ============================================================
     13. STATS DO HERO — atualização dinâmica
     Os elementos .com-hero-stat[data-stat] recebem um delta
     sempre que um grupo ou post é criado pelo usuário.
  ============================================================ */

  /**
   * Incrementa o stat do hero identificado por [data-stat].
   * @param {string} tipo — 'grupos' | 'posts'
   * @param {number} delta — valor a somar
   */
  function atualizarStat(tipo, delta) {
    var el = document.querySelector('.com-hero-stat[data-stat="' + tipo + '"] strong');
    if (!el) return;

    /* Extrai número atual (remove pontos de milhar e letras) */
    var texto  = el.textContent.replace(/[^0-9]/g, '');
    var atual  = parseInt(texto, 10) || 0;
    var novo   = atual + delta;

    /* Formata com ponto de milhar */
    el.textContent = novo.toLocaleString('pt-BR');

    /* Micro-animação de "pulso" no número */
    el.animate([
      { transform: 'scale(1.3)', color: 'var(--Roxo-Calmo)' },
      { transform: 'scale(1)',   color: 'inherit'            }
    ], { duration: 400, easing: 'ease-out' });
  }

  function atualizarStatGrupos(delta) { atualizarStat('grupos', delta); }
  function atualizarStatPosts(delta)  { atualizarStat('posts',  delta); }


  /* ============================================================
     13-B. RESTAURAR GRUPOS DO localStorage AO CARREGAR
     Grupos criados em sessões anteriores voltam a aparecer
     na grade sem precisar criá-los de novo.
  ============================================================ */

  function restaurarGrupos() {
    var salvos;
    try {
      salvos = JSON.parse(localStorage.getItem('mb_grupos_criados') || '[]');
    } catch (e) { return; }

    if (!salvos.length) return;

    var gruposGrid = document.querySelector('.com-grupos-grid');
    if (!gruposGrid) return;

    var cardCriar = gruposGrid.querySelector(':scope > .com-grupo-card-criar');

    salvos.forEach(function (g) {
      var corClasse = CG_CORES[g.temas[0]] || 'cor-outro';
      var tagsTemas = (g.temas || [])
        .map(function (t) {
          return '<span class="com-grupo-tag-tema">' + (CG_ROTULOS[t] || t) + '</span>';
        }).join('');
      var tagPriv   = g.privacidade === 'privado'
        ? '<i class="ti ti-lock" style="font-size:11px;color:#aaa;margin-left:3px;"></i>'
        : '';
      var tagLimite = g.limite > 0
        ? '<span style="font-size:11px;color:#aaa;">máx. ' + g.limite + '</span>'
        : '';

      var card = document.createElement('div');
      card.className = 'com-grupo-card reveal';

      card.innerHTML =
        '<div class="com-grupo-icone ' + corClasse + '">' +
          '<i class="ti ' + escaparHTML(g.icone || 'ti-users') + '"></i>' +
        '</div>' +
        '<div class="com-grupo-temas-lista">' + tagsTemas + '</div>' +
        '<h3>' + escaparHTML(truncar(g.nome, 50)) + '</h3>' +
        '<p>' + escaparHTML(truncar(g.desc || 'Grupo criado pela comunidade.', 120)) + '</p>' +
        '<div class="com-grupo-rodape">' +
          '<span class="com-grupo-membros">' +
            '<i class="ti ti-users" aria-hidden="true"></i> 1 membro' + tagPriv +
          '</span>' +
          '<span class="com-grupo-novo-badge">' +
            '<i class="ti ti-circle-filled" style="font-size:8px;"></i> Meu grupo' +
          '</span>' +
          tagLimite +
        '</div>';

      if (cardCriar) {
        gruposGrid.insertBefore(card, cardCriar);
      } else {
        gruposGrid.appendChild(card);
      }
    });
  }

  restaurarGrupos();


  /* ============================================================
     FIM DO DOMContentLoaded
  ============================================================ */

});