import { cards, mcqs, shorts } from "./helpers";

/**
 * Biology practice and flashcards, chapter by chapter.
 *
 * Kept to facts that are stable across lower-secondary syllabi and
 * consistent with the chapter notes (src/data/referenceNotes/biology.ts),
 * which a student sees alongside them. Where a fact has a well-known
 * misconception, the explanation names it.
 */

export const BIOLOGY_FLASHCARDS = [
  ...cards("bio-cell", [
    ["Nucleus", "Contains the DNA and controls the cell's activities."],
    ["Cell membrane", "Surrounds every cell and controls what enters and leaves (selectively permeable)."],
    ["Mitochondria", "Release energy from glucose by aerobic respiration."],
    ["Ribosomes", "Make proteins."],
    ["Chloroplasts", "Carry out photosynthesis; found in plant cells, not animal cells."],
    ["Cell wall", "A rigid layer outside the membrane, made of cellulose in plants. Gives support. Animal cells have none."],
    ["Diffusion", "Net movement of particles from a higher to a lower concentration."],
    ["Osmosis", "Movement of water across a partially permeable membrane from a dilute solution to a more concentrated one."],
  ]),
  ...cards("bio-tissues-systems", [
    ["Tissue", "A group of similar cells working together to do one job."],
    ["Organ", "Several different tissues working together, e.g. the stomach or a leaf."],
    ["Organ system", "Several organs with a shared function, e.g. the digestive system."],
    ["Xylem", "Carries water and minerals up from the roots, through dead hollow cells."],
    ["Phloem", "Carries dissolved sugars from the leaves to the rest of the plant, through living cells."],
    ["Meristem", "Plant tissue at root and shoot tips whose cells keep dividing, so the plant grows there."],
    ["Epithelial tissue", "Covers and lines surfaces, such as the skin and the gut lining."],
    ["Neuron", "A nerve cell: carries electrical impulses."],
  ]),
  ...cards("bio-photosynthesis", [
    ["Photosynthesis (word equation)", "carbon dioxide + water → glucose + oxygen, using light energy absorbed by chlorophyll."],
    ["Photosynthesis (balanced)", "6CO₂ + 6H₂O → C₆H₁₂O₆ + 6O₂"],
    ["Chlorophyll", "Green pigment in chloroplasts that absorbs light energy."],
    ["Stomata", "Pores, mostly on the underside of leaves, that let CO₂ in and water vapour out. Opened and closed by guard cells."],
    ["Iodine test", "Iodine turns from orange-brown to blue-black when starch is present."],
    ["Limiting factors", "Light intensity, carbon dioxide concentration and temperature can each limit the rate of photosynthesis."],
    ["Autotroph", "An organism that makes its own food, e.g. a green plant."],
    ["Heterotroph", "An organism that must eat other organisms for food, e.g. an animal or fungus."],
  ]),
  ...cards("bio-digestion", [
    ["Amylase", "Enzyme that breaks starch into sugars. Made in the salivary glands and pancreas."],
    ["Protease (e.g. pepsin)", "Enzyme that breaks proteins into amino acids. Pepsin works in the acid of the stomach."],
    ["Lipase", "Enzyme that breaks fats into fatty acids and glycerol."],
    ["Bile", "Made in the liver, stored in the gall bladder. Emulsifies fat and neutralises stomach acid. Not an enzyme."],
    ["Villi", "Finger-like folds lining the small intestine that give a large surface area for absorbing digested food."],
    ["Large intestine", "Absorbs water from undigested material."],
    ["Peristalsis", "Waves of muscle contraction that push food along the gut."],
    ["Fibre (roughage)", "Not digested; adds bulk so gut muscles can push food along and prevents constipation."],
  ]),
  ...cards("bio-respiration-circulation", [
    ["Aerobic respiration", "glucose + oxygen → carbon dioxide + water + energy. Happens in mitochondria."],
    ["Anaerobic respiration (muscle)", "glucose → lactic acid + a little energy."],
    ["Anaerobic respiration (yeast)", "glucose → ethanol + carbon dioxide + a little energy (fermentation)."],
    ["Alveoli", "Tiny air sacs in the lungs where oxygen enters the blood and carbon dioxide leaves it."],
    ["Arteries", "Carry blood away from the heart at high pressure; thick muscular walls."],
    ["Veins", "Carry blood back to the heart at low pressure; thin walls and valves."],
    ["Capillaries", "Tiny vessels with walls one cell thick, where substances pass between blood and tissues."],
    ["Red blood cells", "Carry oxygen using haemoglobin; in mammals they have no nucleus."],
  ]),
  ...cards("bio-reproduction-heredity", [
    ["Gamete", "A sex cell (sperm, egg, pollen nucleus, ovule) with half the normal number of chromosomes."],
    ["Zygote", "The single cell formed when two gametes fuse at fertilisation."],
    ["Pollination", "Transfer of pollen from an anther to a stigma."],
    ["Fertilisation", "Fusion of the nuclei of a male and a female gamete."],
    ["Gene", "A section of DNA that carries the instructions for one characteristic."],
    ["Allele", "One version of a gene, e.g. the allele for brown or for blue eyes."],
    ["Human chromosomes", "46 in body cells (23 pairs); 23 in each gamete."],
    ["Sex determination", "XX is female, XY is male; the father's sperm carries either X or Y."],
  ]),
  ...cards("bio-health-disease", [
    ["Pathogen", "A microorganism that causes disease: some bacteria, viruses, fungi and protozoa."],
    ["Antibiotic", "A drug that kills bacteria. It has no effect on viruses."],
    ["Vaccine", "A dead, weakened or partial pathogen that trains the immune system to recognise it, without causing the disease."],
    ["Antibody", "A protein made by white blood cells that sticks to a specific pathogen."],
    ["Vector", "An animal that carries a pathogen from one host to another, e.g. the mosquito for malaria."],
    ["Malaria", "Caused by the Plasmodium parasite, carried by female Anopheles mosquitoes."],
    ["Cholera", "Bacterial disease spread by water contaminated with sewage; causes severe diarrhoea."],
    ["Oral rehydration solution (ORS)", "Clean water with salt and sugar; replaces water and salts lost in diarrhoea."],
  ]),
];

