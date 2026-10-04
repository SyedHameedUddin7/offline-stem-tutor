/**
 * UI strings, English and French.
 *
 * French is not a nice-to-have for this project. The pods this is built for
 * are in Bamako; the working language of secondary school there is French.
 * An offline tutor that only speaks English has solved the connectivity
 * problem and left the actual barrier in place.
 *
 * Deliberately a plain object rather than an i18n library: two locales and
 * ~60 keys do not justify a dependency, and a dependency here would be
 * bytes on the critical path of a shell that has to stay small.
 */

export type Lang = "en" | "fr";

export const LANGUAGES: Array<{ code: Lang; label: string }> = [
  { code: "en", label: "English" },
  { code: "fr", label: "Français" },
];

export const STRINGS = {
  en: {
    appTitle: "Built for the pod, not the office.",
    appKicker: "offline stem tutor",
    tabTutor: "Tutor",
    tabTeacher: "Teacher review",
    footerHint:
      "try it: turn on airplane mode, then keep asking questions and playing downloaded videos",

    // Install
    installTitle: "install to keep your work",
    installBody:
      "Installed, this app gets its own storage that the browser will not clear, and it opens without a connection. On a shared pod phone this is the supported way to run it.",
    installIosBody:
      "Tap Share, then \"Add to Home Screen\". Installed, the app gets storage iOS will not clear between sessions and opens without a connection.",
    installAction: "Install",
    installInAppTitle: "open this in your browser",
    installInAppBody:
      "You are viewing this inside another app's built-in browser, which usually erases saved data when that app closes — learners and downloads will not survive. Tap the menu and choose \"Open in Safari\" or \"Open in Chrome\", then install from there.",

    // Storage persistence
    storageAtRisk: "this browser may delete your work",
    storageAtRiskBody:
      "The browser has not promised to keep this app's data. Learners, questions and downloaded models can be cleared when you close the browser or when storage runs low. Installing the app makes it far more likely to be kept.",
    storageAtRiskAction: "Ask the browser to keep it",

    // Service worker / offline readiness
    swCaching: "preparing offline",
    swCachingHint:
      "Downloading the app so it can start without a connection. Stay online until this says ready.",
    swOfflineReady: "works offline",
    swOfflineReadyHint:
      "The app is cached on this device. You can disconnect and it will still open.",
    swUnavailable: "offline unavailable",
    swUpdate: "update ready — tap to reload",

    // Low bandwidth
    lowBandwidth: "Low-bandwidth mode",
    lowBandwidthBlurb:
      "This connection looks slow or metered, so nothing large downloads on its own. Costs are shown before you tap.",
    costEstimate: (mb: number, minutes: number) => `${mb}MB · roughly ${minutes} min on this connection`,
    costPlain: (mb: number) => `${mb}MB`,

    // Landing
    landingTagline: "A STEM tutor that keeps teaching when the network stops.",
    landingBody:
      "Built for learning pods where signal is unreliable, data is expensive and one phone is shared between students.",
    landingStart: "Start learning",
    landingNoDownload: "No large download needed to start",
    landingF1: "Works offline",
    landingF1Body: "Installs as an app and boots with the radio off.",
    landingF2: "Answers it can prove",
    landingF2Body: "An exact solver and a teacher-verified answer bank, before any AI.",
    landingF3: "Optional on-device AI",
    landingF3Body: "A language model you can choose to download. Never automatic.",
    landingF4: "Shared-device profiles",
    landingF4Body: "Each student's questions stay their own.",
    landingF5: "Facilitator review",
    landingF5Body: "Corrections become verified answers for the next student.",
    landingF6: "English and French",
    landingF6Body: "Interface, curriculum and the tutor's replies.",

    // Learners (shared device)
    whoIsLearning: "Who's learning today?",
    learnerPickerBlurb:
      "Pick your name to keep your questions and progress separate from everyone else's on this phone.",
    newLearner: "New learner",
    learnerNamePlaceholder: "First name",
    startLearning: "Start learning",
    cancel: "Cancel",
    switchLearner: "switch",
    switchLearnerTitle: "Hand the device to someone else. Nothing is deleted.",
    deleteLearnerConfirm: (name: string) => `Delete ${name} and all their questions?`,
    deleteLearnerYes: "Delete",
    deleteLearnerAria: (name: string) => `Delete learner ${name}`,
    learnerPrivacyNote:
      "Profiles keep conversations separate on a shared device. They are not a password — anyone holding this phone can pick any name. Everything stays on this device.",
    learnerUnknown: "Unknown learner",

    // Connectivity
    signalDetected: "SIGNAL DETECTED",
    noSignal: "NO SIGNAL",
    syncingAvailable: "syncing available",
    runsOnDevice: "tutor runs on this device",

    // Subjects / chapters
    chapters: (n: number) => `${n} chapters`,
    grounded: "grounded",
    hasVideo: "has lesson video",

    // Chat
    messages: (n: number) => `${n} messages`,
    noQuestionsYet: "No questions yet in this chapter. Try one:",
    askAbout: (chapter: string) => `Ask about ${chapter.toLowerCase()}…`,
    ask: "Ask",
    thinking: "tutor is thinking…",
    confidence: "confidence",
    match: "match",
    flagForReview: "flag for review",
    flaggedForReview: "flagged for teacher review",

    // Tiers
    // Provenance, as a student reads it
    provVerified: "Verified — checked against your question",
    provTeacherVerified: "Verified by a teacher",
    provFromExample: "From a verified example",
    provChecksPassed: "Arithmetic and units checked · reasoning not verified",
    provChecksFailed: "⚠ A check failed — sent to your teacher",
    provGroundedUnchecked: "Used the chapter material · not checked by a person",
    provUnchecked: "AI answer · not checked by a person",
    provNoAnswer: "No answer — sent to your teacher",
    provShowDetails: "details",
    provHideDetails: "hide details",

    tierSolver: "exact solver · no model",
    tierLlm: "on-device model",
    tierBank: "verified answer bank",
    tierNone: "no engine",

    // Model loader
    modelReady: "on-device model ready",
    modelNotLoaded: "on-device model not loaded",
    modelLoading: "loading on-device model",
    unload: "unload",
    unloadTitle: "Free the memory the model is using. The download stays cached.",
    alreadyDownloaded: "Already downloaded on this device — loading uses no data.",
    oneDownload: (mb: number) =>
      `One download of about ${mb}MB. After that it answers with no connection at all.`,
    loadModel: "Load model",
    downloadMb: (mb: number) => `Download ${mb}MB`,
    onDevice: "on device",
    noWebgpu: "no webgpu on this device",
    noWebgpuBody:
      "Mental Ability still works — it runs on the verified answer bank, which needs no GPU. This is the common case on a shared low-end phone, not a broken install.",

    // Lessons
    lessonVideos: "Lesson videos",
    noVideos: (chapter: string) =>
      `No lesson videos for ${chapter} yet. Chapters with a downloadable lesson are marked with a dot in the chapter list.`,
    availableOffline: "✓ available offline",
    play: "play",
    remove: "remove",
    download: (mb: number) => `download ${mb}MB`,

    // Facilitator gate
    setPinTitle: "Set a facilitator PIN",
    setPinBlurb:
      "The review queue shows every learner's flagged questions, so it sits behind a PIN. Choose one now — it is stored only on this device.",
    enterPinTitle: "Facilitator access",
    enterPinBlurb: "Enter the PIN for this device to open the review queue.",
    pinPlaceholder: "PIN",
    pinPlaceholderNew: "New PIN",
    pinPlaceholderConfirm: "Confirm PIN",
    setPinAction: "Set PIN",
    unlockAction: "Unlock",
    pinChecking: "Checking…",
    facilitatorUnlocked: "facilitator access unlocked",
    lockAgain: "lock",
    pinWrong: "That PIN is not correct.",
    pinMismatch: "The two PINs do not match.",
    pinDigitsOnly: "Digits only.",
    pinLength: (min: number, max: number) => `Use between ${min} and ${max} digits.`,
    pinRepeated: "Not all the same digit.",
    pinSequential: "Not a run of consecutive digits.",
    pinInvalid: "That PIN cannot be used.",
    pinAttemptsLeft: (n: number) => `${n} attempt${n === 1 ? "" : "s"} left before a cooldown.`,
    pinLockedOut: (seconds: number) =>
      `Too many attempts. Try again in ${seconds}s. The wait doubles each time.`,
    pinSetupNote:
      "Six digits minimum: four is only about two minutes of guessing for someone who extracts the stored value. This is a boundary against a curious student, not real security — anyone holding this device could eventually get past it.",
    pinForgotNote:
      "There is no reset from inside the app. With no server, a reset reachable here would just be a second unlocked door. A forgotten PIN means clearing this app's site data in your browser settings, which also erases the conversations stored on this device.",

    // Teacher panel
    teacherReview: "Teacher review",
    teacherReviewBlurb:
      "Low-confidence answers the tutor flagged itself, waiting for a human to approve or correct — works fully offline, syncs when the pod is back online.",
    nothingPending: "Nothing pending review right now.",
    flaggedAt: "flagged",
    writeCorrection: "Write a correction (optional)…",
    approveAsIs: "Approve as-is",
    saveAndTeach: "Save + teach the tutor",
    saving: "Saving…",
    resolved: "resolved",
    inAnswerBank: "in answer bank",

    // Tutor output. Read by a student, so it is localised like everything
    // else — an interface in French that answers in English is worse than
    // not translating at all.
    tutorMethod: "METHOD",
    tutorAnswer: "ANSWER",
    tutorCheckedLocally:
      "Checked against every number in your question, on this device. No model was used.",
    tutorNoVerifiedMethod:
      "I don't have a verified method for this one, and I'm not going to guess \u2014 aptitude questions have one defensible answer, and a plausible-sounding wrong method is worse than no answer. I've flagged it for your teacher.",
    tutorMatchedExample: (q: string) => `Matched to a verified example: "${q}"`,
    tutorClosestExample: (q: string) => `The closest verified example I have is:\n\n"${q}"`,
    tutorMayNotMatch:
      "This may not be the same type of problem as yours, so I've flagged it for your teacher to check.",
    tutorTeacherVerified: "Verified by a teacher in your pod.",
    tutorCrossChapter: (chapter: string) =>
      `Note: this example comes from ${chapter}, not the chapter you have open. Check that it is really the same kind of problem.`,
    tutorMethodFrom: (q: string) => `\u2014 Method from a verified example: "${q}"`,
    tutorMethodFromIn: (chapter: string, q: string) =>
      `\u2014 Method from a verified example in ${chapter}: "${q}"`,
    tutorModelNotLoaded: (subject: string) =>
      `${subject} questions need the on-device model, which isn't loaded on this device yet. Load it from the banner above \u2014 it downloads once, then works with no connection at all.`,
    tutorGenerationFailed: "The on-device model stopped partway through. Try asking again.",
    tutorSearchFailed: (reason: string) =>
      `I could not search the verified answer bank on this device, so I won't guess. Your question has been saved for a teacher.\n\nReason: ${reason}`,
    tutorChapterGone: "That chapter no longer exists on this device.",
    tutorExchangeFailed: "Something went wrong saving that exchange. Nothing already saved was lost.",
    tutorBankNotReady: (indexed: number, total: number) =>
      `The verified answer bank isn't searchable on this device yet (${indexed} of ${total} items indexed), so I won't guess. ` +
      `The search model downloads once — connect briefly and ask again, and it will work offline from then on. ` +
      `Number-series questions already work with no model at all.`,

    // Diagnostics
    diagTitle: "Device diagnostics",
    diagBlurb:
      "Capability facts about this device, for troubleshooting a pod phone. Contains no learner names, questions or answers.",
    diagCopy: "copy",
    diagCopied: "copied",

    // Offline readiness
    readyTitle: "Offline readiness",
    readyRecheck: "re-check",
    readyVerdictYes: "Ready for offline learning",
    readyVerdictNo: "Not ready for offline learning",
    readyVerdictYesBody:
      "Everything this device needs to teach without a connection is stored locally. Optional items below would add more.",
    readyVerdictNoBody: (missing: string) =>
      `Missing: ${missing}. Connect briefly and fix the items below before taking this device somewhere without signal.`,
    readyOptional: "optional",
    readySw: "App works from a cold start offline",
    readyPersist: "Browser told not to delete this data",
    readyBank: "Verified answer bank indexed",
    readyNotes: "Chapter reference material indexed",
    readySearchModel: "Search model downloaded",
    readyLanguageModel: "On-device language model downloaded",
    readyVideos: "Lesson videos downloaded",
    readyStorage: "Free storage",
    readyYes: "yes",
    readyNo: "no",
    readyCachedFiles: (n: number) => `${n} files`,
    readyFreeSpace: (size: string) => size,
    readyIndexNow: "Index now",
    readyIndexing: "Indexing…",
    readyKeepData: "Ask browser to keep data",
    readyAsking: "Asking…",
    readyNote:
      "Checked against actual storage, not assumed. Without the 'keep data' permission a browser short on space can delete the downloaded model and the indexed answer bank — on a shared phone that is close to full, that is not hypothetical.",

    // Facilitator dashboard
    dashTitle: "Pod overview",
    dashThisDeviceOnly: "this device only",
    dashAwaitingReview: "answers waiting for a facilitator",
    dashLearners: "Learners",
    dashQuestionsToday: "Questions today",
    dashQuestionsTotal: "Questions in total",
    dashTeacherExemplars: "Verified exemplars",
    dashVerifiedCoverage: "Verified coverage",
    dashVerifiedCaption:
      "Answers that came from the exact solver or the verified answer bank. The rest came from the on-device model and nobody has checked them.",
    dashWhereAnswersCame: "Where the answers came from",
    dashNeedsAttention: "Needs attention",
    dashPendingN: (n: number) => `${n} pending`,
    dashUncheckedN: (n: number) => `${n} unchecked`,
    dashLearnerTable: "Learners on this device",
    dashColLearner: "Learner",
    dashColQuestions: "Asked",
    dashColPending: "Pending",
    dashColUnchecked: "Unchecked",
    dashColLastAsked: "Last asked",
    dashToday: "today",
    dashYesterday: "yesterday",
    dashDaysAgo: (n: number) => `${n}d ago`,
    dashNeverAsked: "not yet",
    dashEmpty:
      "No questions on this device yet. These numbers fill in as learners use the tutor, and grow across the pod once you import another device's sync bundle.",

    // Sync
    syncTitle: "Pod sync",
    syncBlurb:
      "Carry this device's flagged questions and verified corrections to another phone in the pod. Works with no network — export a file, import it on the other device.",
    syncThisDevice: "this device",
    syncExportPending: (n: number) => `Export ${n} new change${n === 1 ? "" : "s"}`,
    syncNothingPending: "Nothing new to export",
    syncExportAll: "Export everything",
    syncImport: "Import from another device",
    syncReceived: "received",
    syncApplied: "applied",
    syncDuplicates: "already had",
    syncSuperseded: "kept ours",
    syncNewExemplars: (n: number) =>
      `${n} verified exemplar${n === 1 ? "" : "s"} arrived and ${n === 1 ? "is" : "are"} now searchable offline on this device.`,
    syncNote:
      "Importing never deletes local work: where two facilitators disagree, a correction wins over an approval, and the result is the same whichever device imports first. Only names travel with a flag, never a student's conversation.",

    // Errors
    crashed: (label: string) => `${label} stopped working`,
    crashedBody:
      "The rest of the app is still running, and nothing saved on this device has been lost.",
    tryAgain: "Try again",
  },

  fr: {
    appTitle: "Conçu pour le pod, pas pour le bureau.",
    appKicker: "tuteur stem hors ligne",
    tabTutor: "Tuteur",
    tabTeacher: "Révision enseignant",
    footerHint:
      "essayez : activez le mode avion, puis continuez à poser des questions et à lire les vidéos téléchargées",

    installTitle: "installe pour conserver ton travail",
    installBody:
      "Une fois installée, l'application dispose de son propre stockage que le navigateur n'effacera pas, et elle s'ouvre sans connexion. Sur un téléphone de pod partagé, c'est le mode d'utilisation prévu.",
    installIosBody:
      "Touche Partager, puis « Sur l'écran d'accueil ». Installée, l'application conserve ses données entre les sessions et s'ouvre sans connexion.",
    installAction: "Installer",
    installInAppTitle: "ouvre ceci dans ton navigateur",
    installInAppBody:
      "Tu consultes cette page dans le navigateur intégré d'une autre application, qui efface généralement les données enregistrées à sa fermeture — les apprenants et les téléchargements ne survivront pas. Ouvre le menu et choisis « Ouvrir dans Safari » ou « Ouvrir dans Chrome », puis installe depuis là.",

    storageAtRisk: "ce navigateur peut supprimer ton travail",
    storageAtRiskBody:
      "Le navigateur n'a pas promis de conserver les données de cette application. Les apprenants, les questions et les modèles téléchargés peuvent être effacés à la fermeture du navigateur ou si l'espace manque. Installer l'application augmente nettement les chances qu'ils soient conservés.",
    storageAtRiskAction: "Demander au navigateur de conserver",

    swCaching: "préparation hors ligne",
    swCachingHint:
      "Téléchargement de l'application pour qu'elle démarre sans connexion. Reste en ligne jusqu'à « fonctionne hors ligne ».",
    swOfflineReady: "fonctionne hors ligne",
    swOfflineReadyHint:
      "L'application est enregistrée sur cet appareil. Tu peux te déconnecter, elle s'ouvrira quand même.",
    swUnavailable: "hors ligne indisponible",
    swUpdate: "mise à jour prête — toucher pour recharger",

    lowBandwidth: "Mode faible bande passante",
    lowBandwidthBlurb:
      "Cette connexion semble lente ou limitée : rien de volumineux ne se télécharge tout seul. Les coûts sont affichés avant que tu ne touches.",
    costEstimate: (mb: number, minutes: number) =>
      `${mb} Mo · environ ${minutes} min sur cette connexion`,
    costPlain: (mb: number) => `${mb} Mo`,

    landingTagline: "Un tuteur STEM qui continue d'enseigner quand le réseau s'arrête.",
    landingBody:
      "Conçu pour les pods d'apprentissage où le signal est incertain, les données coûteuses et un téléphone partagé entre plusieurs élèves.",
    landingStart: "Commencer",
    landingNoDownload: "Aucun téléchargement volumineux pour démarrer",
    landingF1: "Fonctionne hors ligne",
    landingF1Body: "S'installe comme une application et démarre sans réseau.",
    landingF2: "Des réponses démontrables",
    landingF2Body: "Un solveur exact et une banque vérifiée par des enseignants, avant toute IA.",
    landingF3: "IA embarquée optionnelle",
    landingF3Body: "Un modèle de langage que tu choisis de télécharger. Jamais automatique.",
    landingF4: "Profils sur appareil partagé",
    landingF4Body: "Les questions de chaque élève restent les siennes.",
    landingF5: "Révision par l'animateur",
    landingF5Body: "Les corrections deviennent des réponses vérifiées pour le suivant.",
    landingF6: "Anglais et français",
    landingF6Body: "Interface, programme et réponses du tuteur.",

    whoIsLearning: "Qui apprend aujourd'hui ?",
    learnerPickerBlurb:
      "Choisis ton nom pour garder tes questions et ta progression séparées de celles des autres sur ce téléphone.",
    newLearner: "Nouvel apprenant",
    learnerNamePlaceholder: "Prénom",
    startLearning: "Commencer",
    cancel: "Annuler",
    switchLearner: "changer",
    switchLearnerTitle: "Passe l'appareil à quelqu'un d'autre. Rien n'est supprimé.",
    deleteLearnerConfirm: (name: string) => `Supprimer ${name} et toutes ses questions ?`,
    deleteLearnerYes: "Supprimer",
    deleteLearnerAria: (name: string) => `Supprimer l'apprenant ${name}`,
    learnerPrivacyNote:
      "Les profils séparent les conversations sur un appareil partagé. Ce n'est pas un mot de passe — toute personne qui tient ce téléphone peut choisir n'importe quel nom. Tout reste sur cet appareil.",
    learnerUnknown: "Apprenant inconnu",

    signalDetected: "SIGNAL DÉTECTÉ",
    noSignal: "AUCUN SIGNAL",
    syncingAvailable: "synchronisation possible",
    runsOnDevice: "le tuteur fonctionne sur cet appareil",

    chapters: (n: number) => `${n} chapitres`,
    grounded: "vérifié",
    hasVideo: "contient une vidéo",

    messages: (n: number) => `${n} messages`,
    noQuestionsYet: "Aucune question dans ce chapitre. Essayez-en une :",
    askAbout: (chapter: string) => `Posez une question sur ${chapter.toLowerCase()}…`,
    ask: "Demander",
    thinking: "le tuteur réfléchit…",
    confidence: "confiance",
    match: "corresp.",
    flagForReview: "signaler pour révision",
    flaggedForReview: "signalé à l'enseignant",

    provVerified: "Vérifié — contrôlé avec ta question",
    provTeacherVerified: "Vérifié par un enseignant",
    provFromExample: "Issu d'un exemple vérifié",
    provChecksPassed: "Calculs et unités vérifiés · raisonnement non validé",
    provChecksFailed: "⚠ Une vérification a échoué — transmis à ton enseignant",
    provGroundedUnchecked: "Basé sur le cours · non contrôlé par une personne",
    provUnchecked: "Réponse de l'IA · non contrôlée par une personne",
    provNoAnswer: "Pas de réponse — transmise à ton enseignant",
    provShowDetails: "détails",
    provHideDetails: "masquer",

    tierSolver: "solveur exact · sans modèle",
    tierLlm: "modèle sur l'appareil",
    tierBank: "banque de réponses vérifiées",
    tierNone: "aucun moteur",

    modelReady: "modèle prêt sur l'appareil",
    modelNotLoaded: "modèle non chargé",
    modelLoading: "chargement du modèle",
    unload: "décharger",
    unloadTitle:
      "Libère la mémoire utilisée par le modèle. Le téléchargement reste en cache.",
    alreadyDownloaded:
      "Déjà téléchargé sur cet appareil — le chargement ne consomme aucune donnée.",
    oneDownload: (mb: number) =>
      `Un seul téléchargement d'environ ${mb} Mo. Ensuite, il répond sans aucune connexion.`,
    loadModel: "Charger le modèle",
    downloadMb: (mb: number) => `Télécharger ${mb} Mo`,
    onDevice: "sur l'appareil",
    noWebgpu: "pas de webgpu sur cet appareil",
    noWebgpuBody:
      "L'Aptitude fonctionne quand même — elle s'appuie sur la banque de réponses vérifiées, qui n'a pas besoin de GPU. C'est le cas courant sur un téléphone partagé d'entrée de gamme, pas une installation défaillante.",

    lessonVideos: "Vidéos de cours",
    noVideos: (chapter: string) =>
      `Aucune vidéo pour ${chapter} pour l'instant. Les chapitres qui en ont une sont marqués d'un point dans la liste.`,
    availableOffline: "✓ disponible hors ligne",
    play: "lire",
    remove: "supprimer",
    download: (mb: number) => `télécharger ${mb} Mo`,

    setPinTitle: "Définir un code animateur",
    setPinBlurb:
      "La file de révision affiche les questions signalées de tous les apprenants, elle est donc protégée par un code. Choisis-en un maintenant — il est stocké uniquement sur cet appareil.",
    enterPinTitle: "Accès animateur",
    enterPinBlurb: "Saisis le code de cet appareil pour ouvrir la file de révision.",
    pinPlaceholder: "Code",
    pinPlaceholderNew: "Nouveau code",
    pinPlaceholderConfirm: "Confirme le code",
    setPinAction: "Définir le code",
    unlockAction: "Déverrouiller",
    pinChecking: "Vérification…",
    facilitatorUnlocked: "accès animateur déverrouillé",
    lockAgain: "verrouiller",
    pinWrong: "Ce code n'est pas correct.",
    pinMismatch: "Les deux codes ne correspondent pas.",
    pinDigitsOnly: "Chiffres uniquement.",
    pinLength: (min: number, max: number) => `Utilise entre ${min} et ${max} chiffres.`,
    pinRepeated: "Pas uniquement le même chiffre.",
    pinSequential: "Pas une suite de chiffres consécutifs.",
    pinInvalid: "Ce code ne peut pas être utilisé.",
    pinAttemptsLeft: (n: number) =>
      `${n} tentative${n === 1 ? "" : "s"} restante${n === 1 ? "" : "s"} avant un délai d'attente.`,
    pinLockedOut: (seconds: number) =>
      `Trop de tentatives. Réessaie dans ${seconds} s. Le délai double à chaque fois.`,
    pinSetupNote:
      "Six chiffres minimum : quatre ne représentent qu'environ deux minutes de recherche pour qui extrait la valeur stockée. C'est une barrière contre un élève curieux, pas une véritable sécurité — toute personne qui tient cet appareil pourrait finir par la franchir.",
    pinForgotNote:
      "Aucune réinitialisation depuis l'application. Sans serveur, une réinitialisation accessible ici ne serait qu'une seconde porte ouverte. Un code oublié implique d'effacer les données de ce site dans les réglages du navigateur, ce qui supprime aussi les conversations enregistrées sur cet appareil.",

    teacherReview: "Révision enseignant",
    teacherReviewBlurb:
      "Réponses peu fiables que le tuteur a lui-même signalées, en attente d'approbation ou de correction — fonctionne entièrement hors ligne, se synchronise au retour du réseau.",
    nothingPending: "Rien à réviser pour le moment.",
    flaggedAt: "signalé",
    writeCorrection: "Écrivez une correction (facultatif)…",
    approveAsIs: "Approuver tel quel",
    saveAndTeach: "Enregistrer + apprendre au tuteur",
    saving: "Enregistrement…",
    resolved: "traité",
    inAnswerBank: "dans la banque",

    tutorMethod: "MÉTHODE",
    tutorAnswer: "RÉPONSE",
    tutorCheckedLocally:
      "Vérifié avec chacun des nombres de ta question, sur cet appareil. Aucun modèle n'a été utilisé.",
    tutorNoVerifiedMethod:
      "Je n'ai pas de méthode vérifiée pour celle-ci, et je ne vais pas deviner \u2014 une question d'aptitude a une seule réponse défendable, et une méthode fausse qui a l'air juste est pire que pas de réponse. Je l'ai signalée à ton enseignant.",
    tutorMatchedExample: (q: string) => `Correspond à un exemple vérifié : « ${q} »`,
    tutorClosestExample: (q: string) =>
      `L'exemple vérifié le plus proche que j'ai est :\n\n« ${q} »`,
    tutorMayNotMatch:
      "Ce n'est peut-être pas le même type de problème que le tien, je l'ai donc signalé à ton enseignant pour vérification.",
    tutorTeacherVerified: "Vérifié par un enseignant de ton pod.",
    tutorCrossChapter: (chapter: string) =>
      `Remarque : cet exemple vient de « ${chapter} », pas du chapitre que tu as ouvert. Vérifie qu'il s'agit bien du même type de problème.`,
    tutorMethodFrom: (q: string) => `\u2014 Méthode tirée d'un exemple vérifié : « ${q} »`,
    tutorMethodFromIn: (chapter: string, q: string) =>
      `\u2014 Méthode tirée d'un exemple vérifié dans « ${chapter} » : « ${q} »`,
    tutorModelNotLoaded: (subject: string) =>
      `Les questions de ${subject} nécessitent le modèle embarqué, qui n'est pas encore chargé sur cet appareil. Charge-le depuis la bannière ci-dessus \u2014 un seul téléchargement, puis il fonctionne sans aucune connexion.`,
    tutorGenerationFailed:
      "Le modèle embarqué s'est arrêté en cours de route. Essaie de reposer la question.",
    tutorSearchFailed: (reason: string) =>
      `Je n'ai pas pu interroger la banque de réponses vérifiées sur cet appareil, donc je ne devine pas. Ta question a été enregistrée pour un enseignant.\n\nRaison : ${reason}`,
    tutorChapterGone: "Ce chapitre n'existe plus sur cet appareil.",
    tutorExchangeFailed:
      "Un problème est survenu lors de l'enregistrement de cet échange. Rien de ce qui était déjà enregistré n'a été perdu.",
    tutorBankNotReady: (indexed: number, total: number) =>
      `La banque de réponses vérifiées n'est pas encore interrogeable sur cet appareil (${indexed} éléments indexés sur ${total}), donc je ne devine pas. ` +
      `Le modèle de recherche ne se télécharge qu'une seule fois — connecte-toi brièvement et repose la question, puis il fonctionnera hors ligne. ` +
      `Les suites numériques fonctionnent déjà sans aucun modèle.`,

    diagTitle: "Diagnostic de l'appareil",
    diagBlurb:
      "Informations techniques sur cet appareil, pour le dépannage d'un téléphone de pod. Ne contient aucun prénom, question ni réponse.",
    diagCopy: "copier",
    diagCopied: "copié",

    readyTitle: "Préparation hors ligne",
    readyRecheck: "revérifier",
    readyVerdictYes: "Prêt pour un usage hors ligne",
    readyVerdictNo: "Pas prêt pour un usage hors ligne",
    readyVerdictYesBody:
      "Tout ce dont cet appareil a besoin pour enseigner sans connexion est stocké localement. Les éléments optionnels ci-dessous apporteraient davantage.",
    readyVerdictNoBody: (missing: string) =>
      `Manquant : ${missing}. Connecte-toi brièvement et corrige les points ci-dessous avant d'emporter cet appareil dans une zone sans réseau.`,
    readyOptional: "optionnel",
    readySw: "L'application démarre hors ligne",
    readyPersist: "Navigateur invité à ne pas supprimer ces données",
    readyBank: "Banque de réponses vérifiées indexée",
    readyNotes: "Matériel de référence des chapitres indexé",
    readySearchModel: "Modèle de recherche téléchargé",
    readyLanguageModel: "Modèle de langage embarqué téléchargé",
    readyVideos: "Vidéos de cours téléchargées",
    readyStorage: "Espace libre",
    readyYes: "oui",
    readyNo: "non",
    readyCachedFiles: (n: number) => `${n} fichiers`,
    readyFreeSpace: (size: string) => size,
    readyIndexNow: "Indexer maintenant",
    readyIndexing: "Indexation…",
    readyKeepData: "Demander la conservation",
    readyAsking: "Demande en cours…",
    readyNote:
      "Vérifié sur le stockage réel, pas supposé. Sans l'autorisation de conservation, un navigateur à court d'espace peut supprimer le modèle téléchargé et la banque indexée — sur un téléphone partagé presque plein, ce n'est pas hypothétique.",

    dashTitle: "Vue d'ensemble du pod",
    dashThisDeviceOnly: "cet appareil uniquement",
    dashAwaitingReview: "réponses en attente d'un animateur",
    dashLearners: "Apprenants",
    dashQuestionsToday: "Questions aujourd'hui",
    dashQuestionsTotal: "Questions au total",
    dashTeacherExemplars: "Exemples vérifiés",
    dashVerifiedCoverage: "Couverture vérifiée",
    dashVerifiedCaption:
      "Réponses issues du solveur exact ou de la banque de réponses vérifiées. Les autres viennent du modèle embarqué et personne ne les a contrôlées.",
    dashWhereAnswersCame: "Origine des réponses",
    dashNeedsAttention: "À surveiller",
    dashPendingN: (n: number) => `${n} en attente`,
    dashUncheckedN: (n: number) => `${n} non vérifiée${n === 1 ? "" : "s"}`,
    dashLearnerTable: "Apprenants sur cet appareil",
    dashColLearner: "Apprenant",
    dashColQuestions: "Posées",
    dashColPending: "En attente",
    dashColUnchecked: "Non vérifiées",
    dashColLastAsked: "Dernière question",
    dashToday: "aujourd'hui",
    dashYesterday: "hier",
    dashDaysAgo: (n: number) => `il y a ${n} j`,
    dashNeverAsked: "pas encore",
    dashEmpty:
      "Aucune question sur cet appareil pour l'instant. Ces chiffres se remplissent à mesure que les apprenants utilisent le tuteur, et s'étendent au pod dès que tu importes le fichier de synchronisation d'un autre appareil.",

    syncTitle: "Synchronisation du pod",
    syncBlurb:
      "Transfère les questions signalées et les corrections vérifiées de cet appareil vers un autre téléphone du pod. Fonctionne sans réseau — exporte un fichier, importe-le sur l'autre appareil.",
    syncThisDevice: "cet appareil",
    syncExportPending: (n: number) =>
      `Exporter ${n} changement${n === 1 ? "" : "s"} récent${n === 1 ? "" : "s"}`,
    syncNothingPending: "Rien de nouveau à exporter",
    syncExportAll: "Tout exporter",
    syncImport: "Importer depuis un autre appareil",
    syncReceived: "reçus",
    syncApplied: "appliqués",
    syncDuplicates: "déjà connus",
    syncSuperseded: "les nôtres conservés",
    syncNewExemplars: (n: number) =>
      `${n} exemple${n === 1 ? "" : "s"} vérifié${n === 1 ? "" : "s"} ${n === 1 ? "est arrivé et est" : "sont arrivés et sont"} désormais consultable${n === 1 ? "" : "s"} hors ligne sur cet appareil.`,
    syncNote:
      "L'importation ne supprime jamais le travail local : en cas de désaccord entre deux animateurs, une correction prime sur une approbation, et le résultat est le même quel que soit l'appareil qui importe en premier. Seuls les prénoms accompagnent un signalement, jamais la conversation d'un élève.",

    crashed: (label: string) => `${label} a cessé de fonctionner`,
    crashedBody:
      "Le reste de l'application fonctionne toujours, et rien de ce qui est enregistré sur cet appareil n'a été perdu.",
    tryAgain: "Réessayer",
  },
};

/**
 * No `as const` here, on purpose: it would narrow every value to its own
 * string literal, and the French dictionary would then fail to match the
 * English one's type. Widened to `string` the two are interchangeable, which
 * is the whole point — and TypeScript still catches a key present in one
 * locale and missing from the other.
 */
export type Strings = (typeof STRINGS)["en"];
