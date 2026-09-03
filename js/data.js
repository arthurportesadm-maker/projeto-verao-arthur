export const DAILY_TARGETS = { kcal: 2600, protein: 180, carbs: 280, fat: 85 };

export const MEALS = [
  { id: "breakfast", label: "Café da manhã", short: "Café", icon: "☀", target: { protein: 42, carbs: 70, fat: 20 } },
  { id: "lunch", label: "Almoço", short: "Almoço", icon: "◐", target: { protein: 50, carbs: 75, fat: 22 } },
  { id: "snack", label: "Lanche da tarde", short: "Lanche", icon: "◇", target: { protein: 38, carbs: 55, fat: 18 } },
  { id: "dinner", label: "Jantar", short: "Jantar", icon: "☾", target: { protein: 50, carbs: 80, fat: 25 } }
];

export const BLOCKS = {
  P: {
    label: "Proteína",
    color: "blue",
    items: [
      ["Frango", "100 g pronto"], ["Tilápia/peixe com escamas", "120 g pronto"],
      ["Carne bovina magra", "100 g pronto"], ["Atum em água", "1 lata (~120 g)"],
      ["Sardinha", "1 lata (~100-125 g)"], ["Whey", "30 g"],
      ["Ovos", "4 unidades"], ["Claras", "7-8 unidades"], ["Frango + ovo", "70 g + 1 ovo"]
    ]
  },
  C: {
    label: "Carboidrato",
    color: "green",
    items: [
      ["Arroz cozido", "90-100 g"], ["Macarrão cozido", "100-110 g"],
      ["Batata inglesa", "170-180 g"], ["Batata-doce", "130-150 g"],
      ["Mandioca", "90-100 g"], ["Cuscuz cozido", "100-120 g"],
      ["Tapioca", "40 g de goma"], ["Aveia", "35-40 g"],
      ["Pão francês", "~50 g"], ["Banana", "1 média"], ["Mamão", "200-250 g"]
    ]
  },
  L: {
    label: "Leguminosa",
    color: "purple",
    items: [["Feijão carioca/preto", "100 g"], ["Lentilha", "100 g"], ["Grão-de-bico", "90-100 g"], ["Ervilha seca", "100 g"]]
  },
  V: {
    label: "Vegetais",
    color: "mint",
    items: [
      ["Brócolis", "100 g"], ["Cenoura", "100 g"], ["Abobrinha", "100 g"],
      ["Couve-flor", "100 g"], ["Abóbora", "100 g"], ["Chuchu", "100 g"],
      ["Vagem", "100 g"], ["Repolho", "100 g"], ["Couve", "100 g"], ["Tomate/folhas", "à vontade"],
      ["Mamão", "200-250 g"], ["Banana", "1 média"], ["Morango", "150-200 g"]
    ]
  },
  G: {
    label: "Gordura",
    color: "orange",
    items: [["Azeite", "10 g"], ["Pasta de amendoim", "15-20 g"], ["Amendoim/castanhas", "15-20 g"], ["Abacate", "60-70 g"], ["Gema extra", "2 unidades"]]
  }
};

export const MEAL_FORMULAS = {
  breakfast: [{ key: "P", count: 1.5 }, { key: "C", count: 2 }, { key: "V", count: 1, label: "Fruta" }, { key: "G", count: 0.5 }],
  lunch: [{ key: "P", count: 2 }, { key: "C", count: 2 }, { key: "L", count: 1 }, { key: "V", count: 2 }, { key: "G", count: 0.5 }],
  snack: [{ key: "P", count: 1.5 }, { key: "C", count: 1.5 }, { key: "V", count: 1, label: "Fruta" }, { key: "G", count: 0.5 }],
  dinner: [{ key: "P", count: 2 }, { key: "C", count: 2 }, { key: "L", count: 1 }, { key: "V", count: 2 }, { key: "G", count: 0.5 }]
};