export const BIOLOGY_QUESTIONS = [
  ...mcqs("bio-cell", [
    { q: "Which part of the cell controls its activities?", choices: ["Cell membrane", "Nucleus", "Cytoplasm", "Vacuole"], answer: "Nucleus", why: "The nucleus holds the DNA, which carries the instructions for everything the cell does." },
    { q: "Which structure is found in plant cells but NOT in animal cells?", choices: ["Cell membrane", "Mitochondria", "Cell wall", "Ribosomes"], answer: "Cell wall", why: "Plant cells have a cellulose cell wall (and chloroplasts and a large vacuole). Both cell types have a membrane, mitochondria and ribosomes." },
    { q: "Where does aerobic respiration take place?", choices: ["Nucleus", "Chloroplasts", "Mitochondria", "Cell wall"], answer: "Mitochondria", why: "Mitochondria release energy from glucose using oxygen. Chloroplasts do photosynthesis, not respiration." },
    { q: "What does the cell membrane do?", choices: ["Makes proteins", "Controls what enters and leaves the cell", "Carries out photosynthesis", "Gives the cell a rigid shape"], answer: "Controls what enters and leaves the cell", why: "The membrane is selectively permeable. The rigid support in plants comes from the cell wall, a different structure." },
    { q: "Osmosis is the movement of…", choices: ["any particles from high to low concentration", "water across a partially permeable membrane", "sugar into the leaf", "oxygen out of the nucleus"], answer: "water across a partially permeable membrane", why: "Osmosis is specifically water, moving from a dilute to a more concentrated solution across a partially permeable membrane. Any particles spreading out is diffusion." },
    { q: "Which organelle makes proteins?", choices: ["Ribosome", "Vacuole", "Chloroplast", "Cell wall"], answer: "Ribosome", why: "Ribosomes join amino acids together to build proteins." },
  ]),
  ...shorts("bio-cell", [
    { q: "Name the green structures in a leaf cell where photosynthesis happens.", answer: "chloroplasts", accept: ["chloroplast"], why: "Chloroplasts contain chlorophyll, which absorbs light energy for photosynthesis." },
  ], 6),

  ...mcqs("bio-tissues-systems", [
    { q: "Which is the correct order of organisation, smallest first?", choices: ["Organ → tissue → cell → system", "Cell → tissue → organ → organ system", "Tissue → cell → organ → system", "Cell → organ → tissue → system"], answer: "Cell → tissue → organ → organ system", why: "Similar cells form a tissue, tissues form an organ, organs form a system, and systems form the organism." },
    { q: "Which tissue carries water up a plant?", choices: ["Phloem", "Xylem", "Epidermis", "Meristem"], answer: "Xylem", why: "Xylem carries water and minerals upward from the roots. Phloem carries food made in the leaves." },
    { q: "The stomach is best described as…", choices: ["a cell", "a tissue", "an organ", "an organ system"], answer: "an organ", why: "The stomach is made of several tissues (muscular, epithelial, nervous, connective) working together, so it is an organ." },
    { q: "Which type of animal tissue carries electrical impulses?", choices: ["Epithelial", "Muscular", "Nervous", "Connective"], answer: "Nervous", why: "Nervous tissue is made of neurons, which carry impulses." },
    { q: "Blood is classed as which kind of tissue?", choices: ["Epithelial", "Connective", "Nervous", "It is an organ"], answer: "Connective", why: "Even though it is liquid, blood is a connective tissue." },
    { q: "Where in a plant are new cells made by division?", choices: ["In the meristems at root and shoot tips", "Only in the leaves", "In the xylem", "In the flowers only"], answer: "In the meristems at root and shoot tips", why: "Meristem cells keep dividing, which is why plants grow longer at their tips." },
  ]),
  ...shorts("bio-tissues-systems", [
    { q: "Which tissue carries sugars from the leaves to the rest of the plant?", answer: "phloem", why: "Phloem moves dissolved food, up or down, through living cells." },
  ], 6),

  ...mcqs("bio-photosynthesis", [
    { q: "What are the raw materials of photosynthesis?", choices: ["Glucose and oxygen", "Carbon dioxide and water", "Oxygen and water", "Starch and carbon dioxide"], answer: "Carbon dioxide and water", why: "CO₂ comes from the air through the stomata and water from the soil through the roots. Glucose and oxygen are the products." },
    { q: "Which gas is released as a by-product of photosynthesis?", choices: ["Carbon dioxide", "Nitrogen", "Oxygen", "Hydrogen"], answer: "Oxygen", why: "Oxygen is released when water is split during photosynthesis." },
    { q: "What colour does iodine turn when starch is present?", choices: ["Orange-brown", "Blue-black", "Brick red", "Purple"], answer: "Blue-black", why: "Iodine is orange-brown; it turns blue-black with starch. (Brick red is the Benedict's test for sugar; purple is the biuret test for protein.)" },
    { q: "Which pigment absorbs light for photosynthesis?", choices: ["Haemoglobin", "Chlorophyll", "Melanin", "Keratin"], answer: "Chlorophyll", why: "Chlorophyll, in the chloroplasts, absorbs light energy. Haemoglobin carries oxygen in blood." },
    { q: "Do plants respire?", choices: ["Only at night", "Only in the dark", "Yes, all the time, day and night", "No, photosynthesis replaces respiration"], answer: "Yes, all the time, day and night", why: "Plants respire constantly, like animals. In bright light photosynthesis is faster, so the net exchange is oxygen out, but both processes run." },
    { q: "Where does most of a plant's mass (its carbon) come from?", choices: ["The soil", "Carbon dioxide in the air", "Fertiliser", "Water only"], answer: "Carbon dioxide in the air", why: "The carbon in glucose and starch comes from CO₂. Soil supplies water and minerals, not the bulk of the mass." },
  ]),
  ...shorts("bio-photosynthesis", [
    { q: "What are the pores on the underside of a leaf called?", answer: "stomata", accept: ["stoma", "stomates"], why: "Stomata let CO₂ in and water vapour out; guard cells open and close them." },
  ], 6),

  ...mcqs("bio-digestion", [
    { q: "Where does the digestion of starch begin?", choices: ["Stomach", "Mouth", "Small intestine", "Large intestine"], answer: "Mouth", why: "Saliva contains amylase, which starts breaking down starch in the mouth." },
    { q: "Which enzyme breaks down protein?", choices: ["Amylase", "Lipase", "Protease", "Bile"], answer: "Protease", why: "Proteases (such as pepsin) break proteins into amino acids. Bile is not an enzyme at all." },
    { q: "What is the main job of bile?", choices: ["To digest protein", "To emulsify fats", "To absorb water", "To make starch"], answer: "To emulsify fats", why: "Bile breaks fat into small droplets, giving lipase more surface to work on. It also neutralises stomach acid." },
    { q: "Where are most digested nutrients absorbed?", choices: ["Stomach", "Small intestine", "Large intestine", "Oesophagus"], answer: "Small intestine", why: "The villi of the small intestine give a huge surface area for absorption. The large intestine mainly absorbs water." },
    { q: "Lack of vitamin C causes…", choices: ["Rickets", "Scurvy", "Anaemia", "Night blindness"], answer: "Scurvy", why: "Scurvy (bleeding gums, slow healing) comes from too little vitamin C. Rickets: vitamin D or calcium; anaemia: iron; night blindness: vitamin A." },
    { q: "Why is fibre important in the diet?", choices: ["It is digested into glucose", "It gives the gut bulk to push food along", "It builds muscle", "It carries oxygen"], answer: "It gives the gut bulk to push food along", why: "Fibre is not digested, and that is its value: it keeps food moving and prevents constipation." },
  ]),
  ...shorts("bio-digestion", [
    { q: "Which mineral is needed to prevent anaemia?", answer: "iron", why: "Iron is needed to make haemoglobin; too little causes anaemia (tiredness, pale skin)." },
  ], 6),

  ...mcqs("bio-respiration-circulation", [
    { q: "What are the products of aerobic respiration?", choices: ["Glucose and oxygen", "Carbon dioxide, water and energy", "Lactic acid only", "Oxygen and energy"], answer: "Carbon dioxide, water and energy", why: "Glucose + oxygen → carbon dioxide + water + energy." },
    { q: "Which blood vessels carry blood away from the heart?", choices: ["Veins", "Arteries", "Capillaries", "Valves"], answer: "Arteries", why: "Arteries carry blood away from the heart at high pressure, so they have thick walls. Veins bring it back." },
    { q: "Which chamber of the heart has the thickest wall?", choices: ["Right atrium", "Left atrium", "Right ventricle", "Left ventricle"], answer: "Left ventricle", why: "The left ventricle pumps blood all round the body, the longest distance, so it needs the most muscle." },
    { q: "What do red blood cells carry?", choices: ["Oxygen", "Antibodies", "Digested fat", "Platelets"], answer: "Oxygen", why: "Red blood cells contain haemoglobin, which binds oxygen. White cells and antibodies defend against disease." },
    { q: "Why do muscles ache after very hard exercise?", choices: ["They run out of water", "Lactic acid from anaerobic respiration builds up", "They make too much oxygen", "Blood stops flowing"], answer: "Lactic acid from anaerobic respiration builds up", why: "When oxygen cannot be supplied fast enough, muscles respire anaerobically and lactic acid builds up." },
    { q: "Breathing and respiration are…", choices: ["the same thing", "different: breathing moves air, respiration releases energy in cells", "both only in the lungs", "both chemical reactions"], answer: "different: breathing moves air, respiration releases energy in cells", why: "Breathing is the movement of air; respiration is the chemical release of energy from glucose in every cell." },
  ]),
  ...shorts("bio-respiration-circulation", [
    { q: "What are the tiny air sacs in the lungs called?", answer: "alveoli", accept: ["alveolus"], why: "Alveoli have thin walls and a rich blood supply, so oxygen and carbon dioxide are exchanged there." },
  ], 6),

  ...mcqs("bio-reproduction-heredity", [
    { q: "How many chromosomes are in a normal human body cell?", choices: ["23", "46", "44", "92"], answer: "46", why: "Body cells have 23 pairs (46). Gametes have 23, so fertilisation restores 46." },
    { q: "Pollination is…", choices: ["the fusion of gametes", "the transfer of pollen from anther to stigma", "the growth of a seed", "the release of seeds"], answer: "the transfer of pollen from anther to stigma", why: "Pollination is delivery; fertilisation is the later fusion of nuclei." },
    { q: "Two parents are both Bb. What is the chance a child is bb?", choices: ["0%", "25%", "50%", "75%"], answer: "25%", why: "Bb × Bb gives BB, Bb, Bb, bb: one in four is bb." },
    { q: "Which parent's gamete decides whether a human baby is a boy or a girl?", choices: ["The mother's egg", "The father's sperm", "Both equally", "Neither"], answer: "The father's sperm", why: "Every egg carries an X. A sperm carries X (girl, XX) or Y (boy, XY)." },
    { q: "Offspring of asexual reproduction are…", choices: ["genetically identical to the parent", "always different from the parent", "produced by two parents", "made from gametes"], answer: "genetically identical to the parent", why: "Asexual reproduction has one parent and no fusion of gametes, so the offspring are clones." },
    { q: "A 'dominant' allele is one that…", choices: ["is the most common in a population", "is always beneficial", "shows its effect even when only one copy is present", "is found only in males"], answer: "shows its effect even when only one copy is present", why: "Dominant only means it masks the recessive allele. It says nothing about being common or useful." },
  ]),
  ...shorts("bio-reproduction-heredity", [
    { q: "What is the cell formed when two gametes fuse called?", answer: "zygote", why: "The zygote divides repeatedly to become an embryo." },
  ], 6),

  ...mcqs("bio-health-disease", [
    { q: "Antibiotics are effective against…", choices: ["viruses", "bacteria", "both bacteria and viruses", "colds and flu"], answer: "bacteria", why: "Antibiotics kill bacteria. Colds and flu are viral, so antibiotics do not help them." },
    { q: "Malaria is caused by…", choices: ["a virus", "a bacterium", "the Plasmodium parasite", "the mosquito itself"], answer: "the Plasmodium parasite", why: "The female Anopheles mosquito is the vector that carries Plasmodium; it is not the cause." },
    { q: "Cholera mainly spreads through…", choices: ["mosquito bites", "contaminated water", "the air", "touching skin"], answer: "contaminated water", why: "Cholera bacteria spread in water or food contaminated with sewage; clean water and sanitation prevent it." },
    { q: "How does a vaccine protect you?", choices: ["It kills all bacteria in the body", "It trains the immune system to recognise a pathogen", "It gives you a mild case of the disease on purpose", "It replaces white blood cells"], answer: "It trains the immune system to recognise a pathogen", why: "A vaccine's dead, weakened or partial pathogen prompts antibodies and memory cells, without causing the illness." },
    { q: "What should be given to a child losing water through diarrhoea?", choices: ["Antibiotics", "Oral rehydration solution", "Nothing to drink", "Sugar alone"], answer: "Oral rehydration solution", why: "ORS (clean water, salt and sugar) replaces the water and salts lost, which is what makes diarrhoea dangerous." },
    { q: "Which of these is a vector?", choices: ["A mosquito carrying malaria", "A virus", "An antibody", "A vaccine"], answer: "A mosquito carrying malaria", why: "A vector is an animal that carries a pathogen between hosts." },
  ]),
  ...shorts("bio-health-disease", [
    { q: "What do white blood cells make that stick to specific pathogens?", answer: "antibodies", accept: ["antibody"], why: "Antibodies mark pathogens for destruction; memory cells remember them for next time." },
  ], 6),
];
