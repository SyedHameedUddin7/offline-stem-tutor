import { notes } from "./helpers";

/**
 * Physics reference notes.
 *
 * Physics misconceptions are unusually stubborn because everyday language
 * contradicts the physics: we "lose energy", we say a heavy thing "falls
 * faster", we talk about current being "used up". A small model trained on
 * ordinary text inherits all of those, so each one is named here explicitly.
 */
export const PHYSICS_NOTES = [
  ...notes("phys-motion", [
    {
      kind: "definition",
      title: "Distance vs displacement, speed vs velocity",
      body:
        "Distance is how far you travelled; displacement is how far you ended up from the start, with a direction. " +
        "Speed is distance ÷ time; velocity is displacement ÷ time, and so has a direction too. " +
        "Walk once round a track and your distance is a full lap while your displacement is zero.",
    },
    {
      kind: "formula",
      title: "Equations of uniformly accelerated motion",
      body:
        "a = (v - u) ÷ t\n" +
        "v = u + at\n" +
        "s = ut + (1/2)at^2\n" +
        "v^2 = u^2 + 2as\n" +
        "where u = initial velocity, v = final velocity, a = acceleration, t = time, s = displacement. " +
        "These hold only while acceleration is constant.",
    },
    {
      kind: "worked-example",
      title: "Finding acceleration",
      body:
        "A car goes from 0 to 20 m/s in 5 s.\n" +
        "a = (v - u) ÷ t = (20 - 0) ÷ 5 = 4 m/s^2.\n" +
        "The unit m/s^2 means the velocity gains 4 m/s every second.",
    },
    {
      kind: "misconception",
      title: "Reading motion graphs",
      body:
        "On a DISTANCE-time graph the slope is the speed, so a horizontal line means stationary — not 'moving steadily'. " +
        "On a VELOCITY-time graph a horizontal line means constant velocity, the slope is acceleration, and the area under the line is the distance travelled. " +
        "Students routinely read one graph as if it were the other.",
    },
  ]),

  ...notes("phys-force-laws", [
    {
      kind: "definition",
      title: "Newton's three laws",
      body:
        "1. An object stays at rest, or keeps moving at constant velocity, unless an unbalanced force acts on it (inertia).\n" +
        "2. An unbalanced force produces acceleration: F = ma, in the direction of the force.\n" +
        "3. Every action has an equal and opposite reaction, and the two act on DIFFERENT objects.",
    },
    {
      kind: "formula",
      title: "Force and momentum",
      body:
        "F = ma, with force in newtons (N), mass in kg and acceleration in m/s^2.\n" +
        "Momentum p = mv, in kg m/s.\n" +
        "Friction always opposes the direction of relative motion.",
    },
    {
      kind: "worked-example",
      title: "Why you fall forward when a bus stops",
      body:
        "While the bus moves you move with it at the same speed.\n" +
        "When the bus brakes, a force acts on the BUS, not directly on you.\n" +
        "By the first law your body keeps moving forward until something (a seat, the floor, a handrail) applies a force to stop it. " +
        "Nothing throws you forward; you simply continue.",
    },
    {
      kind: "misconception",
      title: "Motion does not require a continuing force",
      body:
        "The strongest intuition in mechanics, and it is wrong: a force is needed to CHANGE motion, not to maintain it. " +
        "A puck sliding on ice keeps going because almost nothing opposes it. " +
        "Also: action and reaction never cancel out, because they act on two different objects.",
    },
  ]),

  ...notes("phys-gravitation", [
    {
      kind: "definition",
      title: "Mass vs weight",
      body:
        "Mass is the amount of matter, measured in kg, and is the same everywhere. " +
        "Weight is the gravitational force on that mass, measured in newtons: W = mg. " +
        "A 50 kg student has a mass of 50 kg everywhere, and a weight of about 500 N on Earth and about 80 N on the Moon.",
    },
    {
      kind: "formula",
      title: "Free fall",
      body:
        "Take g = 10 m/s^2 downward unless told otherwise.\n" +
        "Dropped from rest: v = gt and distance = (1/2)g t^2.\n" +
        "Thrown up at speed u: time to the top = u ÷ g, and the total flight time is twice that, " +
        "because rising and falling are mirror images.",
    },
    {
      kind: "worked-example",
      title: "Ball thrown straight up at 20 m/s",
      body:
        "At the highest point the velocity is zero.\n" +
        "Time up = u ÷ g = 20 ÷ 10 = 2 s.\n" +
        "Falling back takes the same 2 s, so the total time is 4 s.",
    },
    {
      kind: "misconception",
      title: "Heavier does not mean faster",
      body:
        "In the absence of air resistance all objects fall with the same acceleration g, whatever their mass. " +
        "A heavier object feels a larger gravitational force but also has more inertia, and the two cancel exactly. " +
        "A feather falls slowly because of AIR RESISTANCE, not because it is light — in a vacuum it falls like a stone.",
    },
  ]),

  ...notes("phys-work-energy", [
    {
      kind: "formula",
      title: "Work, energy and power",
      body:
        "Work W = F x d, where d is the distance moved IN THE DIRECTION of the force. Unit: joule (J).\n" +
        "Kinetic energy = (1/2)mv^2.\n" +
        "Potential energy near the ground = mgh.\n" +
        "Power = work ÷ time, in watts (W). 1 W = 1 J/s.",
    },
    {
      kind: "definition",
      title: "Conservation of energy",
      body:
        "Energy is never created or destroyed, only transformed. " +
        "A falling stone converts potential energy into kinetic energy; a bulb converts electrical energy into light and heat. " +
        "What people call 'wasted' energy has usually become heat.",
    },
    {
      kind: "worked-example",
      title: "Energy changes for a dropped stone",
      body:
        "At the roof: maximum potential energy (mgh), zero kinetic energy.\n" +
        "Falling: potential energy decreases and kinetic energy increases by the same amount, so the total stays constant.\n" +
        "Just before impact: almost all of it is kinetic, (1/2)mv^2.\n" +
        "On landing: converted into sound, heat and deformation of the ground.",
    },
    {
      kind: "misconception",
      title: "No movement means no work",
      body:
        "Holding a heavy bag still is exhausting but does zero work in the physics sense, because d = 0. " +
        "Carrying it horizontally also does no work against gravity, because the force (upward) is perpendicular to the motion (horizontal). " +
        "Everyday 'work' and physics 'work' are different words that happen to be spelled the same.",
    },
  ]),

  ...notes("phys-heat", [
    {
      kind: "definition",
      title: "Heat vs temperature",
      body:
        "Temperature measures how hot something is — the average energy of its particles — in °C or K. " +
        "Heat is the energy that flows from a hotter body to a colder one, measured in joules. " +
        "A bathtub of warm water is at a lower temperature than a cup of boiling water but contains far more heat energy.",
    },
    {
      kind: "definition",
      title: "The three ways heat travels",
      body:
        "Conduction: through direct contact, particle to particle. Best in metals, poor in wood, air and water.\n" +
        "Convection: by the bulk movement of a heated fluid, which expands, becomes less dense and rises.\n" +
        "Radiation: as infrared waves, needing no medium at all — this is how the Sun's heat reaches us.",
    },
    {
      kind: "definition",
      title: "Latent heat and changes of state",
      body:
        "During a change of state the temperature does not change, even though heat is still being supplied. " +
        "That energy goes into breaking the bonds between particles instead of speeding them up. " +
        "This is why boiling water stays at 100 °C until all of it has become steam.",
    },
    {
      kind: "misconception",
      title: "Metal is not colder than wood",
      body:
        "A metal spoon and a wooden spoon in the same room are at the SAME temperature. " +
        "The metal feels colder because it conducts heat away from your hand quickly. " +
        "You are not sensing temperature; you are sensing the rate of heat loss from your skin.",
    },
  ]),

  ...notes("phys-light", [
    {
      kind: "definition",
      title: "Laws of reflection",
      body:
        "1. The angle of incidence equals the angle of reflection.\n" +
        "2. The incident ray, the reflected ray and the normal (the line perpendicular to the surface) all lie in one plane.\n" +
        "Both angles are measured from the NORMAL, not from the surface.",
    },
    {
      kind: "definition",
      title: "Refraction and why it happens",
      body:
        "Light changes speed when it enters a different medium, and that change of speed bends its path. " +
        "Entering a denser medium (air into water or glass) it slows and bends TOWARD the normal; leaving it, it speeds up and bends away. " +
        "A ray hitting the surface along the normal does not bend at all.",
    },
    {
      kind: "worked-example",
      title: "Why a straw looks bent in water",
      body:
        "Light from the underwater part of the straw leaves the water and speeds up, bending away from the normal.\n" +
        "Your eye traces that bent ray back in a straight line, so the submerged part appears shifted upward.\n" +
        "The straw is straight; the light path is not.",
    },
    {
      kind: "misconception",
      title: "Plane mirror images, and how seeing works",
      body:
        "A plane mirror forms a virtual, upright image, the same size as the object and as far behind the mirror as the object is in front. " +
        "It is laterally inverted, not upside down. " +
        "Also, eyes do not emit anything: we see an object because light from a source reflects off it and enters the eye.",
    },
  ]),

  ...notes("phys-electricity", [
    {
      kind: "formula",
      title: "Ohm's law and electrical power",
      body:
        "V = IR, where V is potential difference in volts, I is current in amperes and R is resistance in ohms.\n" +
        "Power P = VI = I^2 R = V^2 ÷ R, in watts.\n" +
        "Current is the rate of flow of charge: I = Q ÷ t.",
    },
    {
      kind: "definition",
      title: "Series and parallel",
      body:
        "In SERIES: one path only, so the current is the same everywhere and the voltages add. " +
        "Total resistance R = R1 + R2 + …, and if one component fails the whole circuit breaks.\n" +
        "In PARALLEL: several paths, so each branch gets the full voltage and the branch currents add. " +
        "The total resistance is LESS than the smallest branch, and one branch failing leaves the others working.",
    },
    {
      kind: "worked-example",
      title: "Resistance of a bulb",
      body:
        "A 6 V battery drives 0.5 A through a bulb.\n" +
        "From V = IR, R = V ÷ I = 6 ÷ 0.5 = 12 ohms.",
    },
    {
      kind: "misconception",
      title: "Current is not used up",
      body:
        "The same current that enters a bulb leaves it. What is transferred is ENERGY, not charge: " +
        "the voltage drops across the bulb while the current stays the same. " +
        "House lights are wired in parallel so each gets the full mains voltage and one failing bulb does not switch off the house.",
    },
  ]),
];
