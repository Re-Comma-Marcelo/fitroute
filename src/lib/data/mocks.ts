import type { Exercise, Profile, Routine, Workout, WorkoutSet } from "../types";

// Mock em memória. NUNCA importar este arquivo em componentes —
// use apenas as funções de src/lib/data/*.
// TODO: Supabase — substituir por queries reais.

const ex = (
  id: string,
  nome: string,
  grupoPrimario: string,
  gruposSecundarios: string[],
  equipamento: string,
  instrucoes: string,
): Exercise => ({
  id,
  nome,
  grupoPrimario,
  gruposSecundarios,
  equipamento,
  instrucoes,
  isCustom: false,
});

export const exercises: Exercise[] = [
  ex("e1", "Supino reto", "Peito", ["Tríceps", "Ombros"], "Barra", "Deite no banco com os pés firmes no chão e segure a barra na largura dos ombros. Desça controlado até tocar o meio do peito. Empurre até estender os braços sem travar os cotovelos."),
  ex("e2", "Supino inclinado com halteres", "Peito", ["Ombros", "Tríceps"], "Halteres", "Ajuste o banco entre 30 e 45 graus e segure os halteres na altura do peito. Desça até sentir alongamento na porção superior do peitoral. Suba juntando levemente os halteres no topo."),
  ex("e3", "Supino declinado", "Peito", ["Tríceps"], "Barra", "Posicione o banco em declínio e prenda as pernas. Desça a barra na direção da parte inferior do peito. Empurre de volta mantendo os punhos alinhados."),
  ex("e4", "Crucifixo na máquina", "Peito", ["Ombros"], "Máquina", "Sente com as costas apoiadas e segure as manoplas na altura do peito. Junte os braços num arco lento, apertando o peitoral. Volte controlando o alongamento."),
  ex("e5", "Crossover na polia", "Peito", ["Ombros"], "Polia", "Fique em pé no meio do cabo com um leve passo à frente. Traga as mãos para frente e para baixo, cruzando levemente. Retorne devagar sem deixar os ombros subirem."),
  ex("e6", "Flexão de braço", "Peito", ["Tríceps", "Core"], "Peso corporal", "Apoie as mãos pouco além da largura dos ombros e mantenha o corpo reto. Desça até o peito quase tocar o chão. Empurre mantendo o abdômen firme."),
  ex("e7", "Agachamento livre", "Quadríceps", ["Glúteos", "Core", "Posterior"], "Barra", "Apoie a barra no trapézio, pés na largura dos ombros e peito aberto. Desça empurrando o quadril para trás até as coxas passarem da paralela. Suba pressionando o chão com o meio do pé."),
  ex("e8", "Agachamento frontal", "Quadríceps", ["Glúteos", "Core"], "Barra", "Sustente a barra sobre os deltoides frontais com os cotovelos altos. Desça mantendo o tronco o mais vertical possível. Suba sem deixar os cotovelos caírem."),
  ex("e9", "Leg press 45", "Quadríceps", ["Glúteos"], "Máquina", "Apoie os pés na plataforma na largura dos ombros e destrave o carro. Desça até formar cerca de 90 graus no joelho. Empurre sem travar completamente os joelhos."),
  ex("e10", "Cadeira extensora", "Quadríceps", [], "Máquina", "Ajuste o encosto para o joelho ficar alinhado ao eixo da máquina. Estenda as pernas até quase o bloqueio, apertando o quadríceps. Volte controlando por 2 segundos."),
  ex("e11", "Afundo com halteres", "Quadríceps", ["Glúteos", "Posterior"], "Halteres", "Segure um halter em cada mão e dê um passo à frente. Desça até o joelho de trás quase tocar o chão. Volte empurrando com a perna da frente."),
  ex("e12", "Búlgaro", "Quadríceps", ["Glúteos"], "Halteres", "Apoie o pé de trás em um banco e mantenha o tronco levemente inclinado. Desça até sentir o glúteo alongar. Suba com a perna da frente sem impulso."),
  ex("e13", "Hack machine", "Quadríceps", ["Glúteos"], "Máquina", "Encaixe os ombros nas almofadas e mantenha as costas apoiadas. Desça o quadril controlando o movimento. Empurre pelo meio do pé."),
  ex("e14", "Levantamento terra", "Posterior", ["Glúteos", "Lombar", "Trapézio"], "Barra", "Com a barra sobre o meio do pé, segure com colunas neutras e peito aberto. Suba empurrando o chão e estendendo quadril e joelhos juntos. Desça mantendo a barra rente às pernas."),
  ex("e15", "Stiff", "Posterior", ["Glúteos", "Lombar"], "Barra", "Segure a barra na frente do corpo com joelhos levemente flexionados. Empurre o quadril para trás descendo a barra rente às pernas. Suba contraindo glúteos e posteriores."),
  ex("e16", "Mesa flexora", "Posterior", ["Panturrilha"], "Máquina", "Deite de barriga para baixo com o rolo acima do tendão de Aquiles. Flexione os joelhos levando os pés até os glúteos. Desça devagar sem soltar o peso."),
  ex("e17", "Cadeira flexora", "Posterior", [], "Máquina", "Sente com as costas apoiadas e o rolo sobre a panturrilha. Puxe os pés para baixo e para trás contraindo o posterior. Retorne controlado."),
  ex("e18", "Elevação pélvica", "Glúteos", ["Posterior", "Core"], "Barra", "Apoie as costas em um banco com a barra sobre o quadril. Suba o quadril até alinhar tronco e coxas. Aperte os glúteos no topo por 1 segundo."),
  ex("e19", "Cadeira abdutora", "Glúteos", [], "Máquina", "Sente com as almofadas na parte externa das coxas. Abra as pernas até o limite confortável. Volte resistindo ao peso."),
  ex("e20", "Panturrilha em pé", "Panturrilha", [], "Máquina", "Apoie a ponta dos pés na plataforma com os joelhos estendidos. Suba o máximo possível na ponta dos pés. Desça até sentir alongamento total."),
  ex("e21", "Panturrilha sentado", "Panturrilha", [], "Máquina", "Sente com a almofada sobre os joelhos e a ponta dos pés na plataforma. Eleve os calcanhares ao máximo. Desça lentamente controlando o alongamento."),
  ex("e22", "Remada curvada", "Costas", ["Bíceps", "Lombar"], "Barra", "Incline o tronco cerca de 45 graus com a coluna neutra. Puxe a barra em direção ao abdômen fechando as escápulas. Desça controlado sem levantar o tronco."),
  ex("e23", "Remada curvada com halteres", "Costas", ["Bíceps"], "Halteres", "Apoie uma mão no banco e mantenha as costas retas. Puxe o halter até a lateral do tronco. Desça alongando bem o dorsal."),
  ex("e24", "Puxada alta na frente", "Costas", ["Bíceps"], "Polia", "Segure a barra com pegada aberta e trave as coxas no apoio. Puxe até a barra chegar perto da clavícula. Suba controlando sem encolher os ombros."),
  ex("e25", "Remada baixa na polia", "Costas", ["Bíceps"], "Polia", "Sente com os pés apoiados e o tronco levemente inclinado. Puxe o triângulo até o abdômen fechando as escápulas. Volte alongando o dorsal."),
  ex("e26", "Remada cavalinho", "Costas", ["Bíceps", "Trapézio"], "Máquina", "Apoie o peito no suporte e segure as manoplas. Puxe levando os cotovelos para trás. Desça devagar."),
  ex("e27", "Barra fixa", "Costas", ["Bíceps", "Core"], "Peso corporal", "Segure a barra com pegada pronada na largura dos ombros. Puxe até o queixo passar da barra. Desça controlando toda a descida."),
  ex("e28", "Pulldown com corda", "Costas", ["Ombros"], "Polia", "Em pé, segure a corda com os braços estendidos acima. Puxe para baixo mantendo os braços retos. Retorne com controle."),
  ex("e29", "Desenvolvimento militar", "Ombros", ["Tríceps", "Core"], "Barra", "Em pé, segure a barra na altura da clavícula com o core firme. Empurre acima da cabeça até estender os braços. Desça controlado até o queixo."),
  ex("e30", "Desenvolvimento com halteres", "Ombros", ["Tríceps"], "Halteres", "Sente com as costas apoiadas e os halteres na altura das orelhas. Empurre para cima sem bater os halteres. Desça devagar até 90 graus."),
  ex("e31", "Elevação lateral", "Ombros", [], "Halteres", "Em pé com halteres ao lado do corpo e cotovelos levemente flexionados. Eleve até a linha dos ombros liderando com os cotovelos. Desça em 2 segundos."),
  ex("e32", "Elevação frontal", "Ombros", [], "Halteres", "Segure os halteres à frente das coxas. Eleve os braços até a altura dos olhos. Desça controlado sem balançar o tronco."),
  ex("e33", "Crucifixo inverso", "Ombros", ["Costas"], "Máquina", "Sente de frente para o aparelho com o peito apoiado. Abra os braços para trás apertando a parte posterior dos ombros. Volte devagar."),
  ex("e34", "Encolhimento", "Trapézio", ["Ombros"], "Halteres", "Segure halteres ao lado do corpo com os braços estendidos. Eleve os ombros na direção das orelhas. Desça alongando o trapézio."),
  ex("e35", "Rosca direta", "Bíceps", ["Antebraço"], "Barra", "Em pé, segure a barra com pegada supinada na largura dos ombros. Flexione os cotovelos sem mover os ombros. Desça até estender completamente."),
  ex("e36", "Rosca alternada", "Bíceps", ["Antebraço"], "Halteres", "Em pé com halteres ao lado do corpo. Flexione um braço girando o punho para fora. Desça controlado e alterne."),
  ex("e37", "Rosca martelo", "Bíceps", ["Antebraço"], "Halteres", "Segure os halteres com pegada neutra. Flexione os cotovelos mantendo os punhos fixos. Desça devagar."),
  ex("e38", "Tríceps testa", "Tríceps", [], "Barra", "Deite no banco com a barra acima da testa e cotovelos apontando ao teto. Flexione os cotovelos descendo a barra até perto da cabeça. Estenda sem abrir os cotovelos."),
  ex("e39", "Tríceps na polia com corda", "Tríceps", [], "Polia", "Em pé com cotovelos junto ao corpo, segure a corda. Estenda os cotovelos abrindo a corda no fim. Volte controlado até 90 graus."),
  ex("e40", "Tríceps francês", "Tríceps", [], "Halteres", "Sente e segure um halter com as duas mãos acima da cabeça. Desça atrás da cabeça flexionando os cotovelos. Estenda sem afastar os cotovelos."),
  ex("e41", "Mergulho no banco", "Tríceps", ["Peito"], "Peso corporal", "Apoie as mãos na borda do banco com as pernas à frente. Desça o quadril flexionando os cotovelos. Empurre até estender os braços."),
  ex("e42", "Prancha", "Core", ["Ombros"], "Peso corporal", "Apoie os antebraços e a ponta dos pés mantendo o corpo alinhado. Contraia abdômen e glúteos. Respire mantendo a posição."),
  ex("e43", "Abdominal na polia", "Core", [], "Polia", "Ajoelhe de costas para a polia segurando a corda ao lado da cabeça. Flexione o tronco aproximando as costelas do quadril. Volte devagar."),
];

