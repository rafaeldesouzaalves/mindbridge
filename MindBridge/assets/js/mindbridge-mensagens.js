/* ================================================================
   MINDBRIDGE — MENSAGENS DIRETAS + GRUPOS (JavaScript v4)
   Arquivo: mindbridge-mensagens.js

   MUDANÇAS DESTA VERSÃO (v4)
   ───────────────────────────
   [NOVO] Detecção de crise em tempo real: palavras e frases
   associadas a ideação suicida, autolesão ou sofrimento intenso
   disparam um modal de emergência com botão direto ao CVV (188)
   e link para profissionais. A detecção é silenciosa (sem alerta
   intrusivo durante a digitação) e só é acionada no envio.

   [NOVO] Respostas simuladas contextuais: em vez de sortear
   sempre frases genéricas, o sistema detecta o "humor" da
   mensagem enviada (saudação, tristeza, ansiedade, gratidão,
   etc.) e escolhe uma resposta mais adequada ao contexto.

   [NOVO] Repertório de respostas muito ampliado e humanizado,
   com categorias: saudação, bem-estar negativo, tristeza,
   ansiedade, gratidão, encorajamento e genérico.

   [NOVO] Modal de crise (.cr-*) integrado ao HTML existente via
   injeção dinâmica — não requer mudanças no HTML base.

   ÍNDICE
   ──────
   0.  Dados base (contatos, conversas iniciais, grupos)
   1.  Utilitários (toast, escape HTML, tempo relativo, persistência)
   2.  Estado em memória
   3.  Abas "Diretas" / "Grupos" — alternância
   4.  Renderização da sidebar — conversas diretas
   5.  Busca e filtros da sidebar (diretas)
   6.  Renderização da sidebar — grupos
   7.  Abertura/fechamento de conversa (direta OU grupo)
   8.  Renderização de mensagens no corpo do chat
   9.  Envio de mensagem + resposta simulada (direta e grupo)
  10.  Detecção de crise + modal de emergência              ← NOVO
  11.  Respostas contextuais (repertório expandido)         ← NOVO
  12.  Menu "mais opções" (diretas e grupos)
  13.  Modal "Encontrar pessoas"
  14.  Modal "Procurar grupos"
  15.  Modal "Chamada" (voz / vídeo)
  16.  Leitura de parâmetros da URL (?aba=&grupo=)
  17.  Inicialização
================================================================ */

