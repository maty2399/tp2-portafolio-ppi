const playArea = document.getElementById('play-area');
const scoreDisplay = document.getElementById('score');
const livesDisplay = document.getElementById('lives');
const levelDisplay = document.getElementById('level');
const startBtn = document.getElementById('start-btn');
const startScreen = document.getElementById('start-screen');
const screenTitle = document.getElementById('screen-title');
const screenMsg = document.getElementById('screen-msg');
const difficultySelect = document.getElementById('difficulty');

// Niveles de dificultad:
// spawn = cada cuántos ms aparece un bug
// duracion = cuántos ms queda en pantalla antes de escaparse
const DIFICULTADES = {
    facil:   { nombre: 'Fácil',   spawn: 1200, duracion: 2000 },
    medio:   { nombre: 'Medio',   spawn: 1000, duracion: 1500 },
    dificil: { nombre: 'Difícil', spawn: 700,  duracion: 1000 }
};

let score = 0;
let lives = 3;
let jugando = false;
let gameInterval = null;
let config = DIFICULTADES.medio;

startBtn.addEventListener('click', startGame);

function startGame() {
    config = DIFICULTADES[difficultySelect.value];

    clearBugs();
    score = 0;
    lives = 3;
    jugando = true;
    scoreDisplay.textContent = score;
    livesDisplay.textContent = lives;
    levelDisplay.textContent = config.nombre;
    startScreen.style.display = 'none';

    gameInterval = setInterval(createBug, config.spawn);
}

function clearBugs() {
    playArea.querySelectorAll('.bug').forEach(bug => bug.remove());
}

function createBug() {
    if (!jugando) return;

    const bug = document.createElement('div');
    bug.classList.add('bug');
    bug.textContent = '🐛';

    // Posición aleatoria dentro del área de juego
    const maxX = Math.max(0, playArea.clientWidth - 40);
    const maxY = Math.max(0, playArea.clientHeight - 40);
    bug.style.left = `${Math.floor(Math.random() * maxX)}px`;
    bug.style.top = `${Math.floor(Math.random() * maxY)}px`;

    // Clic en el bug: atrapado
    bug.addEventListener('click', () => {
        score += 10;
        scoreDisplay.textContent = score;
        bug.remove();
    });

    playArea.appendChild(bug);

    // Si no lo atrapan a tiempo, se escapa y se pierde una vida
    setTimeout(() => {
        if (bug.isConnected) {
            bug.remove();
            reduceLife();
        }
    }, config.duracion);
}

function reduceLife() {
    lives--;
    livesDisplay.textContent = lives;
    if (lives <= 0) {
        endGame();
    }
}

function endGame() {
    jugando = false;
    clearInterval(gameInterval);
    clearBugs();

    screenTitle.textContent = '¡Juego terminado!';
    screenMsg.textContent = `Puntaje final: ${score} (nivel ${config.nombre})`;
    startBtn.textContent = 'Jugar de nuevo';
    startScreen.style.display = 'flex';
}