export let profile: Profile = {
  id: "p1",
  nome: "Marcelo Alves",
  pesoKg: 82.5,
  alturaCm: 178,
  sexo: "masculino",
  nivelAtividade: "moderado",
  objetivo: "manutencao",
  metaTreinosSemana: 4,
};

export function setProfile(next: Profile) {
  profile = next;
}

const re = (
  id: string,
  exerciseId: string,
  ordem: number,
  seriesAlvo: number,
  repsMin: number,
  repsMax: number,
  descansoSeg: number,
  notas = "",
) => ({ id, exerciseId, ordem, seriesAlvo, repsMin, repsMax, descansoSeg, notas });

export const routines: Routine[] = [
  {
    id: "r1",
    nome: "Upper A",
    descricao: "Peito, costas e ombros — foco em força",
    exercicios: [
      re("r1e1", "e1", 0, 4, 5, 8, 150, "Progredir 2,5kg quando fechar 8 reps"),
      re("r1e2", "e24", 1, 4, 8, 12, 120),
      re("r1e3", "e2", 2, 3, 8, 12, 120),
      re("r1e4", "e25", 3, 3, 10, 12, 90),
      re("r1e5", "e31", 4, 3, 12, 15, 60),
      re("r1e6", "e39", 5, 3, 10, 15, 60),
      re("r1e7", "e35", 6, 3, 8, 12, 60),
    ],
  },
  {
    id: "r2",
    nome: "Lower B",
    descricao: "Pernas completas com ênfase em posterior",
    exercicios: [
      re("r2e1", "e7", 0, 4, 5, 8, 180, "Descer sempre abaixo da paralela"),
      re("r2e2", "e15", 1, 3, 8, 10, 150),
      re("r2e3", "e9", 2, 3, 10, 12, 120),
      re("r2e4", "e16", 3, 3, 10, 12, 90),
      re("r2e5", "e10", 4, 3, 12, 15, 60),
      re("r2e6", "e20", 5, 4, 12, 15, 45),
    ],
  },
];

