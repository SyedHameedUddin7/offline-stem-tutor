import { notes } from "./helpers";

/**
 * Biology reference notes.
 *
 * Biology at this level is mostly about getting a process in the right order
 * and not confusing two similar-sounding terms, so the notes lean on
 * sequences and on explicit "X is not Y" pairs.
 */
export const BIOLOGY_NOTES = [
  ...notes("bio-cell", [
    {
      kind: "definition",
      title: "What the main organelles do",
      body:
        "Nucleus: holds the DNA and controls the cell's activities.\n" +
        "Cell membrane: encloses the cell and decides what enters and leaves (selectively permeable).\n" +
        "Cytoplasm: the jelly where most reactions happen.\n" +
        "Mitochondria: release energy from glucose by respiration.\n" +
        "Ribosomes: build proteins.\n" +
        "Chloroplasts: carry out photosynthesis (plant cells only).\n" +
        "Vacuole: stores water and keeps the cell firm (large and permanent in plants).",
    },
    {
      kind: "definition",
      title: "Plant vs animal cells",
      body:
        "Both have a nucleus, cytoplasm, cell membrane, mitochondria and ribosomes.\n" +
        "Only plant cells have a cellulose cell wall, chloroplasts, and one large permanent vacuole.\n" +
        "Animal cells have a flexible shape and small temporary vacuoles.",
    },
    {
      kind: "worked-example",
      title: "Why the mitochondrion is called the powerhouse",
      body:
        "Respiration happens inside it: glucose + oxygen -> carbon dioxide + water + energy.\n" +
        "The released energy is what every other process in the cell runs on.\n" +
        "Cells that need a lot of energy, such as muscle cells, contain many more mitochondria.",
    },
    {
      kind: "misconception",
      title: "Cell wall and cell membrane are not the same",
      body:
        "The cell MEMBRANE is in every cell and controls what passes through. " +
        "The cell WALL is an extra rigid layer outside it, found in plants (cellulose), fungi and bacteria, and it gives support rather than controlling entry. " +
        "Animal cells have a membrane but no wall.",
    },
  ]),

  ...notes("bio-tissues-systems", [
    {
      kind: "definition",
      title: "Levels of organisation",
      body:
        "Cell -> tissue -> organ -> organ system -> organism.\n" +
        "A tissue is a group of similar cells doing one job. An organ is several tissues working together. " +
        "A system is several organs with a shared function, such as digestion.",
    },
    {
      kind: "definition",
      title: "Xylem and phloem",
      body:
        "Xylem carries water and dissolved minerals UPWARD from the roots, through dead hollow cells, in one direction only.\n" +
        "Phloem carries dissolved food (sugars) made in the leaves to wherever it is needed, up or down, through living cells.\n" +
        "A memory hook: xylem for water, phloem for food.",
    },
    {
      kind: "definition",
      title: "The four animal tissue types",
      body:
        "Epithelial: covers and lines surfaces, such as the skin and gut lining.\n" +
        "Muscular: contracts to produce movement.\n" +
        "Nervous: carries electrical impulses.\n" +
        "Connective: joins and supports — bone, blood, cartilage, tendon.",
    },
    {
      kind: "misconception",
      title: "An organ is not a tissue",
      body:
        "The stomach is an organ, not a tissue: it contains muscular tissue, epithelial tissue, nervous tissue and connective tissue together. " +
        "Blood is a tissue (specifically connective), not an organ, even though it is liquid.",
    },
  ]),

  ...notes("bio-photosynthesis", [
    {
      kind: "formula",
      title: "The photosynthesis equation",
      body:
        "In words: carbon dioxide + water -(sunlight, chlorophyll)-> glucose + oxygen.\n" +
        "Raw materials: CO2 from the air through the stomata, water from the soil through the roots.\n" +
        "Needed: light energy, captured by chlorophyll in the chloroplasts.\n" +
        "Products: glucose (stored as starch) and oxygen (released as a by-product).",
    },
    {
      kind: "definition",
      title: "Leaf structure and stomata",
      body:
        "Leaves are broad and flat to catch the most light and to allow fast gas exchange. " +
        "Stomata are tiny pores, mostly on the underside, each controlled by two guard cells. " +
        "They open to let CO2 in and close to limit water loss — which is why most plants close them in the heat of the day.",
    },
    {
      kind: "worked-example",
      title: "A plant left in the dark for a week",
      body:
        "Without light, photosynthesis stops, so no new glucose is made.\n" +
        "The plant lives on its stored starch, which runs down, and it keeps respiring the whole time.\n" +
        "Chlorophyll breaks down, so the leaves turn pale yellow, and the plant becomes weak and spindly.",
    },
    {
      kind: "misconception",
      title: "Plants respire too, all the time",
      body:
        "Photosynthesis does not replace respiration. Plants respire day and night, using oxygen and releasing CO2, " +
        "exactly as animals do. In daylight photosynthesis is much faster than respiration, so the NET flow looks " +
        "like oxygen out and CO2 in — but both processes are running at once. " +
        "Also, plants do not 'eat' soil: soil supplies water and minerals, while the carbon in a plant comes from air.",
    },
  ]),

  ...notes("bio-digestion", [
    {
      kind: "definition",
      title: "The path of food",
      body:
        "Mouth (chewing; amylase begins starch digestion) -> oesophagus (peristalsis) -> stomach " +
        "(acid plus protease begins protein digestion) -> small intestine (bile emulsifies fat, enzymes finish the job, " +
        "nutrients are absorbed through the villi) -> large intestine (water absorbed) -> rectum and anus (waste removed).",
    },
    {
      kind: "definition",
      title: "Enzymes, bile and villi",
      body:
        "Amylase breaks starch into sugars; protease breaks protein into amino acids; lipase breaks fat into fatty acids and glycerol.\n" +
        "Bile is not an enzyme: it emulsifies fat into small droplets so lipase has more surface area to work on, and it neutralises stomach acid.\n" +
        "Villi are finger-like folds of the small intestine wall that give a huge surface area for absorption.",
    },
    {
      kind: "definition",
      title: "Deficiency diseases",
      body:
        "Iron -> anaemia (tiredness, pallor); found in leafy greens, liver, beans.\n" +
        "Vitamin C -> scurvy; found in citrus and fresh vegetables.\n" +
        "Vitamin D or calcium -> rickets and weak bones.\n" +
        "Vitamin A -> night blindness.\n" +
        "Protein -> kwashiorkor and poor growth.",
    },
    {
      kind: "misconception",
      title: "Roughage matters precisely because it is not digested",
      body:
        "Fibre passes through undigested, and that is its job: it gives the gut muscles bulk to push against, " +
        "keeping food moving and preventing constipation. Being indigestible is the point, not a shortcoming. " +
        "Separately, digestion starts in the MOUTH, not the stomach.",
    },
  ]),

  ...notes("bio-respiration-circulation", [
    {
      kind: "definition",
      title: "Breathing vs respiration",
      body:
        "Breathing (ventilation) is the physical movement of air into and out of the lungs. " +
        "Respiration is the chemical release of energy from glucose, and it happens in every cell, in the mitochondria. " +
        "Breathing supplies the oxygen that respiration uses; they are not the same process.",
    },
    {
      kind: "formula",
      title: "Aerobic and anaerobic respiration",
      body:
        "Aerobic: glucose + oxygen -> carbon dioxide + water + a lot of energy.\n" +
        "Anaerobic in muscle: glucose -> lactic acid + a little energy.\n" +
        "Anaerobic in yeast (fermentation): glucose -> ethanol + carbon dioxide + a little energy.",
    },
    {
      kind: "definition",
      title: "Heart, blood and double circulation",
      body:
        "Four chambers: right atrium and ventricle send blood to the lungs; left atrium and ventricle send it to the body. " +
        "The left ventricle has the thickest wall because it pumps the furthest.\n" +
        "Blood components: red cells (carry oxygen via haemoglobin), white cells (defence), platelets (clotting), plasma (transport).\n" +
        "Double circulation means blood passes through the heart twice per complete circuit.",
    },
    {
      kind: "misconception",
      title: "Why arteries have thick walls, and why muscles ache",
      body:
        "Arteries carry blood AWAY from the heart at high pressure, so they need thick muscular elastic walls. " +
        "Veins carry blood back at low pressure, so they have thin walls and valves to stop backflow.\n" +
        "Muscles ache after hard exercise because oxygen could not be supplied fast enough, so they respired anaerobically and lactic acid built up.",
    },
  ]),

  ...notes("bio-reproduction-heredity", [
    {
      kind: "definition",
      title: "Asexual vs sexual reproduction",
      body:
        "Asexual: one parent, no gametes, offspring genetically identical to the parent. Fast, and no mate needed. " +
        "Examples: binary fission, budding in yeast, runners in strawberry.\n" +
        "Sexual: two parents, gametes fuse, offspring genetically different from both. " +
        "Slower, but the variation it produces is what lets a population adapt.",
    },
    {
      kind: "definition",
      title: "Pollination vs fertilisation",
      body:
        "Pollination is the TRANSFER of pollen from anther to stigma, by wind, insects or water.\n" +
        "Fertilisation is what happens afterwards: the pollen grows a tube down the style and its nucleus fuses with the ovule's.\n" +
        "Pollination is delivery; fertilisation is fusion. One can happen without the other succeeding.",
    },
    {
      kind: "worked-example",
      title: "Two carriers of a recessive trait",
      body:
        "Let B be dominant and b recessive. Both parents are carriers: Bb x Bb.\n" +
        "The possible offspring are BB, Bb, Bb, bb.\n" +
        "Only bb shows the recessive trait, so the chance is 1 in 4 (25%).\n" +
        "Yes, the child can show a trait neither parent displays.",
    },
    {
      kind: "misconception",
      title: "Dominant does not mean common or better",
      body:
        "'Dominant' only means the allele masks the recessive one when both are present. " +
        "It says nothing about how widespread the trait is in a population, or whether it is advantageous. " +
        "A recessive allele can be far more common than a dominant one.",
    },
  ]),

  ...notes("bio-health-disease", [
    {
      kind: "definition",
      title: "Virus vs bacterium",
      body:
        "Bacteria are living single cells with cytoplasm and a cell wall; they reproduce by themselves and many are harmless or useful. " +
        "Viruses are much smaller, are not cells, and can only reproduce inside a host cell, destroying it. " +
        "Antibiotics kill bacteria and have NO effect on viruses.",
    },
    {
      kind: "definition",
      title: "How infections spread",
      body:
        "Air (droplets from coughs and sneezes): tuberculosis, influenza, COVID-19.\n" +
        "Water and food (often contaminated by sewage): cholera, typhoid.\n" +
        "Vectors (animals that carry the pathogen): mosquitoes for malaria and dengue.\n" +
        "Direct contact or body fluids.",
    },
    {
      kind: "worked-example",
      title: "How a mosquito spreads malaria",
      body:
        "The disease is caused by the Plasmodium parasite, not by the mosquito itself.\n" +
        "A female Anopheles mosquito bites an infected person and takes up the parasite with the blood.\n" +
        "The parasite develops inside the mosquito, and when it bites someone else the parasite enters that person's blood.\n" +
        "The mosquito is the vector — the courier — and prevention works by breaking that link: nets, repellent, draining standing water.",
    },
    {
      kind: "misconception",
      title: "Vaccines do not give you the disease",
      body:
        "A vaccine contains a dead, weakened or partial pathogen — enough for the immune system to recognise, not enough to cause illness. " +
        "The body makes antibodies and keeps memory cells, so a real infection later is destroyed before symptoms appear. " +
        "Also: taking antibiotics for a cold or flu does nothing, because those are viral.",
    },
  ]),
];
