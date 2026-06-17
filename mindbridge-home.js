const mensagens = [
    { nome: "Carla S.", inicial: "C", texto: "Hoje consegui meditar por 10 minutos. Parece pouco, mas pra mim foi enorme." },
    { nome: "Bruno M.", inicial: "B", texto: "Alguém mais sente que a ansiedade piora à noite? Como vocês lidam?" },
    { nome: "Letícia P.", inicial: "L", texto: "Três meses de terapia e já consigo identificar meus gatilhos. Vale muito!" },
    { nome: "Diego F.", inicial: "D", texto: "Passei a semana inteira sem conseguir sair da cama. Hoje foi diferente." },
    { nome: "Marina K.", inicial: "M", texto: "Obrigada a todos que responderam ontem. Vocês não sabem o quanto ajudou." },
    { nome: "Thiago R.", inicial: "T", texto: "Dica: diário de gratidão antes de dormir mudou minha relação com o dia." },
]

let indice = 0

function criarCard(msg) {
    const tempos = ["Agora mesmo", "Há 1 minuto", "Há 2 minutos"]
    const tempo = tempos[Math.floor(Math.random() * tempos.length)]

    const card = document.createElement("div")
    card.classList.add("comunidade-card")

    card.innerHTML = `
        <div class="comunidade-card-header">
            <div class="avatar">${msg.inicial}</div>
            <div>
                <p class="nome">${msg.nome}</p>
                <p class="tempo">${tempo}</p>
            </div>
        </div>
        <p class="mensagem">"${msg.texto}"</p>
        <button class="btn-abraco">
            <i class="ti ti-heart"></i> Abraço virtual
        </button>
        <div class="card-resposta">
            <input type="text" placeholder="Escreva uma mensagem de apoio...">
            <button><i class="ti ti-send"></i></button>
        </div>
    `
    return card
}

function atualizarCards() {
    const container = document.querySelector(".comunidade-cards")
    if (!container) return

    const msg = mensagens[indice % mensagens.length]
    const novoCard = criarCard(msg)

    // Insere no topo
    container.insertBefore(novoCard, container.firstChild)

    // Limita a 3 cards visíveis
    const cards = container.querySelectorAll(".comunidade-card")
    if (cards.length > 3) {
        cards[cards.length - 1].remove()
    }

    indice++
}

// Inicia após 3 segundos, repete a cada 4 segundos
setTimeout(() => {
    atualizarCards()
    setInterval(atualizarCards, 4000)
}, 3000)