export const workouts: Workout[] = [];
export const workoutSets: WorkoutSet[] = [];

// ---- Histórico gerado: 6 sessões nas últimas 3 semanas ----
const baseCargas: Record<string, number> = {
  e1: 70, e24: 60, e2: 24, e25: 55, e31: 12, e39: 25, e35: 30,
  e7: 90, e15: 70, e9: 160, e16: 45, e10: 55, e20: 80,
};

const dias = [20, 18, 15, 12, 8, 4];
dias.forEach((diasAtras, i) => {
  const rotina = routines[i % 2]!;
  const semana = Math.floor(i / 2);
  const inicio = new Date(Date.now() - diasAtras * 86400000);
  inicio.setHours(19, 30, 0, 0);
  const duracaoSeg = 3300 + i * 120;
  const wid = `w${i + 1}`;
  let volume = 0;
  rotina.exercicios.forEach((rex, exIdx) => {
    const base = baseCargas[rex.exerciseId] ?? 20;
    const peso = Math.round((base + semana * (base > 50 ? 5 : 2)) * 2) / 2;
    for (let s = 1; s <= rex.seriesAlvo; s++) {
      const reps = rex.repsMax - ((s - 1) % 2);
      volume += peso * reps;
      workoutSets.push({
        id: `${wid}s${exIdx}-${s}`,
        workoutId: wid,
        exerciseId: rex.exerciseId,
        ordemExercicio: exIdx,
        serieNum: s,
        tipoSerie: s === 1 ? "aquecimento" : "normal",
        pesoKg: s === 1 ? Math.round(peso * 0.6 * 2) / 2 : peso,
        reps,
        rpe: s === rex.seriesAlvo ? 9 : 8,
        concluida: true,
      });
    }
  });
  workouts.push({
    id: wid,
    routineId: rotina.id,
    iniciadoEm: inicio.toISOString(),
    finalizadoEm: new Date(inicio.getTime() + duracaoSeg * 1000).toISOString(),
    duracaoSeg,
    volumeTotalKg: Math.round(volume),
    notas: i === 5 ? "Sessão forte, dormi bem." : "",
    origem: "rotina",
  });
});

export function delay<T>(value: T, ms = 180): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

export function uid(prefix = "id") {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}