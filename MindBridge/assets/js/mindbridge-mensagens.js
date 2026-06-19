/* ================================================================
   MINDBRIDGE — MENSAGENS DIRETAS + GRUPOS (JavaScript v3)
   Arquivo: mindbridge-mensagens.js

   MUDANÇA NESTA VERSÃO
   ─────────────────────
   [NOVO] A sidebar ganhou duas abas internas: "Diretas" (o que já
   existia) e "Grupos" (novo). A aba Grupos lista os grupos que o
   usuário já participa — lidos de 'mb_grupos_participando', a
   MESMA chave em que mindbridge-comunidade-grupos.js grava quando
   alguém entra em um grupo pela página de Comunidade — e tem um
   botão "Procurar grupos" que abre um popover de busca sem saída
   da página, para entrar em outros grupos direto por aqui.

   A página também lê ?aba=grupos&grupo=<id> na URL (preenchido
   pelo redirecionamento da Comunidade) para abrir já na aba e no
   grupo certos.

   Conversas de grupo usam o mesmo painel de chat das diretas, só
   com pequenas diferenças: avatar com ícone em vez de iniciais,
   cabeçalho mostra "nº membros" em vez de "Online/Offline", as
   mensagens recebidas mostram o nome de quem enviou (várias
   pessoas no mesmo grupo) e os botões de ligação são ocultados
   (sem chamada em grupo simulada nesta versão).

   Tudo roda no cliente (sem backend). Conversas diretas, grupos e
   mensagens de grupo ficam salvos em localStorage para persistir
   entre sessões.

   ÍNDICE
   ──────
   0.  Dados base (contatos sugeridos + conversas iniciais + grupos)
   1.  Utilitários (toast, escapar HTML, tempo relativo, persistência)
   2.  Estado em memória
   3.  Abas "Diretas" / "Grupos" — alternância
   4.  Renderização da sidebar — conversas diretas
   5.  Busca e filtros da sidebar (diretas)
   6.  Renderização da sidebar — grupos
   7.  Abertura/fechamento de conversa (direta OU grupo)
   8.  Renderização de mensagens no corpo do chat
   9.  Envio de mensagem + resposta simulada (direta e grupo)
   10. Menu "mais opções" (diretas e grupos)
   11. Modal "Encontrar pessoas"
   12. Modal "Procurar grupos"                              ← NOVO
   13. Modal "Chamada" (voz / vídeo)
   14. Leitura de parâmetros da URL (?aba=&grupo=)            ← NOVO
   15. Inicialização
================================================================ */