document.addEventListener('DOMContentLoaded', function () {

  /* ============================================================
     0. DADOS BASE
  ============================================================ */

  /* Pessoas sugeridas para iniciar conversa (modal "Encontrar pessoas") */
  var PESSOAS_SUGERIDAS = [
    { id: 'ana',       nome: 'Ana Gabrielly',  tema: 'ansiedade',       tag: 'Grupo: Ansiedade & Pânico' },
    { id: 'rafael',    nome: 'Rafael Lima',    tema: 'ansiedade',       tag: 'Grupo: Ansiedade & Pânico' },
    { id: 'camila',    nome: 'Camila Souza',   tema: 'burnout',         tag: 'Grupo: Burnout & Carreira' },
    { id: 'daniel',    nome: 'Daniel Alves',   tema: 'luto',            tag: 'Grupo: Luto & Perdas' },
    { id: 'beatriz',   nome: 'Beatriz Nunes',  tema: 'autoestima',      tag: 'Grupo: Autoestima' },
    { id: 'lucas',     nome: 'Lucas Tavares',  tema: 'relacionamentos', tag: 'Grupo: Relacionamentos' },
    { id: 'fernanda',  nome: 'Fernanda Costa', tema: 'ansiedade',       tag: 'Grupo: Ansiedade & Pânico' },
    { id: 'gabriel',   nome: 'Gabriel Rocha',  tema: 'sono',            tag: 'Grupo: Sono & Descanso' },
    { id: 'juliana',   nome: 'Juliana Prado',  tema: 'sono',            tag: 'Grupo: Sono & Descanso' },
    { id: 'pedro',     nome: 'Pedro Henrique', tema: 'burnout',         tag: 'Grupo: Burnout & Carreira' }
  ];

  /* Histórico simulado que aparece na primeira visita */
  var CONVERSAS_INICIAIS = [
    {
      id: 'ana', nome: 'Ana Gabrielly', online: true, favorita: false,
      mensagens: [
        { de: 'outro', texto: 'Oi! Vi sua mensagem no grupo de Ansiedade, tudo bem?', minutosAtras: 50 },
        { de: 'eu',    texto: 'Oi Ana! Tudo bem sim, melhorando aos poucos. E você?', minutosAtras: 45 },
        { de: 'outro', texto: 'Também. Hoje foi um dia mais leve. Obrigada por perguntar 💜', minutosAtras: 40 }
      ]
    },
    {
      id: 'rafael', nome: 'Rafael Lima', online: false, favorita: true,
      mensagens: [
        { de: 'outro', texto: 'A técnica de respiração 4-7-8 que você comentou realmente ajudou.', minutosAtras: 220 },
        { de: 'eu',    texto: 'Que bom! Eu uso bastante antes de dormir também.', minutosAtras: 200 }
      ]
    },
    {
      id: 'camila', nome: 'Camila Souza', online: true, favorita: false,
      mensagens: [
        { de: 'outro', texto: 'Como foi sua semana de volta ao trabalho?', minutosAtras: 30 }
      ]
    },
    {
      id: 'daniel', nome: 'Daniel Alves', online: false, favorita: false,
      mensagens: [
        { de: 'eu',    texto: 'Pensando em você hoje. Como você está?', minutosAtras: 1500 },
        { de: 'outro', texto: 'Obrigado por lembrar. Hoje está sendo um dia mais difícil, mas vou superando aos poucos.', minutosAtras: 1450 }
      ]
    }
  ];

  /* Catálogo completo de grupos da MindBridge */
  var TODOS_GRUPOS = [
    { id: 'ansiedade-panico', nome: 'Ansiedade & Pânico',   desc: 'Técnicas, desabafos e apoio para quem lida com crises de ansiedade no dia a dia.',       icone: 'ti-wind',      cor: 'cor-ansiedade', temas: ['ansiedade'], membros: 4180, moderador: 'Equipe MindBridge', privacidade: 'publico' },
    { id: 'burnout-carreira', nome: 'Burnout & Carreira',   desc: 'Para quem sente o peso do esgotamento profissional e busca formas de se recuperar.',      icone: 'ti-battery-1', cor: 'cor-burnout',   temas: ['burnout'],   membros: 2760, moderador: 'Equipe MindBridge', privacidade: 'publico' },
    { id: 'luto-perdas',      nome: 'Luto & Perdas',        desc: 'Um espaço gentil para falar sobre perdas, no seu tempo, sem pressa de "superar".',         icone: 'ti-feather',   cor: 'cor-luto',      temas: ['luto'],      membros: 1340, moderador: 'Equipe MindBridge', privacidade: 'publico' },
    { id: 'sono-descanso',    nome: 'Sono & Descanso',      desc: 'Trocas sobre insônia, rotina noturna e técnicas para uma mente mais calma à noite.',       icone: 'ti-moon',      cor: 'cor-sono',      temas: ['sono'],      membros: 980,  moderador: 'Equipe MindBridge', privacidade: 'publico' }
  ];

  /* Mapa de cor de cada grupo (hex) — igual ao da página Comunidade */
  var CORES_GRUPO = {
    'cor-ansiedade':       '#5A48C8',
    'cor-burnout':         '#2970C8',
    'cor-luto':            '#8B7BC4',
    'cor-sono':            '#1D9E75',
    'cor-autoestima':      '#E6A817',
    'cor-relacionamentos': '#E05C8A',
    'cor-outro':           '#888888'
  };

  /* Membros fictícios para simular mensagens de grupo */
  var MEMBROS_FICTICIOS = [
    'Ana Gabrielly', 'Rafael Lima', 'Camila Souza',
    'Daniel Alves',  'Beatriz Nunes', 'Gabriel Rocha'
  ];


  /* ============================================================
     1. UTILITÁRIOS
  ============================================================ */

  /** Escapa HTML para evitar XSS ao inserir conteúdo de usuário no DOM. */
  function escaparHTML(texto) {
    var div = document.createElement('div');
    div.textContent = texto;
    return div.innerHTML;
  }

  /* Toast de feedback rápido */
  var toastTimeout;
  function mostrarToast(mensagem, tipo) {
    var toast      = document.getElementById('toast');
    var toastTexto = document.getElementById('toastTexto');
    if (!toast) return;
    toastTexto.textContent = mensagem;
    toast.classList.remove('toast-erro', 'toast-sucesso');
    if (tipo === 'erro')    toast.classList.add('toast-erro');
    if (tipo === 'sucesso') toast.classList.add('toast-sucesso');
    toast.classList.add('visivel');
    clearTimeout(toastTimeout);
    toastTimeout = setTimeout(function () {
      toast.classList.remove('visivel', 'toast-erro', 'toast-sucesso');
    }, 2600);
  }

  /** Formata Date → "HH:MM". */
  function horaCurta(data) {
    return data.getHours().toString().padStart(2, '0') + ':' +
           data.getMinutes().toString().padStart(2, '0');
  }

  /** Texto relativo curto para a sidebar (ex: "5 min", "2h", "Ontem"). */
  function tempoRelativoCurto(data) {
    var diff = Math.floor((Date.now() - data.getTime()) / 60000);
    if (diff < 1)    return 'agora';
    if (diff < 60)   return diff + ' min';
    if (diff < 1440) return Math.floor(diff / 60) + 'h';
    if (diff < 2880) return 'Ontem';
    return Math.floor(diff / 1440) + 'd';
  }

  /** Retorna até 2 iniciais em maiúsculas de um nome. */
  function iniciaisDe(nome) {
    return nome.split(' ').slice(0, 2)
      .map(function (p) { return p[0]; })
      .join('').toUpperCase();
  }

  /* ── Persistência em localStorage ─────────────────────────── */

  function salvarConversas() {
    try { localStorage.setItem('mb_conversas', JSON.stringify(estado.conversas)); } catch (e) {}
  }
  function carregarConversas() {
    try {
      var s = localStorage.getItem('mb_conversas');
      return s ? JSON.parse(s) : null;
    } catch (e) { return null; }
  }

  /* Grupos participando — mesma chave usada por comunidade-grupos.js */
  function lerGruposParticipando() {
    try { return JSON.parse(localStorage.getItem('mb_grupos_participando') || '[]'); } catch (e) { return []; }
  }
  function salvarGruposParticipando(lista) {
    try { localStorage.setItem('mb_grupos_participando', JSON.stringify(lista)); } catch (e) {}
  }

  function salvarMensagensGrupos() {
    try { localStorage.setItem('mb_grupos_mensagens', JSON.stringify(estado.mensagensGrupos)); } catch (e) {}
  }
  function carregarMensagensGrupos() {
    try {
      var s = localStorage.getItem('mb_grupos_mensagens');
      return s ? JSON.parse(s) : null;
    } catch (e) { return null; }
  }


  /* ============================================================
     2. ESTADO EM MEMÓRIA
  ============================================================ */

  var estado = {
    conversas:        [],      /* conversas diretas com timestamps ISO */
    grupos:           [],      /* grupos participando */
    mensagensGrupos:  {},      /* { grupoId: [{ de, autor, texto, ts }] } */
    abaAtiva:         'diretas',
    conversaAtivaId:  null,
    grupoAtivoId:     null,
    filtroAtual:      'todas',
    buscaAtual:       ''
  };

  /** Converte minutosAtras → timestamps ISO absolutos (primeira visita). */
  function montarConversasIniciais() {
    return CONVERSAS_INICIAIS.map(function (c) {
      return {
        id: c.id, nome: c.nome, online: c.online,
        favorita: c.favorita, naoLidas: 0,
        mensagens: c.mensagens.map(function (m) {
          return {
            de: m.de, texto: m.texto,
            ts: new Date(Date.now() - m.minutosAtras * 60000).toISOString()
          };
        })
      };
    });
  }

  /** Histórico inicial para um grupo recém-entrado (não vazio na primeira abertura). */
  function montarHistoricoInicialGrupo(grupo) {
    var autor1 = MEMBROS_FICTICIOS[Math.floor(Math.random() * MEMBROS_FICTICIOS.length)];
    return [
      {
        de: 'outro', autor: grupo.moderador || 'Equipe MindBridge',
        texto: 'Bem-vindo(a) ao grupo "' + grupo.nome + '"! Esse é um espaço de respeito e escuta — sinta-se à vontade para compartilhar no seu tempo.',
        ts: new Date(Date.now() - 90 * 60000).toISOString()
      },
      {
        de: 'outro', autor: autor1,
        texto: 'Oi pessoal, que bom ter gente nova por aqui 💜',
        ts: new Date(Date.now() - 70 * 60000).toISOString()
      }
    ];
  }

  function inicializarEstado() {
    var salvas = carregarConversas();
    estado.conversas = (salvas && salvas.length) ? salvas : montarConversasIniciais();
    estado.grupos    = lerGruposParticipando();

    var msgSalvas = carregarMensagensGrupos();
    estado.mensagensGrupos = msgSalvas || {};

    /* Garante histórico inicial para grupos sem mensagens */
    estado.grupos.forEach(function (g) {
      if (!estado.mensagensGrupos[g.id] || !estado.mensagensGrupos[g.id].length) {
        estado.mensagensGrupos[g.id] = montarHistoricoInicialGrupo(g);
      }
    });
    salvarMensagensGrupos();
  }

  function buscarConversa(id) {
    return estado.conversas.find(function (c) { return c.id === id; });
  }
  function buscarGrupo(id) {
    return estado.grupos.find(function (g) { return g.id === id; });
  }
  function ultimaMensagem(conversa) {
    return conversa.mensagens.length ? conversa.mensagens[conversa.mensagens.length - 1] : null;
  }
  function ultimaMensagemGrupo(grupoId) {
    var msgs = estado.mensagensGrupos[grupoId] || [];
    return msgs.length ? msgs[msgs.length - 1] : null;
  }


  /* ============================================================
     3. ABAS "DIRETAS" / "GRUPOS" — ALTERNÂNCIA
  ============================================================ */

  var abaBtnDiretas  = document.getElementById('abaBtnDiretas');
  var abaBtnGrupos   = document.getElementById('abaBtnGrupos');
  var painelDiretas  = document.getElementById('painelDiretas');
  var painelGrupos   = document.getElementById('painelGrupos');
  var abaGruposBadge = document.getElementById('abaGruposBadge');

  function trocarAba(aba) {
    estado.abaAtiva = aba;
    var ehGrupos = aba === 'grupos';
    abaBtnDiretas.classList.toggle('ativa', !ehGrupos);
    abaBtnDiretas.setAttribute('aria-selected', String(!ehGrupos));
    abaBtnGrupos.classList.toggle('ativa', ehGrupos);
    abaBtnGrupos.setAttribute('aria-selected', String(ehGrupos));
    painelDiretas.hidden = ehGrupos;
    painelGrupos.hidden  = !ehGrupos;
    if (ehGrupos) { renderizarListaGrupos(); } else { renderizarLista(); }
  }

  if (abaBtnDiretas) abaBtnDiretas.addEventListener('click', function () { trocarAba('diretas'); });
  if (abaBtnGrupos)  abaBtnGrupos.addEventListener('click',  function () { trocarAba('grupos');  });

  function atualizarBadgeGrupos() {
    if (!abaGruposBadge) return;
    if (estado.grupos.length > 0) {
      abaGruposBadge.hidden = false;
      abaGruposBadge.textContent = estado.grupos.length;
    } else {
      abaGruposBadge.hidden = true;
    }
  }


  /* ============================================================
     4. RENDERIZAÇÃO DA SIDEBAR — CONVERSAS DIRETAS
  ============================================================ */

  var msgLista      = document.getElementById('msgLista');
  var msgListaVazia = document.getElementById('msgListaVazia');

  function ordenarConversasPorRecencia(lista) {
    return lista.slice().sort(function (a, b) {
      var ua = ultimaMensagem(a), ub = ultimaMensagem(b);
      var ta = ua ? new Date(ua.ts).getTime() : 0;
      var tb = ub ? new Date(ub.ts).getTime() : 0;
      return tb - ta;
    });
  }

  function renderizarLista() {
    if (!msgLista) return;
    var lista = ordenarConversasPorRecencia(estado.conversas);

    /* Filtros por chip */
    if (estado.filtroAtual === 'nao-lidas') {
      lista = lista.filter(function (c) { return c.naoLidas > 0; });
    } else if (estado.filtroAtual === 'favoritas') {
      lista = lista.filter(function (c) { return c.favorita; });
    }

    /* Filtro por texto */
    if (estado.buscaAtual.trim()) {
      var termo = estado.buscaAtual.trim().toLowerCase();
      lista = lista.filter(function (c) { return c.nome.toLowerCase().indexOf(termo) !== -1; });
    }

    msgLista.innerHTML = '';

    if (!lista.length) {
      msgListaVazia.hidden = false;
      return;
    }
    msgListaVazia.hidden = true;

    lista.forEach(function (c) {
      var ultima  = ultimaMensagem(c);
      var preview = ultima ? (ultima.de === 'eu' ? 'Você: ' : '') + ultima.texto : 'Comece a conversar...';
      var hora    = ultima ? tempoRelativoCurto(new Date(ultima.ts)) : '';

      var item = document.createElement('button');
      item.type = 'button';
      item.className = 'msg-item' +
        (estado.grupoAtivoId === null && c.id === estado.conversaAtivaId ? ' ativo' : '') +
        (c.naoLidas > 0 ? ' nao-lida' : '');
      item.setAttribute('data-conversa-id', c.id);
      item.innerHTML =
        '<div class="msg-item-avatar-wrap">' +
          '<div class="msg-avatar">' + escaparHTML(iniciaisDe(c.nome)) + '</div>' +
          '<span class="msg-item-status-ponto' + (c.online ? '' : ' offline') + '"></span>' +
        '</div>' +
        '<div class="msg-item-conteudo">' +
          '<div class="msg-item-linha-topo">' +
            '<span class="msg-item-nome">' +
              (c.favorita ? '<i class="ti ti-star-filled"></i>' : '') +
              escaparHTML(c.nome) +
            '</span>' +
            '<span class="msg-item-hora">' + escaparHTML(hora) + '</span>' +
          '</div>' +
          '<div class="msg-item-linha-baixo">' +
            '<span class="msg-item-preview">' + escaparHTML(preview) + '</span>' +
            (c.naoLidas > 0 ? '<span class="msg-item-badge">' + c.naoLidas + '</span>' : '') +
          '</div>' +
        '</div>';

      item.addEventListener('click', function () { abrirConversa(c.id); });
      msgLista.appendChild(item);
    });
  }


  /* ============================================================
     5. BUSCA E FILTROS DA SIDEBAR (diretas)
  ============================================================ */

  var msgBuscaInput = document.getElementById('msgBuscaInput');
  if (msgBuscaInput) {
    msgBuscaInput.addEventListener('input', function () {
      estado.buscaAtual = msgBuscaInput.value;
      renderizarLista();
    });
  }

  document.querySelectorAll('.msg-filtro-chip').forEach(function (chip) {
    chip.addEventListener('click', function () {
      document.querySelectorAll('.msg-filtro-chip').forEach(function (c) { c.classList.remove('ativo'); });
      chip.classList.add('ativo');
      estado.filtroAtual = chip.getAttribute('data-filtro-conversa');
      renderizarLista();
    });
  });


  /* ============================================================
     6. RENDERIZAÇÃO DA SIDEBAR — GRUPOS
  ============================================================ */

  var listaGrupos      = document.getElementById('listaGrupos');
  var listaGruposVazia = document.getElementById('listaGruposVazia');

  function ordenarGruposPorRecencia(lista) {
    return lista.slice().sort(function (a, b) {
      var ua = ultimaMensagemGrupo(a.id), ub = ultimaMensagemGrupo(b.id);
      var ta = ua ? new Date(ua.ts).getTime() : 0;
      var tb = ub ? new Date(ub.ts).getTime() : 0;
      return tb - ta;
    });
  }

  function renderizarListaGrupos() {
    if (!listaGrupos) return;
    atualizarBadgeGrupos();

    var lista = ordenarGruposPorRecencia(estado.grupos);
    listaGrupos.innerHTML = '';

    if (!lista.length) {
      listaGruposVazia.hidden = false;
      return;
    }
    listaGruposVazia.hidden = true;

    lista.forEach(function (g) {
      var ultima  = ultimaMensagemGrupo(g.id);
      var preview = ultima
        ? (ultima.de === 'eu' ? 'Você: ' : (ultima.autor ? ultima.autor + ': ' : '')) + ultima.texto
        : 'Nenhuma mensagem ainda.';
      var hora   = ultima ? tempoRelativoCurto(new Date(ultima.ts)) : '';
      var corHex = CORES_GRUPO[g.cor] || CORES_GRUPO['cor-outro'];

      var item = document.createElement('button');
      item.type = 'button';
      item.className = 'msg-item' + (g.id === estado.grupoAtivoId ? ' ativo' : '');
      item.setAttribute('data-grupo-id', g.id);
      item.innerHTML =
        '<div class="msg-item-avatar-wrap">' +
          '<div class="msg-avatar msg-avatar-grupo" style="background-color:' + corHex + '">' +
            '<i class="ti ' + escaparHTML(g.icone || 'ti-users') + '"></i>' +
          '</div>' +
        '</div>' +
        '<div class="msg-item-conteudo">' +
          '<div class="msg-item-linha-topo">' +
            '<span class="msg-item-nome">' + escaparHTML(g.nome) + '</span>' +
            '<span class="msg-item-hora">'  + escaparHTML(hora)  + '</span>' +
          '</div>' +
          '<div class="msg-item-linha-baixo">' +
            '<span class="msg-item-preview">' + escaparHTML(preview) + '</span>' +
          '</div>' +
        '</div>';

      item.addEventListener('click', function () { abrirGrupo(g.id); });
      listaGrupos.appendChild(item);
    });
  }

  var btnProcurarGrupos      = document.getElementById('btnProcurarGrupos');
  var btnProcurarGruposVazio = document.getElementById('btnProcurarGruposVazio');
  if (btnProcurarGrupos)      btnProcurarGrupos.addEventListener('click',      abrirModalGrupos);
  if (btnProcurarGruposVazio) btnProcurarGruposVazio.addEventListener('click', abrirModalGrupos);


  /* ============================================================
     7. ABERTURA/FECHAMENTO DE CONVERSA (direta OU grupo)
  ============================================================ */

  var msgShell          = document.querySelector('.msg-shell');
  var msgChatVazio      = document.getElementById('msgChatVazio');
  var msgConversaBox    = document.getElementById('msgConversa');
  var msgConversaNome   = document.getElementById('msgConversaNome');
  var msgConversaAvatar = document.getElementById('msgConversaAvatar');
  var msgConversaStatus = document.getElementById('msgConversaStatus');
  var msgVoltar         = document.getElementById('msgVoltar');
  var btnLigarEl        = document.getElementById('btnLigar');
  var btnVideoEl        = document.getElementById('btnVideo');
  var msgMenuMais       = document.getElementById('msgMenuMais');
  var msgMenuMaisGrupo  = document.getElementById('msgMenuMaisGrupo');

  /** Ajusta botões/menus de acordo com o tipo de conversa (direta ou grupo). */
  function ajustarCabecalhoParaTipo(ehGrupo) {
    btnLigarEl.classList.toggle('oculto-em-grupo', ehGrupo);
    btnVideoEl.classList.toggle('oculto-em-grupo', ehGrupo);
    msgMenuMais.style.display      = ehGrupo ? 'none' : '';
    msgMenuMaisGrupo.style.display = ehGrupo ? '' : 'none';
  }

  function abrirConversa(id) {
    var conversa = buscarConversa(id);
    if (!conversa) return;

    estado.conversaAtivaId = id;
    estado.grupoAtivoId    = null;
    conversa.naoLidas      = 0;

    ajustarCabecalhoParaTipo(false);

    msgConversaNome.textContent          = conversa.nome;
    msgConversaAvatar.className          = 'msg-avatar';
    msgConversaAvatar.style.backgroundColor = '';
    msgConversaAvatar.innerHTML          = escaparHTML(iniciaisDe(conversa.nome));
    msgConversaStatus.className          = 'msg-conversa-status' + (conversa.online ? '' : ' offline');
    msgConversaStatus.innerHTML          =
      '<span class="msg-status-ponto"></span> ' + (conversa.online ? 'Online agora' : 'Offline');

    var btnFav = document.getElementById('btnFavoritar');
    if (btnFav) {
      btnFav.classList.toggle('ativo', !!conversa.favorita);
      btnFav.querySelector('span').textContent = conversa.favorita ? 'Remover dos favoritos' : 'Favoritar conversa';
    }

    msgChatVazio.hidden    = true;
    msgConversaBox.hidden  = false;
    if (msgShell) msgShell.classList.add('mostrando-chat');

    renderizarMensagens(montarMensagensParaExibicao(conversa.mensagens, false));
    renderizarLista();
    salvarConversas();

    var ta = document.getElementById('msgTextarea');
    if (ta) setTimeout(function () { ta.focus({ preventScroll: true }); }, 150);
  }

  function abrirGrupo(id) {
    var grupo = buscarGrupo(id);
    if (!grupo) return;

    estado.grupoAtivoId    = id;
    estado.conversaAtivaId = null;

    if (!estado.mensagensGrupos[id]) {
      estado.mensagensGrupos[id] = montarHistoricoInicialGrupo(grupo);
    }

    ajustarCabecalhoParaTipo(true);

    var corHex = CORES_GRUPO[grupo.cor] || CORES_GRUPO['cor-outro'];
    msgConversaNome.textContent          = grupo.nome;
    msgConversaAvatar.className          = 'msg-avatar msg-avatar-grupo';
    msgConversaAvatar.style.backgroundColor = corHex;
    msgConversaAvatar.innerHTML          = '<i class="ti ' + escaparHTML(grupo.icone || 'ti-users') + '"></i>';
    msgConversaStatus.className          = 'msg-conversa-status grupo';
    msgConversaStatus.innerHTML          =
      '<span class="msg-status-ponto"></span> ' +
      (grupo.membros ? grupo.membros.toLocaleString('pt-BR') : '1') +
      (grupo.membros === 1 ? ' membro' : ' membros');

    msgChatVazio.hidden   = true;
    msgConversaBox.hidden = false;
    if (msgShell) msgShell.classList.add('mostrando-chat');

    /* Garante aba "Grupos" selecionada */
    if (estado.abaAtiva !== 'grupos') trocarAba('grupos');

    renderizarMensagens(montarMensagensParaExibicao(estado.mensagensGrupos[id], true));
    renderizarListaGrupos();
    salvarMensagensGrupos();

    var ta = document.getElementById('msgTextarea');
    if (ta) setTimeout(function () { ta.focus({ preventScroll: true }); }, 150);
  }

  if (msgVoltar && msgShell) {
    msgVoltar.addEventListener('click', function () {
      msgShell.classList.remove('mostrando-chat');
    });
  }

  var btnEncontrarVazio = document.getElementById('btnEncontrarVazio');
  if (btnEncontrarVazio) btnEncontrarVazio.addEventListener('click', abrirModalPessoas);


  /* ============================================================
     8. RENDERIZAÇÃO DE MENSAGENS NO CORPO DO CHAT
  ============================================================ */

  var msgCorpo = document.getElementById('msgCorpo');

  function montarMensagensParaExibicao(mensagens, ehGrupo) {
    return mensagens.map(function (m) {
      return { de: m.de, autor: ehGrupo ? m.autor : null, texto: m.texto, ts: m.ts };
    });
  }

  function formatarDivisorData(data) {
    var hoje  = new Date();
    var ontem = new Date(); ontem.setDate(hoje.getDate() - 1);
    var mesmodia = function (a, b) {
      return a.getFullYear() === b.getFullYear() &&
             a.getMonth()    === b.getMonth()    &&
             a.getDate()     === b.getDate();
    };
    if (mesmodia(data, hoje))  return 'Hoje';
    if (mesmodia(data, ontem)) return 'Ontem';
    return data.toLocaleDateString('pt-BR');
  }

  function renderizarMensagens(mensagens) {
    msgCorpo.innerHTML = '';
    var ultimoDivisor  = null;

    mensagens.forEach(function (m) {
      var data       = new Date(m.ts);
      var rotuloData = formatarDivisorData(data);

      /* Divisor de data */
      if (rotuloData !== ultimoDivisor) {
        var divisor = document.createElement('div');
        divisor.className   = 'msg-data-divisor';
        divisor.textContent = rotuloData;
        msgCorpo.appendChild(divisor);
        ultimoDivisor = rotuloData;
      }

      var linha = document.createElement('div');
      linha.className = 'msg-bolha-linha ' + (m.de === 'eu' ? 'enviada' : 'recebida');

      var autorHtml = (m.autor && m.de !== 'eu')
        ? '<span class="msg-bolha-autor">' + escaparHTML(m.autor) + '</span>'
        : '';

      linha.innerHTML =
        '<div class="msg-bolha-coluna">' +
          autorHtml +
          '<div class="msg-bolha">' +
            escaparHTML(m.texto) +
            '<span class="msg-bolha-hora">' + horaCurta(data) + '</span>' +
          '</div>' +
        '</div>';
      msgCorpo.appendChild(linha);
    });

    rolarParaFinal();
  }

  function rolarParaFinal() {
    requestAnimationFrame(function () { msgCorpo.scrollTop = msgCorpo.scrollHeight; });
  }


  /* ============================================================
     9. ENVIO DE MENSAGEM + RESPOSTA SIMULADA (direta e grupo)
  ============================================================ */

  var msgTextarea        = document.getElementById('msgTextarea');
  var msgEnviarBtn       = document.getElementById('msgEnviarBtn');
  var msgDigitando       = document.getElementById('msgDigitando');
  var msgDigitandoAvatar = document.getElementById('msgDigitandoAvatar');

  if (msgTextarea) {
    msgTextarea.addEventListener('input', function () {
      msgEnviarBtn.disabled      = msgTextarea.value.trim().length === 0;
      msgTextarea.style.height   = 'auto';
      msgTextarea.style.height   = Math.min(msgTextarea.scrollHeight, 110) + 'px';
    });

    msgTextarea.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        enviarMensagem();
      }
    });
  }

  if (msgEnviarBtn) msgEnviarBtn.addEventListener('click', enviarMensagem);

  function enviarMensagem() {
    var texto = msgTextarea.value.trim();
    if (!texto) return;

    /* ── VERIFICAÇÃO DE CRISE antes de qualquer outra coisa ── */
    if (detectarCrise(texto)) {
      /* Salva o texto para exibir no chat depois que o modal for fechado */
      estado._textoPendente = texto;
      abrirModalCrise();
      return; /* interrompe o envio normal */
    }

    /* Envio normal */
    msgTextarea.value        = '';
    msgTextarea.style.height = 'auto';
    msgEnviarBtn.disabled    = true;

    if (estado.grupoAtivoId)    { enviarMensagemGrupo(texto);  }
    else if (estado.conversaAtivaId) { enviarMensagemDireta(texto); }
  }

  function enviarMensagemDireta(texto) {
    var conversa = buscarConversa(estado.conversaAtivaId);
    if (!conversa) return;

    conversa.mensagens.push({ de: 'eu', texto: texto, ts: new Date().toISOString() });
    renderizarMensagens(montarMensagensParaExibicao(conversa.mensagens, false));
    renderizarLista();
    salvarConversas();
    simularRespostaDireta(conversa, texto);
  }

  function simularRespostaDireta(conversa, textoEnviado) {
    if (!conversa.online) return;

    msgDigitandoAvatar.className          = 'msg-avatar msg-avatar-mini';
    msgDigitandoAvatar.style.backgroundColor = '';
    msgDigitandoAvatar.textContent        = iniciaisDe(conversa.nome);
    msgDigitando.hidden = false;
    rolarParaFinal();

    var atraso = 1400 + Math.random() * 1600;
    setTimeout(function () {
      msgDigitando.hidden = true;

      /* Escolhe resposta contextual em vez de aleatória pura */
      var respostaTexto = escolherRespostaContextual(textoEnviado);

      conversa.mensagens.push({ de: 'outro', texto: respostaTexto, ts: new Date().toISOString() });

      if (estado.conversaAtivaId !== conversa.id) {
        conversa.naoLidas = (conversa.naoLidas || 0) + 1;
        renderizarLista();
        salvarConversas();
        return;
      }

      renderizarMensagens(montarMensagensParaExibicao(conversa.mensagens, false));
      renderizarLista();
      salvarConversas();
    }, atraso);
  }

  function enviarMensagemGrupo(texto) {
    var grupoId = estado.grupoAtivoId;
    var grupo   = buscarGrupo(grupoId);
    if (!grupo) return;

    if (!estado.mensagensGrupos[grupoId]) estado.mensagensGrupos[grupoId] = [];
    estado.mensagensGrupos[grupoId].push({
      de: 'eu', autor: 'Você', texto: texto, ts: new Date().toISOString()
    });

    renderizarMensagens(montarMensagensParaExibicao(estado.mensagensGrupos[grupoId], true));
    renderizarListaGrupos();
    salvarMensagensGrupos();
    simularRespostaGrupo(grupoId, texto);
  }

  function simularRespostaGrupo(grupoId, textoEnviado) {
    var grupo = buscarGrupo(grupoId);
    if (!grupo) return;

    var autor = MEMBROS_FICTICIOS[Math.floor(Math.random() * MEMBROS_FICTICIOS.length)];
    msgDigitandoAvatar.className          = 'msg-avatar msg-avatar-mini';
    msgDigitandoAvatar.style.backgroundColor = '';
    msgDigitandoAvatar.textContent        = iniciaisDe(autor);
    msgDigitando.hidden = false;
    rolarParaFinal();

    var atraso = 1500 + Math.random() * 1800;
    setTimeout(function () {
      msgDigitando.hidden = true;
      var respostaTexto = escolherRespostaContextual(textoEnviado);

      if (!estado.mensagensGrupos[grupoId]) estado.mensagensGrupos[grupoId] = [];
      estado.mensagensGrupos[grupoId].push({
        de: 'outro', autor: autor, texto: respostaTexto, ts: new Date().toISOString()
      });

      if (estado.grupoAtivoId !== grupoId) {
        renderizarListaGrupos();
        salvarMensagensGrupos();
        return;
      }

      renderizarMensagens(montarMensagensParaExibicao(estado.mensagensGrupos[grupoId], true));
      renderizarListaGrupos();
      salvarMensagensGrupos();
    }, atraso);
  }


  /* ============================================================
    10. DETECÇÃO DE CRISE + MODAL DE EMERGÊNCIA              ← NOVO
    ─────────────────────────────────────────────────────────────
    detectarCrise() verifica se o texto enviado contém termos
    associados a ideação suicida, automutilação ou sofrimento
    agudo. A lista é ampla para cobrir variações de escrita
    informal (gírias, abreviações, erros de ortografia comuns).

    Quando detectado:
    • O envio é interrompido (o texto fica no estado._textoPendente)
    • Um modal de emergência (.cr-overlay) é exibido com:
        – Mensagem acolhedora e sem julgamento
        – Botão primário para ligar ao CVV (188)
        – Botão secundário para ver profissionais
        – Botão "Continuar assim mesmo" que envia o texto normalmente
    O modal é injetado no DOM na primeira vez que é necessário,
    sem depender de markup no HTML base.
  ============================================================ */

  /* ── Termos e padrões de crise ──────────────────────────── */

  /* Cada entrada pode ser uma string (match exato de substring,
     case-insensitive) ou um RegExp para padrões mais flexíveis. */
  var TERMOS_CRISE = [
    /* Ideação suicida — formas diretas */
    'quero me matar', 'vou me matar', 'quero morrer', 'vou morrer',
    'penso em me matar', 'penso em morrer', 'quero acabar com tudo',
    'quero dar fim à minha vida', 'quero dar fim a minha vida',
    'não quero mais viver', 'nao quero mais viver',
    'não vale a pena viver', 'nao vale a pena viver',
    'não quero mais estar aqui', 'nao quero mais estar aqui',
    'prefiro estar morto', 'prefiro estar morta',
    'seria melhor se eu não existisse', 'seria melhor se eu nao existisse',
    'todos estariam melhor sem mim',
    'cansado de viver', 'cansada de viver',
    'sem vontade de viver', 'sem vontade de continuar',

    /* Ideação suicida — formas indiretas / eufemismos comuns */
    'suicídio', 'suicidio', 'suicidar', 'me suicidar',
    'tirar minha vida', 'acabar com minha vida',
    'acabar com a minha vida', 'pôr fim à vida', 'por fim a vida',
    'desaparecer para sempre', 'quero desaparecer',
    'dormir e nunca acordar', 'dormir pra nunca mais acordar',
    'não acordar mais', 'nao acordar mais',

    /* Autolesão */
    'me machucar', 'me cortar', 'me ferir', 'me bater',
    'quero me machucar', 'vou me machucar', 'vou me cortar',
    'autolesão', 'autolesao', 'automutilação', 'automutilacao',
    'cortar os pulsos', 'cortar o pulso',

    /* Expressões de desespero agudo */
    'não aguento mais', 'nao aguento mais',
    'não consigo mais', 'nao consigo mais',
    'não tem mais saída', 'nao tem mais saida',
    'sem saída', 'sem saida', 'não tenho mais esperança',
    'nao tenho mais esperanca',
    'odeio minha vida', 'odeio a minha vida',
    'não vejo mais sentido', 'nao vejo mais sentido',
    'perdi o sentido', 'sem sentido em viver',

    /* Regex para variações de digitação */
    /quero\s+(me\s+)?mat[ae]r/i,
    /vou\s+(me\s+)?mat[ae]r/i,
    /pens(o|ando)\s+em\s+(me\s+)?mat[ae]r/i,
    /n[aã]o\s+quero\s+(mais\s+)?viver/i,
    /suicid[io]/i,
    /automu?tila/i,
    /me\s+cort(ar?|ando)/i,
    /acabar\s+com\s+(minha|a\s+minha)\s+vida/i
  ];

  /**
   * Retorna true se o texto contém algum termo ou padrão de crise.
   * Normaliza o texto (lowercase, sem acentos extras) antes de comparar.
   */
  function detectarCrise(texto) {
    var t = texto.toLowerCase();
    for (var i = 0; i < TERMOS_CRISE.length; i++) {
      var termo = TERMOS_CRISE[i];
      if (termo instanceof RegExp) {
        if (termo.test(t)) return true;
      } else {
        if (t.indexOf(termo) !== -1) return true;
      }
    }
    return false;
  }

  /* ── Modal de crise — injeção dinâmica no DOM ──────────── */

  var crOverlay = null; /* referência criada na primeira chamada */

  /**
   * Cria e injeta o modal de crise no <body> se ainda não existir,
   * depois o exibe. Feito por injeção dinâmica para não exigir
   * alterações no HTML base.
   */
  function abrirModalCrise() {
    if (!crOverlay) {
      criarModalCrise();
    }
    crOverlay.classList.add('aberto');
    document.body.style.overflow = 'hidden';
    /* Foco acessível no botão principal */
    var btnCvv = document.getElementById('crBtnCvv');
    if (btnCvv) setTimeout(function () { btnCvv.focus(); }, 80);
  }

  function fecharModalCrise(enviarTexto) {
    if (!crOverlay) return;
    crOverlay.classList.remove('aberto');
    document.body.style.overflow = '';

    if (enviarTexto && estado._textoPendente) {
      /* Usuário escolheu continuar — envia a mensagem normalmente */
      var texto            = estado._textoPendente;
      estado._textoPendente = null;

      msgTextarea.value        = '';
      msgTextarea.style.height = 'auto';
      msgEnviarBtn.disabled    = true;

      if (estado.grupoAtivoId)         { enviarMensagemGrupo(texto);  }
      else if (estado.conversaAtivaId) { enviarMensagemDireta(texto); }
    } else {
      /* Usuário foi para CVV/profissional — devolve o texto ao campo */
      if (estado._textoPendente) {
        msgTextarea.value     = estado._textoPendente;
        msgEnviarBtn.disabled = false;
      }
      estado._textoPendente = null;
    }
  }

  /** Injeta o HTML e CSS do modal de crise uma única vez. */
  function criarModalCrise() {
    /* ── CSS do modal ── */
    var style = document.createElement('style');
    style.textContent = [
      /* Overlay escuro que cobre tudo */
      '.cr-overlay{',
        'position:fixed;inset:0;',
        'background:rgba(20,14,46,0.88);',
        'z-index:1400;',
        'display:flex;align-items:center;justify-content:center;',
        'padding:20px;',
        'opacity:0;pointer-events:none;',
        'transition:opacity 0.22s ease;',
      '}',
      '.cr-overlay.aberto{opacity:1;pointer-events:all;}',

      /* Caixa central */
      '.cr-modal{',
        'background:#fff;',
        'border-radius:22px;',
        'max-width:420px;width:100%;',
        'padding:32px 28px 28px;',
        'text-align:center;',
        'box-shadow:0 24px 60px rgba(0,0,0,0.25);',
        'transform:scale(0.94);opacity:0;',
        'transition:transform 0.22s cubic-bezier(0.34,1.56,0.64,1),opacity 0.22s ease;',
      '}',
      '.cr-overlay.aberto .cr-modal{transform:scale(1);opacity:1;}',

      /* Ícone de coração no topo */
      '.cr-icone{',
        'width:64px;height:64px;border-radius:50%;',
        'background:#FFF0F0;',
        'display:flex;align-items:center;justify-content:center;',
        'font-size:28px;color:#E05C8A;',
        'margin:0 auto 18px;',
      '}',

      /* Título */
      '.cr-titulo{',
        'font-family:"Lora",serif;',
        'font-size:20px;font-weight:500;',
        'color:#2d1f5e;',
        'margin-bottom:10px;line-height:1.3;',
      '}',

      /* Texto descritivo */
      '.cr-desc{',
        'font-size:14px;line-height:1.65;',
        'color:#555;',
        'margin-bottom:22px;',
      '}',

      /* Botão principal — CVV */
      '.cr-btn-cvv{',
        'display:flex;align-items:center;justify-content:center;gap:9px;',
        'width:100%;padding:14px 20px;',
        'background:#E74C3C;color:#fff;',
        'border:none;border-radius:14px;',
        'font-size:16px;font-weight:600;font-family:inherit;',
        'cursor:pointer;',
        'text-decoration:none;',
        'transition:background 0.18s,transform 0.18s;',
        'margin-bottom:10px;',
      '}',
      '.cr-btn-cvv:hover{background:#c0392b;transform:translateY(-1px);}',
      '.cr-btn-cvv i{font-size:19px;}',

      /* Botão secundário — profissionais */
      '.cr-btn-prof{',
        'display:flex;align-items:center;justify-content:center;gap:8px;',
        'width:100%;padding:12px 20px;',
        'background:#f0eefa;color:#5A48C8;',
        'border:none;border-radius:14px;',
        'font-size:14px;font-weight:500;font-family:inherit;',
        'cursor:pointer;',
        'text-decoration:none;',
        'transition:background 0.18s,transform 0.18s;',
        'margin-bottom:14px;',
      '}',
      '.cr-btn-prof:hover{background:#e0d9f7;transform:translateY(-1px);}',

      /* Divisor */
      '.cr-ou{font-size:12px;color:#bbb;margin-bottom:12px;}',

      /* Botão "continuar assim mesmo" — discreto */
      '.cr-btn-continuar{',
        'background:none;border:none;',
        'color:#aaa;font-size:12.5px;font-family:inherit;',
        'cursor:pointer;text-decoration:underline;',
        'padding:4px 8px;',
        'transition:color 0.15s;',
      '}',
      '.cr-btn-continuar:hover{color:#888;}',

      /* Nota de rodapé */
      '.cr-rodape{',
        'margin-top:16px;',
        'font-size:11.5px;color:#ccc;',
        'display:flex;align-items:center;justify-content:center;gap:5px;',
      '}',
      '.cr-rodape i{font-size:13px;color:#5A48C8;}',

      /* Responsivo */
      '@media(max-width:480px){',
        '.cr-modal{padding:24px 18px 20px;}',
        '.cr-titulo{font-size:17px;}',
      '}'
    ].join('');
    document.head.appendChild(style);

    /* ── HTML do modal ── */
    crOverlay = document.createElement('div');
    crOverlay.className  = 'cr-overlay';
    crOverlay.id         = 'crOverlay';
    crOverlay.setAttribute('role',       'alertdialog');
    crOverlay.setAttribute('aria-modal', 'true');
    crOverlay.setAttribute('aria-labelledby', 'crTitulo');
    crOverlay.setAttribute('aria-describedby', 'crDesc');

    crOverlay.innerHTML =
      '<div class="cr-modal">' +
        '<div class="cr-icone"><i class="ti ti-heart-handshake"></i></div>' +
        '<h2 class="cr-titulo" id="crTitulo">Estamos aqui com você 💜</h2>' +
        '<p class="cr-desc" id="crDesc">' +
          'Percebemos que você pode estar passando por um momento muito difícil. ' +
          'Você não precisa enfrentar isso sozinho(a).<br><br>' +
          '<strong>Falar com alguém de verdade pode ajudar muito agora.</strong>' +
        '</p>' +

        /* Botão CVV — ancora com tel: para abrir discador no mobile */
        '<a href="tel:188" class="cr-btn-cvv" id="crBtnCvv" aria-label="Ligar agora para o CVV no número 188">' +
          '<i class="ti ti-phone"></i> Ligar para o CVV — 188' +
        '</a>' +

        /* Botão profissionais — leva à seção de profissionais da home */
        '<a href="mindbridge-home.html#profissionais" class="cr-btn-prof" id="crBtnProf">' +
          '<i class="ti ti-user-heart"></i> Encontrar um profissional' +
        '</a>' +

        '<p class="cr-ou">ou</p>' +

        /* Botão discreto para enviar a mensagem assim mesmo */
        '<button type="button" class="cr-btn-continuar" id="crBtnContinuar">' +
          'Continuar e enviar minha mensagem assim mesmo' +
        '</button>' +

        '<p class="cr-rodape"><i class="ti ti-shield-heart"></i> CVV: gratuito, sigiloso, 24h por dia</p>' +
      '</div>';

    document.body.appendChild(crOverlay);

    /* Fechar ao clicar no overlay (fora do modal) */
    crOverlay.addEventListener('click', function (e) {
      if (e.target === crOverlay) fecharModalCrise(false);
    });

    /* Botão "continuar" — envia o texto normalmente */
    document.getElementById('crBtnContinuar').addEventListener('click', function () {
      fecharModalCrise(true);
    });

    /* Fechar com Escape (não envia) */
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && crOverlay && crOverlay.classList.contains('aberto')) {
        fecharModalCrise(false);
      }
    });

    /* Ao clicar em CVV ou Profissional, fecha o modal sem enviar */
    var btnCvv  = document.getElementById('crBtnCvv');
    var btnProf = document.getElementById('crBtnProf');
    if (btnCvv)  btnCvv.addEventListener('click',  function () { fecharModalCrise(false); });
    if (btnProf) btnProf.addEventListener('click',  function () { fecharModalCrise(false); });
  }


  /* ============================================================
    11. RESPOSTAS CONTEXTUAIS (repertório expandido)          ← NOVO
    ─────────────────────────────────────────────────────────────
    escolherRespostaContextual() analisa o texto enviado para
    identificar o "humor" predominante e retorna uma resposta
    mais coerente com o contexto, em vez de sortear de uma lista
    única genérica.

    Categorias detectadas:
      saudacao   — "oi", "olá", "bom dia", "tudo bem?"...
      mal         — "não tô bem", "tô mal", "difícil", "cansado"...
      tristeza    — "triste", "chorei", "chorando", "sem energia"...
      ansiedade   — "ansioso", "crise", "coração acelerado"...
      gratidao    — "obrigado", "valeu", "ajudou muito"...
      encorajamento — "consegui", "melhorei", "passei por isso"...
      desabafo    — frases longas sem categoria anterior
      generico    — fallback para qualquer outro caso
  ============================================================ */

  /* Mapa de categorias → array de respostas */
  var RESPOSTAS = {

    /* Usuário cumprimentou */
    saudacao: [
      'Oi! Fico feliz que você passou por aqui 💜',
      'Olá! Como você está se sentindo hoje?',
      'Oi, que bom te ver por aqui. Como foi o seu dia?',
      'Oi! Tô aqui. Me conta, o que está no seu coração hoje?',
      'Olá 😊 Sempre bom saber que você não está sozinho(a).',
      'Oi! Pode falar, tô toda ouvidos 💜',
      'Que bom que você apareceu. Como você está?'
    ],

    /* Usuário disse que está mal, cansado, esgotado */
    mal: [
      'Entendo. Não precisa estar bem o tempo todo — estou aqui.',
      'Fico feliz que você falou. Quer me contar mais sobre o que está sentindo?',
      'Isso é difícil mesmo. Você não está sozinho(a) nesse momento.',
      'Puxa, parece que tem sido pesado. O que aconteceu?',
      'Às vezes só poder falar já ajuda um pouco. Pode desabafar.',
      'Obrigada por confiar em mim isso. O que está pesando mais hoje?',
      'Que momento difícil. Que bom que você não ficou quieto(a) com isso.',
      'Não precisar estar bem o tempo todo faz parte da vida. Estou aqui.'
    ],

    /* Tristeza, choro, saudade, dor emocional */
    tristeza: [
      'Me aperta o coração saber que você está assim. Quer falar sobre o que está acontecendo?',
      'Tudo bem chorar. Às vezes as lágrimas dizem o que as palavras não conseguem.',
      'Sentir isso é humano. Você não precisa fingir que está bem.',
      'Estou aqui do seu lado, mesmo que seja só pelas palavras 💜',
      'Às vezes a tristeza pesa muito. Quer compartilhar o que gerou esse sentimento?',
      'Que corajoso(a) você é de sentir isso tudo e ainda assim estar aqui.',
      'Obrigada por trazer isso para cá. Você merece um espaço pra sentir tudo isso.'
    ],

    /* Ansiedade, pânico, coração acelerado, aperto no peito */
    ansiedade: [
      'Crises de ansiedade são exaustivas. O que você está sentindo agora?',
      'Respira fundo comigo. Inspira 4 segundos, segura 4, solta 6. Repete. 💙',
      'Entendo, a sensação pode ser bem assustadora. Você está em segurança agora?',
      'Ansiedade mente muito — ela faz tudo parecer maior do que é. Estou aqui com você.',
      'Que você está passando por isso faz sentido, considerando tudo. Como está seu corpo agora?',
      'Você já passou por outras crises e superou. Isso faz parte, mesmo que doa muito.',
      'Vamos de pouco a pouco. O que ajuda você a se acalmar nesses momentos?'
    ],

    /* Usuário agradeceu, disse que ajudou */
    gratidao: [
      'Que bom que ajudou! Fico feliz em estar por aqui 💜',
      'Isso me alegra muito. Você merecia esse apoio.',
      'De nada! Estou sempre aqui quando precisar.',
      'Fico contente que a conversa foi útil. Como você está agora?',
      'Esse é o nosso espaço — sempre que precisar, pode voltar.',
      'Que bom! Lembre que você fez parte disso também — é muita coragem falar sobre o que sente.',
      'Fico feliz 💜 Continue cuidando de você, ok?'
    ],

    /* Conquistas, superação, melhora */
    encorajamento: [
      'Que notícia incrível! Você está evoluindo muito 💜',
      'Isso é lindo de ouvir. Dê crédito a si mesmo(a) por isso.',
      'Sabia que você ia conseguir. Orgulho de você!',
      'Cada pequeno passo conta. Você está no caminho certo.',
      'Isso merece ser celebrado! Como você está se sentindo?',
      'A resiliência que você demonstra é inspiradora. Sério.',
      'Que alegria ouvir isso 😊 Continue assim!'
    ],

    /* Desabafo longo, relato de situação */
    desabafo: [
      'Obrigada por compartilhar isso comigo. Não é fácil colocar tudo isso em palavras.',
      'Uau. Parece que tem sido muito pesado carregar tudo isso. Quer continuar contando?',
      'Estou lendo tudo com atenção. Você não está sozinho(a) nessa.',
      'Isso que você trouxe é muito sério e eu ouço você. O que mais pesa nisso tudo?',
      'Faz sentido você estar sentindo isso. Qualquer pessoa estaria.',
      'Você foi muito corajoso(a) de colocar isso pra fora. Que bom que você não ficou só com isso.',
      'Entendo. Às vezes precisa de alguém que apenas ouça, sem julgamento. Pode contar comigo.'
    ],

    /* Fallback genérico */
    generico: [
      'Obrigada por compartilhar isso comigo 💜',
      'Entendo completamente o que você está sentindo.',
      'Estou aqui, pode falar à vontade.',
      'Isso faz muito sentido. Como você está se sentindo agora?',
      'Fico feliz que você tenha me contado isso.',
      'Você não está sozinho(a) nisso.',
      'Que bom que você passou por aqui hoje.',
      'Sua experiência importa e eu ouço você.',
      'Às vezes só colocar para fora já alivia um pouco, né?',
      'Pode continuar, estou aqui com você 💜'
    ]
  };

  /* Palavras-chave por categoria para detecção do humor */
  var DETECTORES = {
    saudacao: [
      'oi', 'olá', 'ola', 'bom dia', 'boa tarde', 'boa noite',
      'tudo bem', 'tudo bom', 'como vai', 'e aí', 'e ai', 'opa', 'hey', 'hello'
    ],
    mal: [
      'não tô bem', 'nao to bem', 'tô mal', 'to mal',
      'muito mal', 'muito ruim', 'esgotado', 'esgotada',
      'exausto', 'exausta', 'sem força', 'sem forca',
      'cansado', 'cansada', 'sem energia', 'pesado', 'pesada',
      'difícil', 'dificil', 'não aguento', 'nao aguento',
      'horrível', 'horrivel', 'péssimo', 'pessimo', 'terrível', 'terrivel',
      'estou mal', 'estou muito mal', 'me sinto mal'
    ],
    tristeza: [
      'triste', 'tristeza', 'chorei', 'chorando', 'choro',
      'vontade de chorar', 'lágrimas', 'lagrimas',
      'saudade', 'sozinho', 'sozinha', 'abandonado', 'abandonada',
      'vazio', 'vazia', 'sem sentido', 'magoado', 'magoada',
      'dor', 'dói', 'doi', 'partiu o coração', 'coração partido',
      'angústia', 'angustia', 'melancolia', 'deprimido', 'deprimida'
    ],
    ansiedade: [
      'ansioso', 'ansiosa', 'ansiedade', 'crise', 'pânico', 'panico',
      'coração acelerado', 'coracao acelerado', 'aperto no peito',
      'tremendo', 'tremor', 'suando', 'suor frio',
      'taquicardia', 'falta de ar', 'respiração', 'respiracao',
      'preocupado', 'preocupada', 'medo', 'terror',
      'nervoso', 'nervosa', 'agitado', 'agitada', 'inquieto', 'inquieta'
    ],
    gratidao: [
      'obrigado', 'obrigada', 'valeu', 'muito obrigado', 'muito obrigada',
      'ajudou', 'ajudou muito', 'gratidão', 'gratidao', 'agradeço',
      'agradeco', 'fico feliz', 'me senti melhor', 'ficou melhor',
      'consegui me acalmar'
    ],
    encorajamento: [
      'consegui', 'conseguimos', 'superei', 'passando melhor', 'melhorei',
      'melhora', 'melhorando', 'passei por isso', 'venci', 'sobrevivi',
      'estou melhor', 'tô melhor', 'to melhor', 'hoje foi bom',
      'vitória', 'vitoria', 'conquista', 'consegui fazer', 'evoluí', 'evolui'
    ]
  };

  /**
   * Analisa o texto e retorna a categoria de humor mais provável,
   * priorizando saudação se for uma mensagem curta.
   */
  function detectarCategoria(texto) {
    var t      = texto.toLowerCase();
    var curta  = texto.trim().length < 30;

    /* Verifica cada categoria na ordem de prioridade */
    var ordem = ['saudacao', 'gratidao', 'encorajamento', 'ansiedade', 'tristeza', 'mal'];

    /* Para mensagens curtas, testa saudação primeiro */
    if (curta) {
      var det = DETECTORES.saudacao;
      for (var i = 0; i < det.length; i++) {
        if (t.indexOf(det[i]) !== -1) return 'saudacao';
      }
    }

    for (var k = 0; k < ordem.length; k++) {
      var cat     = ordem[k];
      var palavras = DETECTORES[cat];
      for (var j = 0; j < palavras.length; j++) {
        if (t.indexOf(palavras[j]) !== -1) return cat;
      }
    }

    /* Mensagem longa sem categoria → desabafo */
    if (texto.trim().length > 80) return 'desabafo';

    return 'generico';
  }

  /**
   * Escolhe uma resposta aleatória dentro da categoria detectada.
   */
  function escolherRespostaContextual(textoEnviado) {
    var categoria = detectarCategoria(textoEnviado);
    var lista     = RESPOSTAS[categoria] || RESPOSTAS.generico;
    return lista[Math.floor(Math.random() * lista.length)];
  }


  /* ============================================================
    12. MENU "MAIS OPÇÕES" (diretas e grupos)
  ============================================================ */

  var btnMais = document.getElementById('btnMais');

  if (btnMais) {
    btnMais.addEventListener('click', function (e) {
      e.stopPropagation();
      var menuAtivo = estado.grupoAtivoId ? msgMenuMaisGrupo : msgMenuMais;
      menuAtivo.classList.toggle('aberto');
    });
    document.addEventListener('click', function (e) {
      if (!msgMenuMais.contains(e.target)      && e.target !== btnMais) msgMenuMais.classList.remove('aberto');
      if (!msgMenuMaisGrupo.contains(e.target) && e.target !== btnMais) msgMenuMaisGrupo.classList.remove('aberto');
    });
  }

  document.querySelectorAll('#msgMenuMais button').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var acao     = btn.getAttribute('data-acao');
      var conversa = buscarConversa(estado.conversaAtivaId);
      msgMenuMais.classList.remove('aberto');
      if (!conversa) return;

      if (acao === 'favoritar') {
        conversa.favorita = !conversa.favorita;
        salvarConversas();
        renderizarLista();
        btn.classList.toggle('ativo', conversa.favorita);
        btn.querySelector('span').textContent = conversa.favorita ? 'Remover dos favoritos' : 'Favoritar conversa';
        mostrarToast(conversa.favorita ? 'Conversa favoritada ⭐' : 'Removida dos favoritos');
      } else if (acao === 'silenciar') {
        mostrarToast('Notificações silenciadas para essa conversa.');
      } else if (acao === 'perfil') {
        mostrarToast('Em breve: visualização de perfil completo.');
      } else if (acao === 'bloquear') {
        mostrarToast('Pessoa bloqueada. Você não receberá mais mensagens dela.', 'erro');
      } else if (acao === 'denunciar') {
        mostrarToast('Denúncia enviada à nossa equipe de moderação.', 'erro');
      }
    });
  });

  document.querySelectorAll('#msgMenuMaisGrupo button').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var acao    = btn.getAttribute('data-acao-grupo');
      var grupoId = estado.grupoAtivoId;
      var grupo   = buscarGrupo(grupoId);
      msgMenuMaisGrupo.classList.remove('aberto');
      if (!grupo) return;

      if (acao === 'info') {
        mostrarToast(grupo.nome + ' • ' + (grupo.membros || 1).toLocaleString('pt-BR') + ' membros');
      } else if (acao === 'silenciar') {
        mostrarToast('Notificações silenciadas para esse grupo.');
      } else if (acao === 'sair') {
        estado.grupos = estado.grupos.filter(function (g) { return g.id !== grupoId; });
        salvarGruposParticipando(estado.grupos);
        delete estado.mensagensGrupos[grupoId];
        salvarMensagensGrupos();

        estado.grupoAtivoId   = null;
        msgConversaBox.hidden = true;
        msgChatVazio.hidden   = false;
        if (msgShell) msgShell.classList.remove('mostrando-chat');

        renderizarListaGrupos();
        mostrarToast('Você saiu do grupo "' + grupo.nome + '".');
      } else if (acao === 'denunciar') {
        mostrarToast('Denúncia enviada à nossa equipe de moderação.', 'erro');
      }
    });
  });


  /* ============================================================
    13. MODAL "ENCONTRAR PESSOAS"
  ============================================================ */

  var mpOverlay       = document.getElementById('mpOverlay');
  var mpFechar        = document.getElementById('mpFechar');
  var mpBuscaInput    = document.getElementById('mpBuscaInput');
  var mpResultados    = document.getElementById('mpResultados');
  var mpVazio         = document.getElementById('mpVazio');
  var btnNovaConversa = document.getElementById('btnNovaConversa');

  var mpTemaAtual = 'todos';

  /**
   * Posiciona um popover ancorado perto do botão de origem.
   * Usada pelos dois modais compactos (Pessoas e Grupos).
   */
  function posicionarPopover(overlay, botaoOrigem) {
    if (!botaoOrigem) return;
    var rect       = botaoOrigem.getBoundingClientRect();
    var largura    = 300;
    var margem     = 12;
    var left       = rect.right - largura;
    if (left < margem) left = margem;
    var maxLeft    = window.innerWidth - largura - margem;
    if (left > maxLeft) left = maxLeft;
    overlay.style.left = left + 'px';
    overlay.style.top  = (rect.bottom + 8) + 'px';
  }

  function abrirModalPessoas(evento) {
    if (!mpOverlay) return;
    mpBuscaInput.value = '';
    mpTemaAtual        = 'todos';
    document.querySelectorAll('.mp-tema-chip').forEach(function (c) {
      c.classList.toggle('ativo', c.getAttribute('data-tema-pessoa') === 'todos');
    });
    renderizarPessoas();
    posicionarPopover(mpOverlay, (evento && evento.currentTarget) || btnNovaConversa);
    mpOverlay.classList.add('aberto');
    document.body.style.overflow = 'hidden';
    setTimeout(function () { mpBuscaInput.focus(); }, 80);
  }

  function fecharModalPessoas() {
    if (!mpOverlay) return;
    mpOverlay.classList.remove('aberto');
    document.body.style.overflow = '';
  }

  if (btnNovaConversa) btnNovaConversa.addEventListener('click', abrirModalPessoas);
  if (mpFechar)        mpFechar.addEventListener('click',        fecharModalPessoas);
  if (mpOverlay) {
    mpOverlay.addEventListener('click', function (e) {
      if (e.target === mpOverlay) fecharModalPessoas();
    });
  }
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && mpOverlay && mpOverlay.classList.contains('aberto')) fecharModalPessoas();
  });

  document.querySelectorAll('.mp-tema-chip').forEach(function (chip) {
    chip.addEventListener('click', function () {
      document.querySelectorAll('.mp-tema-chip').forEach(function (c) { c.classList.remove('ativo'); });
      chip.classList.add('ativo');
      mpTemaAtual = chip.getAttribute('data-tema-pessoa');
      renderizarPessoas();
    });
  });

  if (mpBuscaInput) mpBuscaInput.addEventListener('input', renderizarPessoas);

  function renderizarPessoas() {
    var termo = mpBuscaInput.value.trim().toLowerCase();
    var lista = PESSOAS_SUGERIDAS.filter(function (p) {
      return (mpTemaAtual === 'todos' || p.tema === mpTemaAtual) &&
             (!termo || p.nome.toLowerCase().indexOf(termo) !== -1);
    });

    mpResultados.innerHTML = '';
    if (!lista.length) { mpVazio.hidden = false; return; }
    mpVazio.hidden = true;

    lista.forEach(function (p) {
      var jaTemConversa = !!buscarConversa(p.id);
      var item          = document.createElement('div');
      item.className    = 'mp-pessoa';
      item.innerHTML    =
        '<div class="msg-avatar">' + escaparHTML(iniciaisDe(p.nome)) + '</div>' +
        '<div class="mp-pessoa-info">' +
          '<span class="mp-pessoa-nome">' + escaparHTML(p.nome) + '</span>' +
          '<span class="mp-pessoa-tag">'  + escaparHTML(p.tag)  + '</span>' +
        '</div>' +
        '<button type="button" class="mp-pessoa-btn' + (jaTemConversa ? ' ja-conversa' : '') + '">' +
          (jaTemConversa
            ? '<i class="ti ti-message-circle"></i> Conversar'
            : '<i class="ti ti-plus"></i> Adicionar') +
        '</button>';

      item.querySelector('.mp-pessoa-btn').addEventListener('click', function () {
        iniciarOuAbrirConversa(p);
      });
      mpResultados.appendChild(item);
    });
  }

  function iniciarOuAbrirConversa(pessoa) {
    if (!buscarConversa(pessoa.id)) {
      estado.conversas.push({
        id: pessoa.id, nome: pessoa.nome,
        online: Math.random() > 0.35,
        favorita: false, naoLidas: 0, mensagens: []
      });
      salvarConversas();
      mostrarToast(pessoa.nome + ' adicionado(a) às suas conversas 💜', 'sucesso');
    }
    fecharModalPessoas();
    if (estado.abaAtiva !== 'diretas') trocarAba('diretas');
    renderizarLista();
    abrirConversa(pessoa.id);
  }


  /* ============================================================
    14. MODAL "PROCURAR GRUPOS"
  ============================================================ */

  var bgOverlay    = document.getElementById('bgOverlay');
  var bgFechar     = document.getElementById('bgFechar');
  var bgBuscaInput = document.getElementById('bgBuscaInput');
  var bgResultados = document.getElementById('bgResultados');
  var bgVazio      = document.getElementById('bgVazio');

  function abrirModalGrupos(evento) {
    if (!bgOverlay) return;
    bgBuscaInput.value = '';
    renderizarBuscaGrupos();
    posicionarPopover(bgOverlay, (evento && evento.currentTarget) || btnProcurarGrupos);
    bgOverlay.classList.add('aberto');
    document.body.style.overflow = 'hidden';
    setTimeout(function () { bgBuscaInput.focus(); }, 80);
  }

  function fecharModalGrupos() {
    if (!bgOverlay) return;
    bgOverlay.classList.remove('aberto');
    document.body.style.overflow = '';
  }

  if (bgFechar) bgFechar.addEventListener('click', fecharModalGrupos);
  if (bgOverlay) {
    bgOverlay.addEventListener('click', function (e) {
      if (e.target === bgOverlay) fecharModalGrupos();
    });
  }
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && bgOverlay && bgOverlay.classList.contains('aberto')) fecharModalGrupos();
  });
  if (bgBuscaInput) bgBuscaInput.addEventListener('input', renderizarBuscaGrupos);

  function renderizarBuscaGrupos() {
    var termo = bgBuscaInput.value.trim().toLowerCase();
    var lista = TODOS_GRUPOS.filter(function (g) {
      return !termo ||
             g.nome.toLowerCase().indexOf(termo)  !== -1 ||
             g.temas.some(function (t) { return t.indexOf(termo) !== -1; });
    });

    bgResultados.innerHTML = '';
    if (!lista.length) { bgVazio.hidden = false; return; }
    bgVazio.hidden = true;

    lista.forEach(function (g) {
      var jaParticipa = !!buscarGrupo(g.id);
      var corHex      = CORES_GRUPO[g.cor] || CORES_GRUPO['cor-outro'];
      var item        = document.createElement('div');
      item.className  = 'mp-pessoa';
      item.innerHTML  =
        '<div class="msg-avatar msg-avatar-grupo" style="background-color:' + corHex + '">' +
          '<i class="ti ' + escaparHTML(g.icone) + '"></i>' +
        '</div>' +
        '<div class="mp-pessoa-info">' +
          '<span class="mp-pessoa-nome">' + escaparHTML(g.nome) + '</span>' +
          '<span class="mp-pessoa-tag">'  + g.membros.toLocaleString('pt-BR') + ' membros</span>' +
        '</div>' +
        '<button type="button" class="mp-pessoa-btn' + (jaParticipa ? ' ja-conversa' : '') + '">' +
          (jaParticipa
            ? '<i class="ti ti-message-circle"></i> Ver'
            : '<i class="ti ti-door-enter"></i> Entrar') +
        '</button>';

      item.querySelector('.mp-pessoa-btn').addEventListener('click', function () {
        entrarOuAbrirGrupo(g);
      });
      bgResultados.appendChild(item);
    });
  }

  function entrarOuAbrirGrupo(dadosGrupo) {
    if (!buscarGrupo(dadosGrupo.id)) {
      var novo = {
        id: dadosGrupo.id, nome: dadosGrupo.nome, desc: dadosGrupo.desc,
        icone: dadosGrupo.icone, cor: dadosGrupo.cor, temas: dadosGrupo.temas,
        membros: dadosGrupo.membros, moderador: dadosGrupo.moderador,
        privacidade: dadosGrupo.privacidade, entrouEm: new Date().toISOString()
      };
      estado.grupos.push(novo);
      salvarGruposParticipando(estado.grupos);
      estado.mensagensGrupos[dadosGrupo.id] = montarHistoricoInicialGrupo(novo);
      salvarMensagensGrupos();
      mostrarToast('Você entrou no grupo "' + dadosGrupo.nome + '" 💜', 'sucesso');
    }
    fecharModalGrupos();
    trocarAba('grupos');
    renderizarListaGrupos();
    abrirGrupo(dadosGrupo.id);
  }


  /* ============================================================
    15. MODAL "CHAMADA" (voz / vídeo)
  ============================================================ */

  var chOverlay      = document.getElementById('chOverlay');
  var chTipo         = document.getElementById('chTipo');
  var chAvatarGrande = document.getElementById('chAvatarGrande');
  var chNomeEl       = document.getElementById('chNome');
  var chStatus       = document.getElementById('chStatus');
  var chEncerrar     = document.getElementById('chEncerrar');
  var chMudo         = document.getElementById('chMudo');
  var chAltoFalante  = document.getElementById('chAltoFalante');

  var chTimeoutConectar, chIntervaloDuracao, chSegundosDecorridos;

  function abrirChamada(tipoChamada) {
    var conversa = buscarConversa(estado.conversaAtivaId);
    if (!conversa || !chOverlay) return;

    chTipo.textContent     = tipoChamada === 'video' ? 'Chamada de vídeo' : 'Chamada de voz';
    chAvatarGrande.textContent = iniciaisDe(conversa.nome);
    chNomeEl.textContent   = conversa.nome;
    chStatus.textContent   = conversa.online ? 'Chamando...' : 'Tocando — pode levar um momento...';
    chStatus.classList.remove('conectada');
    chMudo.classList.remove('ativo');
    chAltoFalante.classList.remove('ativo');

    chOverlay.classList.add('aberto');
    document.body.style.overflow = 'hidden';

    chSegundosDecorridos = 0;
    clearTimeout(chTimeoutConectar);
    clearInterval(chIntervaloDuracao);

    chTimeoutConectar = setTimeout(function () {
      if (!chOverlay.classList.contains('aberto')) return;
      chStatus.textContent = '00:00';
      chStatus.classList.add('conectada');
      chIntervaloDuracao = setInterval(function () {
        chSegundosDecorridos++;
        var min = Math.floor(chSegundosDecorridos / 60).toString().padStart(2, '0');
        var seg = (chSegundosDecorridos % 60).toString().padStart(2, '0');
        chStatus.textContent = min + ':' + seg;
      }, 1000);
    }, conversa.online ? 1800 : 3200);
  }

  function fecharChamada() {
    if (!chOverlay) return;
    chOverlay.classList.remove('aberto');
    document.body.style.overflow = '';
    clearTimeout(chTimeoutConectar);
    clearInterval(chIntervaloDuracao);
    mostrarToast('Chamada encerrada.');
  }

  if (btnLigarEl) btnLigarEl.addEventListener('click', function () { abrirChamada('voz');   });
  if (btnVideoEl) btnVideoEl.addEventListener('click', function () { abrirChamada('video'); });
  if (chEncerrar) chEncerrar.addEventListener('click', fecharChamada);

  if (chMudo) chMudo.addEventListener('click', function () {
    chMudo.classList.toggle('ativo');
    chMudo.querySelector('i').className = chMudo.classList.contains('ativo')
      ? 'ti ti-microphone-off' : 'ti ti-microphone';
  });
  if (chAltoFalante) chAltoFalante.addEventListener('click', function () {
    chAltoFalante.classList.toggle('ativo');
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && chOverlay && chOverlay.classList.contains('aberto')) fecharChamada();
  });


  /* ============================================================
    16. LEITURA DE PARÂMETROS DA URL (?aba=grupos&grupo=<id>)
  ============================================================ */

  function lerParametrosDeEntrada() {
    var params = new URLSearchParams(window.location.search);
    return { aba: params.get('aba'), grupo: params.get('grupo') };
  }


  /* ============================================================
    17. INICIALIZAÇÃO
  ============================================================ */

  inicializarEstado();
  renderizarLista();
  renderizarListaGrupos();

  var params = lerParametrosDeEntrada();

  if (params.grupo && buscarGrupo(params.grupo)) {
    /* Veio da Comunidade com grupo específico — abre direto nele */
    abrirGrupo(params.grupo);
  } else if (params.aba === 'grupos') {
    trocarAba('grupos');
    if (estado.grupos.length) {
      abrirGrupo(ordenarGruposPorRecencia(estado.grupos)[0].id);
    }
  } else if (estado.conversas.length) {
    /* Comportamento padrão: abre a conversa direta mais recente */
    abrirConversa(ordenarConversasPorRecencia(estado.conversas)[0].id);
  }

});