export const READY_MEALS = {
  breakfast: [
    { id: "cafe-a", name: "Ovos + whey + fruta", items: ["3 ovos (150 g)", "Whey 30 g", "Pão francês 50 g", "Mamão 200 g"] },
    { id: "cafe-b", name: "Overnight oats / mingau", items: ["Aveia 40 g", "Whey 30 g", "Iogurte 170 g", "Leite 100 ml", "Banana 100 g"] },
    { id: "cafe-c", name: "Cuscuz proteico", items: ["Cuscuz 160 g", "2 ovos", "Frango 80 g", "Banana 100 g"] },
    { id: "cafe-d", name: "Crepioca + fruta", items: ["2 ovos", "Tapioca 40 g", "Frango 80 g", "Iogurte 170 g", "Morango 150 g"] }
  ],
  lunch: [
    { id: "almoco-a", name: "Clássico brasileiro", items: ["Frango 140 g", "Arroz 160 g", "Feijão 100 g", "Legumes 180 g", "Azeite 8 g"] },
    { id: "almoco-b", name: "Peixe + batata", items: ["Tilápia 175 g", "Batata 230 g", "Lentilha 100 g", "Legumes 180 g", "Azeite 8 g"] },
    { id: "almoco-c", name: "Frango xadrez", items: ["Frango 150 g", "Arroz 170 g", "Feijão 100 g", "Legumes 200 g", "Shoyu 15 g"] },
    { id: "almoco-d", name: "Chili sem laticínios", items: ["Carne bovina 140 g", "Arroz 145 g", "Feijão 110 g", "Tomate/pimentão 180 g", "Azeite 5 g"] }
  ],
  snack: [
    { id: "lanche-a", name: "Sanduíche de patê", items: ["Frango 100 g", "Pão francês 75 g", "Iogurte 50 g", "Cenoura/cebola 70 g", "Banana 100 g"] },
    { id: "lanche-b", name: "Panqueca proteica", items: ["2 ovos", "Whey 30 g", "Aveia 30 g", "Banana 100 g", "Iogurte 100 g"] },
    { id: "lanche-c", name: "Creme de whey", items: ["Iogurte 170 g", "Whey 30 g", "Aveia 40 g", "Morango 200 g", "Pasta de amendoim 15 g"] },
    { id: "lanche-d", name: "Vitamina + sanduíche", items: ["Leite 250 ml", "Whey 30 g", "Banana 100 g", "Pão francês 50 g", "1 ovo"] }
  ],
  dinner: [
    { id: "jantar-a", name: "Carne sem laticínios", items: ["Carne bovina 140 g", "Arroz 145 g", "Feijão 110 g", "Legumes 180 g", "Azeite 8 g"] },
    { id: "jantar-b", name: "Curry de frango", items: ["Frango 140 g", "Arroz 140 g", "Lentilha 100 g", "Legumes 180 g", "Leite de coco 30 g (opcional)"] },
    { id: "jantar-c", name: "Peixe + arroz e feijão", items: ["Tilápia 175 g", "Arroz 150 g", "Feijão 100 g", "Legumes 180 g", "Azeite 8 g"] },
    { id: "jantar-d", name: "Frango + batata", items: ["Frango 150 g", "Batata 230 g", "Feijão 100 g", "Legumes 180 g", "Azeite 8 g"] }
  ]
};

