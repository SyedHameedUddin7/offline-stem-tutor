import type { SubjectId } from "../types";

/**
 * French curriculum strings.
 *
 * Kept as a lookup keyed by the English structure's ids rather than as a
 * parallel SUBJECTS array. A second array would be free to drift — a chapter
 * added in one language and forgotten in the other — and the drift would show
 * up as a missing chapter for French students only, which is exactly the kind
 * of bug nobody notices until a pod reports it. Here a missing key falls back
 * to English, visibly, and the ids cannot disagree.
 *
 * `focus` is translated along with everything else because it goes into the
 * system prompt: the model is being told what to teach, and it answers in the
 * language it is addressed in.
 */

interface SubjectFr {
  name: string;
  tagline: string;
  systemPrompt: string;
}

interface ChapterFr {
  name: string;
  blurb: string;
  focus: string;
  sampleProblems: string[];
}

export const SUBJECT_FR: Record<SubjectId, SubjectFr> = {
  mathematics: {
    name: "Mathématiques",
    tagline: "Avancer étape par étape, visiblement.",
    systemPrompt:
      "Tu es un tuteur de mathématiques patient et encourageant pour un élève du secondaire dont la connexion internet est peu fiable et qui travaille sur un téléphone partagé d'entrée de gamme. " +
      "Présente toujours ton raisonnement en étapes numérotées courtes. Une seule idée par étape. Ne donne jamais la réponse sans les étapes. " +
      "Suppose qu'il n'y a ni calculatrice ni outil graphique. Garde la réponse assez courte pour être lue sur un petit écran. " +
      "Réponds entièrement en français.",
  },
  physics: {
    name: "Physique",
    tagline: "Comprendre avant de calculer.",
    systemPrompt:
      "Tu es un tuteur de physique pour un élève du secondaire. Construis d'abord l'intuition, puis les formules : explique le « pourquoi » en langage simple avant de montrer le calcul, si un calcul est nécessaire. " +
      "Utilise des exemples quotidiens et peu coûteux (une pierre qu'on lâche, un vélo, une marmite, une lampe torche) plutôt que du matériel de laboratoire auquel l'élève n'a pas accès. " +
      "Garde la réponse assez courte pour être lue sur un petit écran. Réponds entièrement en français.",
  },
  biology: {
    name: "Biologie",
    tagline: "Le vivant, expliqué simplement.",
    systemPrompt:
      "Tu es un tuteur de biologie pour un élève du secondaire. Explique les processus comme une suite de causes et d'effets plutôt que comme des listes à mémoriser, et définis chaque terme technique la première fois que tu l'emploies. " +
      "Utilise des plantes, des aliments et des animaux disponibles localement comme exemples. Garde la réponse assez courte pour un petit écran. Réponds entièrement en français.",
  },
  "mental-ability": {
    name: "Aptitude logique",
    tagline: "Une seule réponse défendable — retrouvée, pas inventée.",
    systemPrompt:
      "Tu es un entraîneur au raisonnement pour un élève du secondaire qui prépare des tests d'aptitude. " +
      "On t'a fourni un ou plusieurs EXEMPLES RÉSOLUS tirés d'une banque vérifiée par des enseignants. " +
      "Tu dois résoudre la question de l'élève en appliquant la méthode montrée dans ces exemples. " +
      "N'invente pas une autre technique et ne devine pas. Si les exemples ne couvrent pas la question de l'élève, " +
      "dis clairement que tu n'as pas de méthode vérifiée et qu'un enseignant devrait l'examiner. " +
      "Indique la règle que tu appliques, puis les étapes, puis la réponse. Réponds entièrement en français.",
  },
};

