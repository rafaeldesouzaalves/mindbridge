/* ================================================================
   MINDBRIDGE — CADASTRO (JS)
   Controla:
   1. Rotação automática das mensagens de apoio (painel esquerdo)
   2. Mostrar/ocultar senha (dois campos)
   3. Indicador de força da senha
   4. Validação do formulário em tempo real
   5. Envio simulado (spinner) + redirecionamento para o login
================================================================ */

document.addEventListener('DOMContentLoaded', () => {

    /* ============================================================
       1. MENSAGENS DE APOIO ROTATIVAS
    ============================================================ */
    (function iniciarMensagensApoio() {
        const slides = Array.from(document.querySelectorAll('.slide-apoio'));
        const containerIndicadores = document.getElementById('indicadores');

        if (!slides.length || !containerIndicadores) return;

        let indiceAtual = slides.findIndex((s) => s.classList.contains('is-ativo'));
        if (indiceAtual === -1) indiceAtual = 0;

        const TEMPO_TROCA = 5000; // 5s entre cada mensagem
        let temporizador = null;

        // Cria uma bolinha indicadora para cada slide
        slides.forEach((_, i) => {
            const ponto = document.createElement('span');
            ponto.classList.add('ponto');
            if (i === indiceAtual) ponto.classList.add('is-ativo');
            ponto.addEventListener('click', () => irPara(i, true));
            containerIndicadores.appendChild(ponto);
        });

        const pontos = Array.from(containerIndicadores.querySelectorAll('.ponto'));

        function mostrarSlide(indice) {
            slides.forEach((slide, i) => slide.classList.toggle('is-ativo', i === indice));
            pontos.forEach((ponto, i) => ponto.classList.toggle('is-ativo', i === indice));
        }

        function irPara(indice, reiniciarAuto) {
            indiceAtual = indice;
            mostrarSlide(indiceAtual);
            if (reiniciarAuto) reiniciarAutoTroca();
        }

        function proximaSlide() {
            indiceAtual = (indiceAtual + 1) % slides.length;
            mostrarSlide(indiceAtual);
        }

        function reiniciarAutoTroca() {
            clearInterval(temporizador);
            temporizador = setInterval(proximaSlide, TEMPO_TROCA);
        }

        reiniciarAutoTroca();
    })();


    /* ============================================================
       2. MOSTRAR / OCULTAR SENHA
    ============================================================ */
    document.querySelectorAll('.btn-ver-senha').forEach((botao) => {
        botao.addEventListener('click', () => {
            const idAlvo = botao.dataset.alvo;
            const campo = document.getElementById(idAlvo);
            if (!campo) return;

            const icone = botao.querySelector('i');
            const visivel = campo.type === 'text';

            campo.type = visivel ? 'password' : 'text';
            icone.classList.toggle('ti-eye', visivel);
            icone.classList.toggle('ti-eye-off', !visivel);
            botao.setAttribute('aria-label', visivel ? 'Mostrar senha' : 'Ocultar senha');
        });
    });


    /* ============================================================
       3. INDICADOR DE FORÇA DA SENHA
    ============================================================ */
    const campoSenha = document.getElementById('password');
    const barraForcaSenha = document.getElementById('forcaSenha');
    const textoForcaSenha = document.getElementById('textoForcaSenha');

    function calcularForcaSenha(valor) {
        if (!valor) return 0;

        let pontos = 0;
        if (valor.length >= 6) pontos++;
        if (valor.length >= 10) pontos++;
        if (/[A-Z]/.test(valor) && /[a-z]/.test(valor)) pontos++;
        if (/\d/.test(valor)) pontos++;
        if (/[^A-Za-z0-9]/.test(valor)) pontos++;

        return Math.min(pontos, 4);
    }

    const NIVEIS_FORCA = [
        { classe: '',      texto: '\u00a0' },
        { classe: 'fraca', texto: 'Senha fraca' },
        { classe: 'media', texto: 'Senha média' },
        { classe: 'boa',   texto: 'Senha boa' },
        { classe: 'forte', texto: 'Senha forte' },
    ];

    function atualizarForcaSenha() {
        if (!campoSenha) return;

        const nivel = calcularForcaSenha(campoSenha.value);
        const info = NIVEIS_FORCA[nivel];

        barraForcaSenha.className = 'forca-senha';
        textoForcaSenha.className = 'texto-forca-senha';

        if (info.classe) {
            barraForcaSenha.classList.add(info.classe);
            textoForcaSenha.classList.add(info.classe);
        }

        textoForcaSenha.textContent = info.texto;
    }

    if (campoSenha) {
        campoSenha.addEventListener('input', atualizarForcaSenha);
    }


    /* ============================================================
       4. VALIDAÇÃO DO FORMULÁRIO
    ============================================================ */
    const form = document.getElementById('cadastroForm');
    const btnCadastrar = document.getElementById('btnCadastrar');

    const campos = {
        nome: document.getElementById('nome'),
        sobrenome: document.getElementById('sobrenome'),
        email: document.getElementById('email'),
        password: document.getElementById('password'),
        confirmarSenha: document.getElementById('confirmarSenha'),
        aceitarTermos: document.getElementById('aceitarTermos'),
    };

    function pegarGrupo(campo) {
        return campo.closest('.input-group') || campo.closest('.checkbox-group');
    }

    function mostrarErro(campo) {
        const grupo = pegarGrupo(campo);
        if (grupo) grupo.classList.add('erro');
    }

    function limparErro(campo) {
        const grupo = pegarGrupo(campo);
        if (grupo) grupo.classList.remove('erro');
    }

    function validarEmail(valor) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(valor);
    }

    function validarNome(campo) {
        const valido = campo.value.trim().length >= 2;
        valido ? limparErro(campo) : mostrarErro(campo);
        return valido;
    }

    function validarEmailCampo() {
        const valido = validarEmail(campos.email.value.trim());
        valido ? limparErro(campos.email) : mostrarErro(campos.email);
        return valido;
    }

    function validarSenha() {
        const valido = campos.password.value.length >= 6;
        valido ? limparErro(campos.password) : mostrarErro(campos.password);
        return valido;
    }

    function validarConfirmarSenha() {
        const valido =
            campos.confirmarSenha.value.length >= 6 &&
            campos.confirmarSenha.value === campos.password.value;
        valido ? limparErro(campos.confirmarSenha) : mostrarErro(campos.confirmarSenha);
        return valido;
    }

    function validarTermos() {
        const valido = campos.aceitarTermos.checked;
        valido ? limparErro(campos.aceitarTermos) : mostrarErro(campos.aceitarTermos);
        return valido;
    }

    // Validação em tempo real, conforme a pessoa digita / sai do campo
    campos.nome.addEventListener('blur', () => validarNome(campos.nome));
    campos.sobrenome.addEventListener('blur', () => validarNome(campos.sobrenome));
    campos.email.addEventListener('blur', validarEmailCampo);
    campos.password.addEventListener('input', () => {
        if (pegarGrupo(campos.password).classList.contains('erro')) validarSenha();
        if (campos.confirmarSenha.value) validarConfirmarSenha();
    });
    campos.confirmarSenha.addEventListener('input', validarConfirmarSenha);
    campos.aceitarTermos.addEventListener('change', validarTermos);

    [campos.nome, campos.sobrenome, campos.email, campos.password, campos.confirmarSenha].forEach((campo) => {
        campo.addEventListener('input', () => {
            if (pegarGrupo(campo).classList.contains('erro')) {
                limparErro(campo);
            }
        });
    });


    /* ============================================================
       5. ENVIO DO FORMULÁRIO
    ============================================================ */
    form.addEventListener('submit', (evento) => {
        evento.preventDefault();

        const nomeValido = validarNome(campos.nome);
        const sobrenomeValido = validarNome(campos.sobrenome);
        const emailValido = validarEmailCampo();
        const senhaValida = validarSenha();
        const confirmarSenhaValida = validarConfirmarSenha();
        const termosAceitos = validarTermos();

        const formularioValido =
            nomeValido &&
            sobrenomeValido &&
            emailValido &&
            senhaValida &&
            confirmarSenhaValida &&
            termosAceitos;

        if (!formularioValido) {
            // Leva o foco até o primeiro campo com problema
            const primeiroComErro = document.querySelector('.input-group.erro input, .checkbox-group.erro input');
            if (primeiroComErro) primeiroComErro.focus();
            return;
        }

        // Simula o envio (substituir por chamada real à API quando integrar o backend)
        form.classList.add('carregando');
        btnCadastrar.disabled = true;

        setTimeout(() => {
            window.location.href = 'mindbridge-home.html?cadastro=sucesso';
        }, 1500);
    });

});