export const RECIPES = [
  { id: "frango-arroz-feijao", meals: ["lunch", "dinner"], name: "Frango + arroz + feijão", kcal: "650-700", protein: "~55", icon: "🍲", ingredients: ["Peito de frango: 180 g cru / 135-145 g pronto", "Arroz: 50 g seco / 145-160 g cozido", "Feijão: 40 g seco / 95-110 g cozido", "Brócolis + cenoura: 220 g cru / 170-190 g pronto", "Azeite: 5 g"], prep: "Doure o frango com alho e páprica. Cozinhe arroz e feijão sem excesso de óleo. Faça os legumes no vapor ou salteados." },
  { id: "frango-xadrez", meals: ["lunch", "dinner"], name: "Frango xadrez", kcal: "600-650", protein: "~50", icon: "🥘", ingredients: ["Peito de frango: 180 g cru / 135-145 g pronto", "Arroz: 55 g seco / 160-175 g cozido", "Pimentão + cebola + cenoura: 220 g", "Shoyu: 15 g", "Amido: 5 g"], prep: "Doure o frango e junte os legumes. Finalize com shoyu, água e amido. Sirva com arroz." },
  { id: "curry-frango", meals: ["lunch", "dinner"], name: "Curry de frango com lentilha", kcal: "650-720", protein: "~55", icon: "🍛", ingredients: ["Frango: 180 g cru / 135-145 g pronto", "Arroz: 45 g seco / 130-145 g cozido", "Lentilha: 40 g seca / 95-110 g cozida", "Tomate + cebola + cenoura: 200 g", "Leite de coco: 30 g (opcional)"], prep: "Refogue o frango, curry, cúrcuma e legumes. Junte a lentilha e um pouco de água; finalize com leite de coco, se usar." },
  { id: "chili", meals: ["lunch", "dinner"], name: "Chili de carne e feijão", kcal: "~700", protein: "~50", icon: "🌶", ingredients: ["Patinho/acém moído: 180 g cru / 130-140 g pronto", "Feijão: 45 g seco / 105-120 g cozido", "Arroz: 45 g seco / 130-145 g cozido", "Tomate + cebola + pimentão: 220 g", "Azeite: 5 g"], prep: "Doure a carne, junte cominho, páprica, tomate e feijão. Deixe reduzir e sirva com arroz. Não use queijo, creme ou leite." },
  { id: "tilapia-batata", meals: ["lunch", "dinner"], name: "Tilápia assada com batata", kcal: "600-650", protein: "45-50", icon: "🐟", ingredients: ["Tilápia: 220 g crua / 165-175 g pronta", "Batata inglesa: 250 g crua / 220-230 g cozida", "Legumes: 220 g", "Azeite: 8 g", "Limão, alho e ervas a gosto"], prep: "Asse a batata parcialmente; junte a tilápia temperada e os legumes até o peixe ficar pronto." },
  { id: "carne-abobora", meals: ["lunch", "dinner"], name: "Carne moída com abóbora", kcal: "650-700", protein: "45-50", icon: "🎃", ingredients: ["Carne bovina magra: 180 g crua / 130-140 g pronta", "Arroz: 50 g seco / 145-160 g cozido", "Abóbora: 250 g crua / 200-220 g pronta", "Feijão: 35 g seco / 85-95 g cozido", "Azeite: 5 g"], prep: "Doure a carne; junte alho, cebola e abóbora em cubos. Cozinhe até formar molho espesso. Sem leite ou queijo." },
  { id: "overnight", meals: ["breakfast", "snack"], name: "Overnight oats com whey", kcal: "500-550", protein: "~40", icon: "🥣", ingredients: ["Aveia: 40 g", "Whey: 30 g", "Iogurte natural: 170 g", "Leite: 100 ml", "Banana: 100 g"], prep: "Misture tudo e deixe na geladeira por 6-12 horas." },
  { id: "crepioca", meals: ["breakfast", "snack"], name: "Crepioca de frango", kcal: "430-480", protein: "~35", icon: "🫓", ingredients: ["Ovos: 2 unidades (~100 g)", "Goma de tapioca: 40 g", "Frango: 100 g cru / 75-80 g pronto", "Tomate + cebola: 80 g"], prep: "Misture ovos e tapioca, grelhe e recheie com frango temperado e legumes." },
  { id: "panqueca", meals: ["breakfast", "snack"], name: "Panqueca de banana + whey", kcal: "480-520", protein: "38-42", icon: "🥞", ingredients: ["Banana: 100 g", "Ovos: 2 unidades (~100 g)", "Whey: 30 g", "Aveia: 30 g"], prep: "Amasse a banana, misture os demais ingredientes e grelhe em fogo baixo." },
  { id: "sanduiche-pate", meals: ["breakfast", "snack"], name: "Sanduíche de patê de frango", kcal: "400-450", protein: "~35", icon: "🥪", ingredients: ["Frango: 130 g cru / 95-100 g pronto", "Pão francês: 50 g", "Iogurte natural: 50 g", "Cenoura + cebola: 70 g", "Mostarda e limão a gosto"], prep: "Misture frango desfiado, iogurte, cenoura, limão e mostarda. Recheie o pão." }
];

export const WORKOUTS = {
  A: {
    name: "Treino A",
    exercises: [
      ["leg-press", "Leg press 45°", 2, 6, 10, 90, 5],
      ["chest-press", "Chest press / supino máquina", 2, 6, 10, 90, 5],
      ["puxada-alta", "Puxada alta na frente", 2, 6, 10, 90, 5],
      ["flexora", "Mesa ou cadeira flexora", 2, 8, 12, 75, 5],
      ["remada-baixa", "Remada baixa sentada", 2, 8, 12, 90, 5],
      ["elevacao-lateral", "Elevação lateral", 2, 10, 15, 60, 1]
    ]
  },
  B: {
    name: "Treino B",
    exercises: [
      ["hack", "Agachamento hack*", 2, 6, 10, 90, 5],
      ["supino-inclinado", "Supino inclinado máquina", 2, 6, 10, 90, 5],
      ["remada-apoiada", "Remada máquina apoiada", 2, 6, 10, 90, 5],
      ["hip-thrust", "Hip thrust máquina", 2, 8, 12, 90, 5],
      ["desenvolvimento", "Desenvolvimento máquina", 2, 8, 12, 75, 5],
      ["puxada-neutra", "Puxada alta pegada neutra", 2, 8, 12, 90, 5]
    ]
  }
};

export function exerciseFromRow(row) {
  const [id, name, sets, minReps, maxReps, rest, increment] = row;
  return { id, name, sets, minReps, maxReps, rest, increment };
}