document.addEventListener('DOMContentLoaded', function () {

  /* ============================================================
     0. DADOS BASE
  ============================================================ */

  /* Pessoas sugeridas para iniciar conversa — usadas no modal
     "Encontrar pessoas". Algumas já têm conversa, outras não. */
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

  /* Conversas iniciais que já existem quando a página carrega,
     simulando um histórico prévio. Cada mensagem tem remetente
     ('eu' ou 'outro'), texto e minutosAtras (usado para gerar
     horário relativo na primeira renderização). */
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

  /* Respostas simuladas curtas, sorteadas quando o usuário envia
     uma mensagem — apenas para dar vida à demonstração. */
  var RESPOSTAS_SIMULADAS = [
    'Obrigada por compartilhar isso comigo 💜',
    'Entendo completamente o que você está sentindo.',
    'Estou aqui, pode falar à vontade.',
    'Isso faz muito sentido. Como você está se sentindo agora?',
    'Fico feliz que você tenha me contado isso.',
    'Você não está sozinho(a) nisso.',
    'Que bom que você passou por aqui hoje.'
  ];

  /* Catálogo completo de grupos da MindBridge — os mesmos exibidos
     na página Comunidade. Usado pelo modal "Procurar grupos" para
     listar opções que o usuário ainda não participa. Os campos
     batem com o formato salvo em 'mb_grupos_participando' por
     mindbridge-comunidade-grupos.js, então um grupo "entrado" aqui
     fica idêntico a um grupo entrado pela Comunidade. */
  var TODOS_GRUPOS = [
    { id: 'ansiedade-panico', nome: 'Ansiedade & Pânico', desc: 'Técnicas, desabafos e apoio para quem lida com crises de ansiedade no dia a dia.', icone: 'ti-wind', cor: 'cor-ansiedade', temas: ['ansiedade'], membros: 4180, moderador: 'Equipe MindBridge', privacidade: 'publico' },
    { id: 'burnout-carreira', nome: 'Burnout & Carreira', desc: 'Para quem sente o peso do esgotamento profissional e busca formas de se recuperar.', icone: 'ti-battery-1', cor: 'cor-burnout', temas: ['burnout'], membros: 2760, moderador: 'Equipe MindBridge', privacidade: 'publico' },
    { id: 'luto-perdas', nome: 'Luto & Perdas', desc: 'Um espaço gentil para falar sobre perdas, no seu tempo, sem pressa de "superar".', icone: 'ti-feather', cor: 'cor-luto', temas: ['luto'], membros: 1340, moderador: 'Equipe MindBridge', privacidade: 'publico' },
    { id: 'sono-descanso', nome: 'Sono & Descanso', desc: 'Trocas sobre insônia, rotina noturna e técnicas para uma mente mais calma à noite.', icone: 'ti-moon', cor: 'cor-sono', temas: ['sono'], membros: 980, moderador: 'Equipe MindBridge', privacidade: 'publico' }
  ];

  /* Cor sólida por classe de cor do grupo — usada no avatar de
     grupo na sidebar/cabeçalho (mesmo mapa usado na Comunidade,
     para o grupo ficar visualmente igual nas duas páginas). */
  var CORES_GRUPO = {
    'cor-ansiedade':       '#5A48C8',
    'cor-burnout':         '#2970C8',
    'cor-luto':            '#8B7BC4',
    'cor-sono':            '#1D9E75',
    'cor-autoestima':      '#E6A817',
    'cor-relacionamentos': '#E05C8A',
    'cor-outro':           '#888888'
  };

  /* Nomes de membros fictícios usados para simular quem está
     falando dentro de uma conversa de grupo (além do próprio
     usuário). Sorteados na hora de gerar o histórico inicial e as
     respostas simuladas de cada grupo. */
  var MEMBROS_FICTICIOS = ['Ana Gabrielly', 'Rafael Lima', 'Camila Souza', 'Daniel Alves', 'Beatriz Nunes', 'Gabriel Rocha'];


  /* ============================================================
     1. UTILITÁRIOS
  ============================================================ */

  function escaparHTML(texto) {
    var div = document.createElement('div');
    div.textContent = texto;
    return div.innerHTML;
  }

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

  /** Retorna "HH:MM" a partir de um objeto Date. */
  function horaCurta(data) {
    var h = data.getHours().toString().padStart(2, '0');
    var m = data.getMinutes().toString().padStart(2, '0');
    return h + ':' + m;
  }

  /** Tempo relativo curto para a lista de conversas (ex: "5 min", "2h", "Ontem"). */
  function tempoRelativoCurto(data) {
    var diff = Math.floor((Date.now() - data.getTime()) / 60000); /* minutos */
    if (diff < 1)     return 'agora';
    if (diff < 60)    return diff + ' min';
    if (diff < 1440)  return Math.floor(diff / 60) + 'h';
    if (diff < 2880)  return 'Ontem';
    return Math.floor(diff / 1440) + 'd';
  }

  function iniciaisDe(nome) {
    return nome.split(' ').slice(0, 2).map(function (p) { return p[0]; }).join('').toUpperCase();
  }

  /* Persistência simples em localStorage; falha silenciosamente
     em modo privado ou se o storage estiver bloqueado. */
  function salvarConversas() {
    try { localStorage.setItem('mb_conversas', JSON.stringify(estado.conversas)); } catch (e) {}
  }
  function carregarConversas() {
    try {
      var salvas = localStorage.getItem('mb_conversas');
      return salvas ? JSON.parse(salvas) : null;
    } catch (e) { return null; }
  }

  /* Grupos que o usuário participa — MESMA chave gravada por
     mindbridge-comunidade-grupos.js ao entrar em um grupo pela
     página de Comunidade. É o contrato de dados entre os dois
     arquivos: qualquer grupo salvo lá aparece aqui, e qualquer
     grupo entrado aqui (via "Procurar grupos") também aparece lá. */
  function lerGruposParticipando() {
    try { return JSON.parse(localStorage.getItem('mb_grupos_participando') || '[]'); } catch (e) { return []; }
  }
  function salvarGruposParticipando(lista) {
    try { localStorage.setItem('mb_grupos_participando', JSON.stringify(lista)); } catch (e) {}
  }

  /* Mensagens de cada grupo, guardadas separadamente das conversas
     diretas (formato de mensagem é parecido, mas tem campo extra
     "autor" para identificar quem enviou). */
  function salvarMensagensGrupos() {
    try { localStorage.setItem('mb_grupos_mensagens', JSON.stringify(estado.mensagensGrupos)); } catch (e) {}
  }
  function carregarMensagensGrupos() {
    try {
      var salvas = localStorage.getItem('mb_grupos_mensagens');
      return salvas ? JSON.parse(salvas) : null;
    } catch (e) { return null; }
  }


  /* ============================================================
     2. ESTADO EM MEMÓRIA
  ============================================================ */

  var estado = {
    conversas: [],          /* conversas diretas, cada uma com mensagens já com timestamp absoluto (ISO) */
    grupos: [],             /* grupos que o usuário participa (de 'mb_grupos_participando') */
    mensagensGrupos: {},    /* { grupoId: [ {de, autor, texto, ts} ] } */
    abaAtiva: 'diretas',    /* 'diretas' | 'grupos' */
    conversaAtivaId: null,
    grupoAtivoId: null,     /* id do grupo aberto no momento, ou null se a conversa ativa é direta */
    filtroAtual: 'todas',
    buscaAtual: ''
  };

  /** Converte CONVERSAS_INICIAIS (minutosAtras) em timestamps absolutos ISO,
   *  usado apenas na primeiríssima visita (sem dados salvos). */
  function montarConversasIniciais() {
    return CONVERSAS_INICIAIS.map(function (c) {
      return {
        id: c.id,
        nome: c.nome,
        online: c.online,
        favorita: c.favorita,
        naoLidas: 0,
        mensagens: c.mensagens.map(function (m) {
          var ts = new Date(Date.now() - m.minutosAtras * 60000).toISOString();
          return { de: m.de, texto: m.texto, ts: ts };
        })
      };
    });
  }

  /** Gera um histórico inicial simulado para um grupo recém-aberto
   *  que ainda não tem nenhuma mensagem salva — só para a conversa
   *  não abrir totalmente vazia na primeira vez. */
  function montarHistoricoInicialGrupo(grupo) {
    var autor1 = MEMBROS_FICTICIOS[Math.floor(Math.random() * MEMBROS_FICTICIOS.length)];
    return [
      { de: 'outro', autor: grupo.moderador || 'Equipe MindBridge', texto: 'Bem-vindo(a) ao grupo "' + grupo.nome + '"! Esse é um espaço de respeito e escuta — sinta-se à vontade para compartilhar no seu tempo.', ts: new Date(Date.now() - 90 * 60000).toISOString() },
      { de: 'outro', autor: autor1, texto: 'Oi pessoal, que bom ter gente nova por aqui 💜', ts: new Date(Date.now() - 70 * 60000).toISOString() }
    ];
  }

  function inicializarEstado() {
    var salvas = carregarConversas();
    estado.conversas = (salvas && salvas.length) ? salvas : montarConversasIniciais();

    estado.grupos = lerGruposParticipando();

    var mensagensSalvas = carregarMensagensGrupos();
    estado.mensagensGrupos = mensagensSalvas || {};

    /* Garante histórico inicial para grupos que ainda não têm
       nenhuma mensagem registrada (ex: acabou de entrar agora). */
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

    if (ehGrupos) {
      renderizarListaGrupos();
    } else {
      renderizarLista();
    }
  }

  if (abaBtnDiretas) abaBtnDiretas.addEventListener('click', function () { trocarAba('diretas'); });
  if (abaBtnGrupos)  abaBtnGrupos.addEventListener('click', function () { trocarAba('grupos'); });

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

    /* Filtro por chip ativo */
    if (estado.filtroAtual === 'nao-lidas') {
      lista = lista.filter(function (c) { return c.naoLidas > 0; });
    } else if (estado.filtroAtual === 'favoritas') {
      lista = lista.filter(function (c) { return c.favorita; });
    }

    /* Filtro por texto de busca (nome) */
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
      var ultima = ultimaMensagem(c);
      var preview = ultima
        ? (ultima.de === 'eu' ? 'Você: ' : '') + ultima.texto
        : 'Começe a conversar...';
      var hora = ultima ? tempoRelativoCurto(new Date(ultima.ts)) : '';

      var item = document.createElement('button');
      item.type = 'button';
      item.className = 'msg-item' + (estado.grupoAtivoId === null && c.id === estado.conversaAtivaId ? ' ativo' : '') + (c.naoLidas > 0 ? ' nao-lida' : '');
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
      var ultima = ultimaMensagemGrupo(g.id);
      var preview = ultima
        ? (ultima.de === 'eu' ? 'Você: ' : (ultima.autor ? ultima.autor + ': ' : '')) + ultima.texto
        : 'Nenhuma mensagem ainda.';
      var hora = ultima ? tempoRelativoCurto(new Date(ultima.ts)) : '';
      var corHex = CORES_GRUPO[g.cor] || CORES_GRUPO['cor-outro'];

      var item = document.createElement('button');
      item.type = 'button';
      item.className = 'msg-item' + (g.id === estado.grupoAtivoId ? ' ativo' : '');
      item.setAttribute('data-grupo-id', g.id);

      item.innerHTML =
        '<div class="msg-item-avatar-wrap">' +
          '<div class="msg-avatar msg-avatar-grupo" style="background-color:' + corHex + '"><i class="ti ' + escaparHTML(g.icone || 'ti-users') + '"></i></div>' +
        '</div>' +
        '<div class="msg-item-conteudo">' +
          '<div class="msg-item-linha-topo">' +
            '<span class="msg-item-nome">' + escaparHTML(g.nome) + '</span>' +
            '<span class="msg-item-hora">' + escaparHTML(hora) + '</span>' +
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
  if (btnProcurarGrupos)      btnProcurarGrupos.addEventListener('click', abrirModalGrupos);
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

  /** Ajusta o cabeçalho e os botões de ação para o tipo certo de
   *  conversa (direta ou grupo), já que os dois compartilham o
   *  mesmo painel de chat na área da direita. */
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
    estado.grupoAtivoId = null;
    conversa.naoLidas = 0; /* marca como lida ao abrir */

    ajustarCabecalhoParaTipo(false);

    /* Atualiza cabeçalho da conversa */
    msgConversaNome.textContent = conversa.nome;
    msgConversaAvatar.className = 'msg-avatar';
    msgConversaAvatar.style.backgroundColor = '';
    msgConversaAvatar.innerHTML = escaparHTML(iniciaisDe(conversa.nome));
    msgConversaStatus.className = 'msg-conversa-status' + (conversa.online ? '' : ' offline');
    msgConversaStatus.innerHTML = '<span class="msg-status-ponto"></span> ' + (conversa.online ? 'Online agora' : 'Offline');

    /* Atualiza estado visual do botão "favoritar" no menu */
    var btnFav = document.getElementById('btnFavoritar');
    if (btnFav) {
      btnFav.classList.toggle('ativo', !!conversa.favorita);
      btnFav.querySelector('span').textContent = conversa.favorita ? 'Remover dos favoritos' : 'Favoritar conversa';
    }

    msgChatVazio.hidden = true;
    msgConversaBox.hidden = false;

    if (msgShell) msgShell.classList.add('mostrando-chat');

    renderizarMensagens(montarMensagensParaExibicao(conversa.mensagens, false));
    renderizarLista();
    salvarConversas();

    var textarea = document.getElementById('msgTextarea');
    if (textarea) setTimeout(function () { textarea.focus({ preventScroll: true }); }, 150);
  }

  /** Abre a conversa de um grupo — equivalente a abrirConversa,
   *  mas lendo de estado.grupos / estado.mensagensGrupos em vez
   *  das conversas diretas, e ajustando o cabeçalho (membros em
   *  vez de online/offline, avatar com ícone, etc). */
  function abrirGrupo(id) {
    var grupo = buscarGrupo(id);
    if (!grupo) return;

    estado.grupoAtivoId = id;
    estado.conversaAtivaId = null;

    if (!estado.mensagensGrupos[id]) estado.mensagensGrupos[id] = montarHistoricoInicialGrupo(grupo);

    ajustarCabecalhoParaTipo(true);

    var corHex = CORES_GRUPO[grupo.cor] || CORES_GRUPO['cor-outro'];
    msgConversaNome.textContent = grupo.nome;
    msgConversaAvatar.className = 'msg-avatar msg-avatar-grupo';
    msgConversaAvatar.style.backgroundColor = corHex;
    msgConversaAvatar.innerHTML = '<i class="ti ' + escaparHTML(grupo.icone || 'ti-users') + '"></i>';
    msgConversaStatus.className = 'msg-conversa-status grupo';
    msgConversaStatus.innerHTML = '<span class="msg-status-ponto"></span> ' +
      (grupo.membros ? grupo.membros.toLocaleString('pt-BR') : '1') + (grupo.membros === 1 ? ' membro' : ' membros');

    msgChatVazio.hidden = true;
    msgConversaBox.hidden = false;

    if (msgShell) msgShell.classList.add('mostrando-chat');

    /* Garante que a aba "Grupos" também fique selecionada quando
       o grupo é aberto diretamente (ex: vindo da URL ou de um
       clique na lista enquanto a aba "Diretas" estava ativa). */
    if (estado.abaAtiva !== 'grupos') trocarAba('grupos');

    renderizarMensagens(montarMensagensParaExibicao(estado.mensagensGrupos[id], true));
    renderizarListaGrupos();
    salvarMensagensGrupos();

    var textarea = document.getElementById('msgTextarea');
    if (textarea) setTimeout(function () { textarea.focus({ preventScroll: true }); }, 150);
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

  /** Normaliza mensagens de conversa direta e de grupo para um
   *  formato único de exibição: { de, autor (opcional), texto, ts }.
   *  Conversas diretas não têm "autor" (já se sabe quem é "outro"),
   *  grupos têm, para mostrar o nome de quem enviou. */
  function montarMensagensParaExibicao(mensagens, ehGrupo) {
    return mensagens.map(function (m) {
      return { de: m.de, autor: ehGrupo ? m.autor : null, texto: m.texto, ts: m.ts };
    });
  }

  function formatarDivisorData(data) {
    var hoje = new Date();
    var ontem = new Date(); ontem.setDate(hoje.getDate() - 1);
    var mesmodia = function (a, b) {
      return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
    };
    if (mesmodia(data, hoje))  return 'Hoje';
    if (mesmodia(data, ontem)) return 'Ontem';
    return data.toLocaleDateString('pt-BR');
  }

  function renderizarMensagens(mensagens) {
    msgCorpo.innerHTML = '';
    var ultimoDivisor = null;

    mensagens.forEach(function (m) {
      var data = new Date(m.ts);
      var rotuloData = formatarDivisorData(data);

      if (rotuloData !== ultimoDivisor) {
        var divisor = document.createElement('div');
        divisor.className = 'msg-data-divisor';
        divisor.textContent = rotuloData;
        msgCorpo.appendChild(divisor);
        ultimoDivisor = rotuloData;
      }

      var linha = document.createElement('div');
      linha.className = 'msg-bolha-linha ' + (m.de === 'eu' ? 'enviada' : 'recebida');

      var autorHtml = (m.autor && m.de !== 'eu') ? '<span class="msg-bolha-autor">' + escaparHTML(m.autor) + '</span>' : '';

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

  var msgTextarea  = document.getElementById('msgTextarea');
  var msgEnviarBtn = document.getElementById('msgEnviarBtn');
  var msgDigitando = document.getElementById('msgDigitando');
  var msgDigitandoAvatar = document.getElementById('msgDigitandoAvatar');

  if (msgTextarea) {
    msgTextarea.addEventListener('input', function () {
      msgEnviarBtn.disabled = msgTextarea.value.trim().length === 0;
      msgTextarea.style.height = 'auto';
      msgTextarea.style.height = Math.min(msgTextarea.scrollHeight, 110) + 'px';
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

    msgTextarea.value = '';
    msgTextarea.style.height = 'auto';
    msgEnviarBtn.disabled = true;

    if (estado.grupoAtivoId) {
      enviarMensagemGrupo(texto);
    } else if (estado.conversaAtivaId) {
      enviarMensagemDireta(texto);
    }
  }

  function enviarMensagemDireta(texto) {
    var conversa = buscarConversa(estado.conversaAtivaId);
    if (!conversa) return;

    conversa.mensagens.push({ de: 'eu', texto: texto, ts: new Date().toISOString() });

    renderizarMensagens(montarMensagensParaExibicao(conversa.mensagens, false));
    renderizarLista();
    salvarConversas();

    simularRespostaDireta(conversa);
  }

  function simularRespostaDireta(conversa) {
    if (!conversa.online) return; /* pessoas offline não respondem na hora */

    msgDigitandoAvatar.className = 'msg-avatar msg-avatar-mini';
    msgDigitandoAvatar.style.backgroundColor = '';
    msgDigitandoAvatar.textContent = iniciaisDe(conversa.nome);
    msgDigitando.hidden = false;
    rolarParaFinal();

    var atraso = 1400 + Math.random() * 1600;
    setTimeout(function () {
      msgDigitando.hidden = true;
      var respostaTexto = RESPOSTAS_SIMULADAS[Math.floor(Math.random() * RESPOSTAS_SIMULADAS.length)];
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
    var grupo = buscarGrupo(grupoId);
    if (!grupo) return;

    if (!estado.mensagensGrupos[grupoId]) estado.mensagensGrupos[grupoId] = [];
    estado.mensagensGrupos[grupoId].push({ de: 'eu', autor: 'Você', texto: texto, ts: new Date().toISOString() });

    renderizarMensagens(montarMensagensParaExibicao(estado.mensagensGrupos[grupoId], true));
    renderizarListaGrupos();
    salvarMensagensGrupos();

    simularRespostaGrupo(grupoId);
  }

  function simularRespostaGrupo(grupoId) {
    var grupo = buscarGrupo(grupoId);
    if (!grupo) return;

    var autor = MEMBROS_FICTICIOS[Math.floor(Math.random() * MEMBROS_FICTICIOS.length)];

    msgDigitandoAvatar.className = 'msg-avatar msg-avatar-mini';
    msgDigitandoAvatar.style.backgroundColor = '';
    msgDigitandoAvatar.textContent = iniciaisDe(autor);
    msgDigitando.hidden = false;
    rolarParaFinal();

    var atraso = 1500 + Math.random() * 1800;
    setTimeout(function () {
      msgDigitando.hidden = true;
      var respostaTexto = RESPOSTAS_SIMULADAS[Math.floor(Math.random() * RESPOSTAS_SIMULADAS.length)];
      if (!estado.mensagensGrupos[grupoId]) estado.mensagensGrupos[grupoId] = [];
      estado.mensagensGrupos[grupoId].push({ de: 'outro', autor: autor, texto: respostaTexto, ts: new Date().toISOString() });

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
     10. MENU "MAIS OPÇÕES" (diretas e grupos)
  ============================================================ */

  var btnMais = document.getElementById('btnMais');

  if (btnMais) {
    btnMais.addEventListener('click', function (e) {
      e.stopPropagation();
      var menuAtivo = estado.grupoAtivoId ? msgMenuMaisGrupo : msgMenuMais;
      menuAtivo.classList.toggle('aberto');
    });
    document.addEventListener('click', function (e) {
      if (!msgMenuMais.contains(e.target) && e.target !== btnMais) msgMenuMais.classList.remove('aberto');
      if (!msgMenuMaisGrupo.contains(e.target) && e.target !== btnMais) msgMenuMaisGrupo.classList.remove('aberto');
    });
  }

  document.querySelectorAll('#msgMenuMais button').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var acao = btn.getAttribute('data-acao');
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
      var acao = btn.getAttribute('data-acao-grupo');
      var grupoId = estado.grupoAtivoId;
      var grupo = buscarGrupo(grupoId);
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

        estado.grupoAtivoId = null;
        msgConversaBox.hidden = true;
        msgChatVazio.hidden = false;
        if (msgShell) msgShell.classList.remove('mostrando-chat');

        renderizarListaGrupos();
        mostrarToast('Você saiu do grupo "' + grupo.nome + '".');
      } else if (acao === 'denunciar') {
        mostrarToast('Denúncia enviada à nossa equipe de moderação.', 'erro');
      }
    });
  });


  /* ============================================================
     11. MODAL "ENCONTRAR PESSOAS"
  ============================================================ */

  var mpOverlay       = document.getElementById('mpOverlay');
  var mpFechar        = document.getElementById('mpFechar');
  var mpBuscaInput    = document.getElementById('mpBuscaInput');
  var mpResultados    = document.getElementById('mpResultados');
  var mpVazio         = document.getElementById('mpVazio');
  var btnNovaConversa = document.getElementById('btnNovaConversa');

  var mpTemaAtual = 'todos';

  /** Posiciona um popover (.mp-overlay) ancorado perto do botão
   *  que o abriu — função genérica usada tanto pelo modal
   *  "Encontrar pessoas" quanto por "Procurar grupos", já que os
   *  dois compartilham o mesmo layout de popover compacto. */
  function posicionarPopover(overlay, botaoOrigem) {
    if (!botaoOrigem) return;
    var rect = botaoOrigem.getBoundingClientRect();
    var larguraModal = 300;
    var margem = 12;

    var left = rect.right - larguraModal;
    if (left < margem) left = margem;
    var maxLeft = window.innerWidth - larguraModal - margem;
    if (left > maxLeft) left = maxLeft;

    overlay.style.left = left + 'px';
    overlay.style.top  = (rect.bottom + 8) + 'px';
  }

  function abrirModalPessoas(evento) {
    if (!mpOverlay) return;
    mpBuscaInput.value = '';
    mpTemaAtual = 'todos';
    document.querySelectorAll('.mp-tema-chip').forEach(function (c) {
      c.classList.toggle('ativo', c.getAttribute('data-tema-pessoa') === 'todos');
    });
    renderizarPessoas();

    var botaoOrigem = (evento && evento.currentTarget) || btnNovaConversa;
    posicionarPopover(mpOverlay, botaoOrigem);

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
  if (mpFechar) mpFechar.addEventListener('click', fecharModalPessoas);
  if (mpOverlay) {
    mpOverlay.addEventListener('click', function (e) { if (e.target === mpOverlay) fecharModalPessoas(); });
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
      var bateTema  = mpTemaAtual === 'todos' || p.tema === mpTemaAtual;
      var bateBusca = !termo || p.nome.toLowerCase().indexOf(termo) !== -1;
      return bateTema && bateBusca;
    });

    mpResultados.innerHTML = '';

    if (!lista.length) {
      mpVazio.hidden = false;
      return;
    }
    mpVazio.hidden = true;

    lista.forEach(function (p) {
      var jaTemConversa = !!buscarConversa(p.id);

      var item = document.createElement('div');
      item.className = 'mp-pessoa';
      item.innerHTML =
        '<div class="msg-avatar">' + escaparHTML(iniciaisDe(p.nome)) + '</div>' +
        '<div class="mp-pessoa-info">' +
          '<span class="mp-pessoa-nome">' + escaparHTML(p.nome) + '</span>' +
          '<span class="mp-pessoa-tag">' + escaparHTML(p.tag) + '</span>' +
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
    var existente = buscarConversa(pessoa.id);

    if (!existente) {
      estado.conversas.push({
        id: pessoa.id,
        nome: pessoa.nome,
        online: Math.random() > 0.35, /* a maioria aparece online para a demo ficar viva */
        favorita: false,
        naoLidas: 0,
        mensagens: []
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
     12. MODAL "PROCURAR GRUPOS"                              ← NOVO
     Mesmo padrão visual e de posicionamento do modal "Encontrar
     pessoas" (popover compacto ancorado perto do botão), só que
     lista os grupos de TODOS_GRUPOS que o usuário ainda não
     participa, e ao entrar salva direto em
     'mb_grupos_participando' — o mesmo contrato de dados usado
     por mindbridge-comunidade-grupos.js.
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

    var botaoOrigem = (evento && evento.currentTarget) || btnProcurarGrupos;
    posicionarPopover(bgOverlay, botaoOrigem);

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
    bgOverlay.addEventListener('click', function (e) { if (e.target === bgOverlay) fecharModalGrupos(); });
  }
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && bgOverlay && bgOverlay.classList.contains('aberto')) fecharModalGrupos();
  });
  if (bgBuscaInput) bgBuscaInput.addEventListener('input', renderizarBuscaGrupos);

  function renderizarBuscaGrupos() {
    var termo = bgBuscaInput.value.trim().toLowerCase();

    var lista = TODOS_GRUPOS.filter(function (g) {
      var bateBusca = !termo
        || g.nome.toLowerCase().indexOf(termo) !== -1
        || g.temas.some(function (t) { return t.indexOf(termo) !== -1; });
      return bateBusca;
    });

    bgResultados.innerHTML = '';

    if (!lista.length) {
      bgVazio.hidden = false;
      return;
    }
    bgVazio.hidden = true;

    lista.forEach(function (g) {
      var jaParticipa = !!buscarGrupo(g.id);
      var corHex = CORES_GRUPO[g.cor] || CORES_GRUPO['cor-outro'];

      var item = document.createElement('div');
      item.className = 'mp-pessoa';
      item.innerHTML =
        '<div class="msg-avatar msg-avatar-grupo" style="background-color:' + corHex + '"><i class="ti ' + escaparHTML(g.icone) + '"></i></div>' +
        '<div class="mp-pessoa-info">' +
          '<span class="mp-pessoa-nome">' + escaparHTML(g.nome) + '</span>' +
          '<span class="mp-pessoa-tag">' + g.membros.toLocaleString('pt-BR') + ' membros</span>' +
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

  /** Garante que o grupo esteja salvo em 'mb_grupos_participando'
   *  (sem duplicar) e devolve o registro salvo — mesma lógica de
   *  garantirGrupoSalvo em mindbridge-comunidade-grupos.js, para
   *  os dois arquivos produzirem exatamente o mesmo formato. */
  function entrarOuAbrirGrupo(dadosGrupo) {
    var existente = buscarGrupo(dadosGrupo.id);

    if (!existente) {
      var novoRegistro = {
        id: dadosGrupo.id,
        nome: dadosGrupo.nome,
        desc: dadosGrupo.desc,
        icone: dadosGrupo.icone,
        cor: dadosGrupo.cor,
        temas: dadosGrupo.temas,
        membros: dadosGrupo.membros,
        moderador: dadosGrupo.moderador,
        privacidade: dadosGrupo.privacidade,
        entrouEm: new Date().toISOString()
      };
      estado.grupos.push(novoRegistro);
      salvarGruposParticipando(estado.grupos);
      estado.mensagensGrupos[dadosGrupo.id] = montarHistoricoInicialGrupo(novoRegistro);
      salvarMensagensGrupos();
      mostrarToast('Você entrou no grupo "' + dadosGrupo.nome + '" 💜', 'sucesso');
    }

    fecharModalGrupos();
    trocarAba('grupos');
    renderizarListaGrupos();
    abrirGrupo(dadosGrupo.id);
  }


  /* ============================================================
     13. MODAL "CHAMADA" (voz / vídeo)
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
    /* Chamadas só existem para conversas diretas nesta versão —
       os botões já ficam ocultos em grupos (ver
       ajustarCabecalhoParaTipo), isso é só uma proteção extra. */
    var conversa = buscarConversa(estado.conversaAtivaId);
    if (!conversa || !chOverlay) return;

    chTipo.textContent = tipoChamada === 'video' ? 'Chamada de vídeo' : 'Chamada de voz';
    chAvatarGrande.textContent = iniciaisDe(conversa.nome);
    chNomeEl.textContent = conversa.nome;
    chStatus.textContent = conversa.online ? 'Chamando...' : 'Tocando — pode levar um momento...';
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

  if (btnLigarEl) btnLigarEl.addEventListener('click', function () { abrirChamada('voz'); });
  if (btnVideoEl) btnVideoEl.addEventListener('click', function () { abrirChamada('video'); });
  if (chEncerrar) chEncerrar.addEventListener('click', fecharChamada);

  if (chMudo) chMudo.addEventListener('click', function () {
    chMudo.classList.toggle('ativo');
    var icone = chMudo.querySelector('i');
    icone.className = chMudo.classList.contains('ativo') ? 'ti ti-microphone-off' : 'ti ti-microphone';
  });
  if (chAltoFalante) chAltoFalante.addEventListener('click', function () {
    chAltoFalante.classList.toggle('ativo');
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && chOverlay && chOverlay.classList.contains('aberto')) fecharChamada();
  });


  /* ============================================================
     14. LEITURA DE PARÂMETROS DA URL (?aba=&grupo=)        ← NOVO
     Preenchidos pelo redirecionamento feito em
     mindbridge-comunidade-grupos.js ao confirmar "Entrar no
     grupo" na página de Comunidade:
       mindbridge-mensagens.html?aba=grupos&grupo=<id>
  ============================================================ */

  function lerParametrosDeEntrada() {
    var params = new URLSearchParams(window.location.search);
    return {
      aba: params.get('aba'),
      grupo: params.get('grupo')
    };
  }


  /* ============================================================
     15. INICIALIZAÇÃO
  ============================================================ */

  inicializarEstado();
  renderizarLista();
  renderizarListaGrupos();

  var paramsEntrada = lerParametrosDeEntrada();

  if (paramsEntrada.grupo && buscarGrupo(paramsEntrada.grupo)) {
    /* Veio da Comunidade com um grupo específico — abre direto nele,
       já na aba "Grupos" (abrirGrupo já troca a aba internamente). */
    abrirGrupo(paramsEntrada.grupo);
  } else if (paramsEntrada.aba === 'grupos') {
    trocarAba('grupos');
    if (estado.grupos.length) {
      abrirGrupo(ordenarGruposPorRecencia(estado.grupos)[0].id);
    }
  } else if (estado.conversas.length) {
    /* Comportamento padrão: abre automaticamente a conversa direta
       mais recente, já mostrando contato, mensagens e as opções
       (ligar, vídeo, mais opções), sem precisar de um clique extra. */
    var primeiraConversa = ordenarConversasPorRecencia(estado.conversas)[0];
    abrirConversa(primeiraConversa.id);
  }

});