export const CHAPTER_FR: Record<string, ChapterFr> = {
  /* ---------------- Mathématiques ---------------- */
  "math-number-systems": {
    name: "Nombres et opérations",
    blurb: "Entiers, fractions, décimaux, diviseurs et multiples.",
    focus:
      "Concentre-toi sur les systèmes de numération : les entiers et leurs opérations, les fractions et les décimaux, le PGCD et le PPCM, la décomposition en facteurs premiers et la priorité des opérations. Travaille par petites étapes concrètes avec des quantités familières (argent, distance, parts de nourriture) plutôt qu'avec des exemples abstraits.",
    sampleProblems: [
      "Trouve le PGCD et le PPCM de 24 et 36.",
      "Pourquoi diviser par une fraction revient-il à multiplier par son inverse ?",
      "Simplifie : 7 + 3 x (8 - 5) ÷ 3",
    ],
  },
  "math-algebraic-expressions": {
    name: "Expressions et identités",
    blurb: "Termes, termes semblables, développement et identités.",
    focus:
      "Concentre-toi sur les expressions algébriques : variables, coefficients, termes semblables et non semblables, addition et multiplication d'expressions, et les identités remarquables comme (a+b)² et a² - b². Développe toujours terme par terme avant de simplifier.",
    sampleProblems: [
      "Développe (x + 5)(x - 3) étape par étape.",
      "Quelle est la différence entre une expression et une équation ?",
      "Utilise une identité pour calculer 98 x 102 sans multiplication longue.",
    ],
  },
  "math-linear-equations": {
    name: "Équations du premier degré",
    blurb: "Isoler l'inconnue, et traduire un énoncé en équation.",
    focus:
      "Concentre-toi sur les équations du premier degré à une inconnue : isoler l'inconnue, effectuer la même opération des deux côtés, vérifier le résultat par substitution, et traduire un problème en équation. Nomme explicitement l'inconnue avant d'écrire l'équation.",
    sampleProblems: [
      "Résous : 3x + 7 = 22",
      "La longueur d'un rectangle est le double de sa largeur et son périmètre vaut 30 cm. Trouve la largeur.",
      "Résous : (2x - 1)/3 = (x + 4)/2",
    ],
  },
  "math-ratio-percentage": {
    name: "Rapports, proportions et pourcentages",
    blurb: "Comparer, mettre à l'échelle, bénéfice, perte et intérêts.",
    focus:
      "Concentre-toi sur les rapports, les proportions et les pourcentages et leurs usages quotidiens : règle de trois, proportionnalité directe et inverse, augmentation et diminution en pourcentage, bénéfice et perte, intérêts simples. Utilise des exemples de marché et de ménage que l'élève reconnaîtra.",
    sampleProblems: [
      "Si 5 stylos coûtent 120 francs, combien coûtent 8 stylos ?",
      "Une chemise achetée à 800 est revendue à 920. Quel est le pourcentage de bénéfice ?",
      "Partage 3500 entre deux personnes dans le rapport 3:4.",
    ],
  },
  "math-geometry-triangles": {
    name: "Géométrie : droites, angles et triangles",
    blurb: "Règles sur les angles, propriétés des triangles, Pythagore.",
    focus:
      "Concentre-toi sur la géométrie plane : types d'angles, angles sur une droite et autour d'un point, droites parallèles coupées par une sécante, somme des angles d'un triangle, cas d'égalité des triangles et théorème de Pythagore. Décris d'abord la figure avec des mots, car l'élève n'a peut-être aucun schéma sous les yeux.",
    sampleProblems: [
      "Deux angles d'un triangle mesurent 48° et 67°. Trouve le troisième.",
      "Une échelle de 5 m s'appuie contre un mur, son pied à 3 m du mur. À quelle hauteur arrive-t-elle ?",
      "Que signifie dire que deux triangles sont isométriques ?",
    ],
  },
  "math-mensuration": {
    name: "Aires, surfaces et volumes",
    blurb: "Périmètre, aire, et volume des solides courants.",
    focus:
      "Concentre-toi sur la mesure : périmètre et aire du rectangle, du triangle, du parallélogramme et du cercle ; aire latérale et volume du cube, du pavé droit et du cylindre. Énonce toujours la formule, remplace avec les unités, puis calcule — et garde les unités visibles à chaque étape.",
    sampleProblems: [
      "Calcule l'aire d'un cercle de rayon 7 cm (prends 22/7).",
      "Un réservoir mesure 2 m x 1,5 m x 1 m. Combien de litres contient-il ?",
      "Pourquoi l'aire d'un triangle est-elle la moitié de celle d'un rectangle de même base et même hauteur ?",
    ],
  },
  "math-data-probability": {
    name: "Données et probabilités",
    blurb: "Moyenne, médiane, mode, et chance d'un événement.",
    focus:
      "Concentre-toi sur le traitement des données : organiser des données, moyenne, médiane et mode, lecture de diagrammes en bâtons et circulaires, et probabilité d'un événement simple. Explique quand la moyenne est trompeuse et quand la médiane est plus juste.",
    sampleProblems: [
      "Trouve la moyenne, la médiane et le mode de : 4, 7, 7, 9, 13",
      "Un sac contient 3 billes rouges et 5 bleues. Quelle est la probabilité de tirer une rouge ?",
      "Quand la médiane est-elle un meilleur résumé que la moyenne ?",
    ],
  },

  /* ---------------- Physique ---------------- */
  "phys-motion": {
    name: "Mouvement : distance, vitesse",
    blurb: "Décrire un déplacement et lire un graphique.",
    focus:
      "Concentre-toi sur le mouvement : distance et déplacement, vitesse et vitesse vectorielle, accélération, équations du mouvement uniformément accéléré, et graphiques distance-temps et vitesse-temps. Construis l'intuition en langage simple avant toute formule.",
    sampleProblems: [
      "Quelle est la différence entre la vitesse et la vitesse vectorielle ?",
      "Une voiture passe de 0 à 20 m/s en 5 s. Trouve son accélération.",
      "Que signifie une droite horizontale sur un graphique distance-temps ?",
    ],
  },
  "phys-force-laws": {
    name: "Forces, frottement et lois de Newton",
    blurb: "Pourquoi les objets démarrent, s'arrêtent et résistent.",
    focus:
      "Concentre-toi sur les forces : forces équilibrées et non équilibrées, inertie, les trois lois de Newton, le frottement et ses effets utiles et nuisibles, et la quantité de mouvement. Utilise des vélos, des charrettes et la marche dans le sable comme exemples plutôt que du matériel de laboratoire.",
    sampleProblems: [
      "Pourquoi tombe-t-on vers l'avant quand un bus s'arrête brusquement ?",
      "Une force de 12 N agit sur une caisse de 3 kg. Trouve l'accélération.",
      "Le frottement est-il toujours une nuisance ? Donne un exemple où il aide.",
    ],
  },
  "phys-gravitation": {
    name: "Gravitation et chute libre",
    blurb: "Poids, masse, chute des corps, et la Lune.",
    focus:
      "Concentre-toi sur la gravitation : différence entre masse et poids, accélération de la pesanteur, chute libre, et pourquoi un corps en orbite ne tombe pas. Prends g = 10 m/s² sauf indication contraire de l'élève, et dis-le quand tu le fais.",
    sampleProblems: [
      "Pourquoi un objet lourd ne tombe-t-il pas plus vite qu'un objet léger ?",
      "Une balle est lancée vers le haut à 20 m/s. Combien de temps avant qu'elle retombe ?",
      "Quelle est la différence entre la masse et le poids ?",
    ],
  },
  "phys-work-energy": {
    name: "Travail, énergie et puissance",
    blurb: "Ce que « travail » signifie en physique.",
    focus:
      "Concentre-toi sur le travail, l'énergie et la puissance : la définition scientifique du travail, énergie cinétique et potentielle, conservation de l'énergie, transformations d'énergie, et la puissance comme travail par unité de temps. Signale les endroits où le langage courant et le langage de la physique se contredisent.",
    sampleProblems: [
      "Pourquoi ne fournit-on aucun travail quand on tient un sac lourd immobile ?",
      "Calcule l'énergie cinétique d'une balle de 2 kg allant à 6 m/s.",
      "Retrace les transformations d'énergie quand une pierre tombe d'un toit.",
    ],
  },
  "phys-heat": {
    name: "Chaleur et température",
    blurb: "Conduction, convection, rayonnement, changements d'état.",
    focus:
      "Concentre-toi sur la physique thermique : différence entre chaleur et température, conduction, convection et rayonnement, dilatation, et changements d'état y compris la chaleur latente. Utilise des marmites, des tôles de toiture et le séchage du linge comme exemples.",
    sampleProblems: [
      "Quelle est la différence entre la chaleur et la température ?",
      "Pourquoi une cuillère en métal paraît-elle plus froide qu'une cuillère en bois à la même température ?",
      "Pourquoi l'eau reste-t-elle à 100 °C pendant qu'elle bout ?",
    ],
  },
  "phys-light": {
    name: "Lumière : réflexion et réfraction",
    blurb: "Miroirs, lentilles, rayons déviés et l'œil.",
    focus:
      "Concentre-toi sur la lumière : propagation rectiligne, lois de la réflexion, miroirs plans et courbes, réfraction et sa cause, lentilles et formation des images, et dispersion. Décris soigneusement le trajet des rayons avec des mots, car l'élève n'a peut-être pas de schéma.",
    sampleProblems: [
      "Pourquoi une paille semble-t-elle brisée dans un verre d'eau ?",
      "Énonce les lois de la réflexion.",
      "Quel type d'image un miroir plan forme-t-il ?",
    ],
  },
  "phys-electricity": {
    name: "Électricité et circuits simples",
    blurb: "Courant, tension, résistance et loi d'Ohm.",
    focus:
      "Concentre-toi sur l'électricité : charge et courant, différence de potentiel, résistance, loi d'Ohm, circuits en série et en parallèle, puissance électrique et sécurité. Rattache tout à une lampe torche, un chargeur de téléphone ou une ampoule domestique.",
    sampleProblems: [
      "Énonce la loi d'Ohm et explique ce que signifie chaque symbole.",
      "Une pile de 6 V fait passer 0,5 A dans une ampoule. Trouve sa résistance.",
      "Pourquoi les lampes d'une maison sont-elles branchées en parallèle et non en série ?",
    ],
  },

  /* ---------------- Biologie ---------------- */
  "bio-cell": {
    name: "La cellule : structure et fonction",
    blurb: "La plus petite unité du vivant et le rôle de ses parties.",
    focus:
      "Concentre-toi sur la biologie cellulaire : la cellule comme unité de base du vivant, cellules végétales et animales, rôle du noyau, du cytoplasme, de la membrane, de la paroi, du chloroplaste, des mitochondries et de la vacuole, et la division cellulaire. Compare les organites aux pièces d'une maison ou d'un atelier.",
    sampleProblems: [
      "Quelle est la différence entre une cellule végétale et une cellule animale ?",
      "Pourquoi appelle-t-on la mitochondrie la centrale énergétique de la cellule ?",
      "Que fait réellement la membrane cellulaire ?",
    ],
  },
  "bio-tissues-systems": {
    name: "Tissus, organes et systèmes",
    blurb: "Comment les cellules s'organisent en organes.",
    focus:
      "Concentre-toi sur les niveaux d'organisation : types de tissus végétaux et animaux, formation des organes puis des systèmes, et les principaux systèmes du corps humain et leur rôle. Insiste sur la hiérarchie : cellule, tissu, organe, système, organisme.",
    sampleProblems: [
      "Explique les niveaux d'organisation de la cellule à l'organisme.",
      "Quel est le rôle du xylème et du phloème dans une plante ?",
      "Nomme quatre types de tissus animaux et une fonction de chacun.",
    ],
  },
  "bio-photosynthesis": {
    name: "Nutrition des plantes et photosynthèse",
    blurb: "Comment les plantes fabriquent leur nourriture.",
    focus:
      "Concentre-toi sur la nutrition des plantes : la photosynthèse, ses matières premières et ses produits, le rôle de la chlorophylle et de la lumière, la structure d'une feuille, les stomates et les échanges gazeux, et la transpiration. Donne l'équation en mots avant toute équation chimique.",
    sampleProblems: [
      "Écris l'équation en mots de la photosynthèse et explique chaque partie.",
      "Pourquoi la plupart des feuilles sont-elles larges et plates ?",
      "Qu'arrive-t-il à une plante laissée une semaine dans le noir ?",
    ],
  },
  "bio-digestion": {
    name: "Digestion et nutrition humaines",
    blurb: "Groupes d'aliments, tube digestif, carences.",
    focus:
      "Concentre-toi sur la nutrition humaine : glucides, protéines, lipides, vitamines, minéraux, eau et fibres ; le trajet des aliments dans le tube digestif ; le rôle des enzymes, de la bile et des villosités ; et les maladies de carence courantes. Utilise des aliments disponibles localement.",
    sampleProblems: [
      "Retrace le trajet d'un morceau de pain dans le système digestif.",
      "Pourquoi les fibres sont-elles importantes si elles ne sont pas digérées ?",
      "Qu'est-ce qui cause l'anémie et comment l'alimentation peut-elle la prévenir ?",
    ],
  },
  "bio-respiration-circulation": {
    name: "Respiration, sang et circulation",
    blurb: "Faire entrer l'oxygène et le distribuer.",
    focus:
      "Concentre-toi sur la respiration et le transport : différence entre ventilation et respiration cellulaire, respiration aérobie et anaérobie, structure du cœur, composants du sang, artères et veines, et la double circulation. Distingue explicitement « respirer » de « respiration cellulaire » — c'est la confusion la plus fréquente ici.",
    sampleProblems: [
      "Quelle est la différence entre la ventilation et la respiration cellulaire ?",
      "Pourquoi les muscles font-ils mal après une course très intense ?",
      "Pourquoi les artères ont-elles des parois plus épaisses que les veines ?",
    ],
  },
  "bio-reproduction-heredity": {
    name: "Reproduction et hérédité",
    blurb: "Comment la vie continue et les caractères se transmettent.",
    focus:
      "Concentre-toi sur la reproduction et l'hérédité : reproduction asexuée et sexuée, reproduction des plantes à fleurs, appareils reproducteurs humains à un niveau adapté à l'âge, chromosomes et gènes, caractères dominants et récessifs, et croisements mendéliens simples. Garde un ton factuel et respectueux.",
    sampleProblems: [
      "Quelle est la différence entre la reproduction asexuée et sexuée ?",
      "Explique la pollinisation et la fécondation chez une fleur.",
      "Si les deux parents portent un caractère récessif, l'enfant peut-il le présenter ?",
    ],
  },
  "bio-health-disease": {
    name: "Santé, maladies et microbes",
    blurb: "Germes, immunité, vaccins et prévention.",
    focus:
      "Concentre-toi sur la santé et les micro-organismes : microbes utiles et nuisibles, maladies transmissibles et non transmissibles, modes de transmission, immunité et vaccination, hygiène et prévention. Utilise le paludisme, le choléra et la tuberculose comme exemples travaillés quand c'est pertinent.",
    sampleProblems: [
      "Comment un moustique transmet-il le paludisme ?",
      "Quelle est la différence entre un virus et une bactérie ?",
      "Comment un vaccin protège-t-il sans rendre malade ?",
    ],
  },

  /* ---------------- Aptitude logique ---------------- */
  "ma-number-series": {
    name: "Suites numériques",
    blurb: "Trouver la règle, puis le terme manquant.",
    focus:
      "Concentre-toi sur les suites numériques : différences, différences secondes, rapports, carrés et cubes, nombres premiers, et suites alternées. Énonce toujours la règle trouvée avant de donner le nombre manquant.",
    sampleProblems: ["2, 6, 12, 20, 30, ?", "120, 99, 80, 63, 48, ?", "5, 10, 20, 40, ?"],
  },
  "ma-coding-decoding": {
    name: "Codage et décodage",
    blurb: "Décalages de lettres, inversions, arithmétique de position.",
    focus:
      "Concentre-toi sur le codage-décodage : décalages fixes de lettres, codes par inversion, arithmétique sur la position des lettres, et substitution. Montre la correspondance lettre par lettre en entier au lieu d'affirmer la réponse.",
    sampleProblems: [
      "Si CHAT est codé DIBU, comment code-t-on CHIEN ?",
      "Si MANGUE s'écrit OCPIWG, comment écrit-on POMME ?",
      "Si MAISON s'écrit NOSIAM, comment écrit-on ÉCOLE ?",
    ],
  },
  "ma-blood-relations": {
    name: "Liens de parenté",
    blurb: "Démêler qui est quoi par rapport à qui.",
    focus:
      "Concentre-toi sur les liens de parenté : construis l'arbre familial une affirmation à la fois, note la génération de chaque personne, et ne lis le lien demandé qu'ensuite. Méfie-toi des formulations autoréférentielles comme « le fils de mon père ».",
    sampleProblems: [
      "A est la sœur de B. C est la mère de B. D est le père de C. Quel est le lien entre A et D ?",
      "Devant une photo, un homme dit : « Je n'ai ni frère ni sœur, mais le père de cet homme est le fils de mon père. » Qui est sur la photo ?",
      "P est le père de Q. Q est la sœur de R. R est le fils de S. Quel est le lien entre S et P ?",
    ],
  },
  "ma-direction-sense": {
    name: "Sens de l'orientation",
    blurb: "Suivre les tournants, puis distance et direction.",
    focus:
      "Concentre-toi sur l'orientation : suis la direction dans laquelle le marcheur fait face après chaque tournant, tiens un total nord-sud et est-ouest, et utilise Pythagore pour la distance en ligne droite. Indique la direction après chaque étape.",
    sampleProblems: [
      "Un homme marche 5 km vers le nord, tourne à droite et marche 3 km, puis tourne à droite et marche 5 km. Où est-il ?",
      "A marche 4 km vers l'est, puis 3 km vers le nord. À quelle distance du départ est-il ?",
      "Si tu fais face à l'est et tournes de 135° dans le sens des aiguilles, quelle direction regardes-tu ?",
    ],
  },
  "ma-analogies": {
    name: "Analogies et intrus",
    blurb: "Nommer la relation, puis l'appliquer ou la rompre.",
    focus:
      "Concentre-toi sur les analogies et les classements : énonce la relation du premier couple avec des mots avant de compléter le second, et pour l'intrus, énonce la propriété commune à la majorité avant de nommer l'exception.",
    sampleProblems: [
      "Médecin : Hôpital :: Enseignant : ?",
      "Intrus : Triangle, Carré, Cercle, Rectangle",
      "Intrus : 3, 5, 11, 14, 17",
    ],
  },
  "ma-syllogisms": {
    name: "Syllogismes et énoncés logiques",
    blurb: "Distinguer ce qui suit de ce qui semble suivre.",
    focus:
      "Concentre-toi sur les syllogismes : traite les énoncés donnés comme vrais même s'ils sont étranges, teste chaque conclusion en te demandant si elle suit nécessairement dans tous les cas, et réponds « ne suit pas » dès qu'un contre-exemple existe. Ne te fonde jamais sur la vraisemblance du monde réel.",
    sampleProblems: [
      "Toutes les roses sont des fleurs. Certaines fleurs se fanent vite. « Certaines roses se fanent vite » suit-il ?",
      "Certains livres sont des stylos. Tous les stylos sont rouges. « Certains livres sont rouges » suit-il ?",
      "Aucun élève n'est paresseux. Certains paresseux sont riches. « Certains riches ne sont pas élèves » suit-il ?",
    ],
  },
  "ma-arrangements": {
    name: "Rangées et placements",
    blurb: "Placer des personnes en ligne ou en cercle.",
    focus:
      "Concentre-toi sur les problèmes de placement : fixe d'abord l'indice le plus contraignant, écris les positions comme une ligne numérotée ou un cercle étiqueté, puis applique les autres indices un par un. Pour une rangée, rappelle-toi que position depuis la droite = total − position depuis la gauche + 1.",
    sampleProblems: [
      "Dans une rangée de 40 élèves, Rahul est 12e depuis la gauche. Quelle est sa position depuis la droite ?",
      "Cinq amis A, B, C, D, E sont assis en rangée. A est à gauche de B mais à droite de C. D est à droite de B. E est à l'extrême droite. Qui est au milieu ?",
      "P, Q, R, S sont assis autour d'une table carrée, face au centre. P est en face de R et Q est immédiatement à gauche de P. Où est S ?",
    ],
  },
};
