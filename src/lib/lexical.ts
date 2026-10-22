/**
 * Word-level search with no model.
 *
 * The semantic embedder is 150MB and optional. Lessons, teacher corrections
 * and quiz explanations have to be findable on a phone that never downloads
 * it, so this is the floor: tokenise, drop function words, weight rare words
 * more (BM25), and report how much of the question each document covers.
 *
 * Coverage matters more than the raw score for deciding what to SHOW as an
 * answer. A long note that mentions one of the student's words many times can
 * out-score a short note that contains all of them; the second is the answer.
 */

/** Function words in both UI languages. Small on purpose: content words in a
 *  science question are rarely on any stopword list worth shipping. */
const STOPWORDS = new Set(
  (
    "a an the of to in on at for from by with and or is are was were be been being it its this that these those " +
    "what which who whom why how when where does do did can could should would will shall may might must " +
    "i you he she we they me my your our their his her them us not no yes than then so if as into about " +
    "explain describe define tell give list name state find show please there here some any all each one two " +
    "le la les un une des du de d l et ou est sont etre a au aux en dans sur pour par avec ce cet cette ces " +
    "que qui quoi quel quelle quels quelles pourquoi comment quand ou ne pas plus se sa son ses leur leurs " +
    "qu explique decris definis donne cite " +
    // Question framing rather than topic: "the difference between X and Y" is
    // about X and Y. Weighted by rarity, these would otherwise dominate.
    "difference between versus vs compare compared called important actually job role function happen happens " +
    "differences entre role fonction"
  ).split(" ")
);

/** Lowercase, strip accents, split on anything that is not a letter or digit. */
export function tokens(text: string): string[] {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length > 1 && !STOPWORDS.has(w))
    .map(stem);
}

/**
 * Just enough stemming to match "cells" with "cell" and "enzymes" with
 * "enzyme". Anything cleverer starts merging words that mean different
 * things ("organ" and "organism"), which costs more than it finds.
 */
function stem(w: string): string {
  if (w.length > 4 && w.endsWith("ies")) return `${w.slice(0, -3)}y`;
  if (w.length > 4 && w.endsWith("es") && /(ss|sh|ch|x)es$/.test(w)) return w.slice(0, -2);
  if (w.length > 3 && w.endsWith("s") && !w.endsWith("ss") && !w.endsWith("us") && !w.endsWith("is")) {
    return w.slice(0, -1);
  }
  return w;
}

export interface LexicalDoc {
  id: string;
  text: string;
}

export interface LexicalHit<T extends LexicalDoc> {
  doc: T;
  score: number;
  /**
   * Share of the query found in this document, each word weighted by how
   * rare it is (IDF). "mitochondria" counts for more than "function", and a
   * word the corpus has never seen counts most of all — so a question about
   * something not covered cannot reach high coverage on its common words.
   */
  coverage: number;
  /** How many distinct query words matched. */
  matched: number;
}

export interface LexicalIndex<T extends LexicalDoc> {
  search(query: string, limit?: number): Array<LexicalHit<T>>;
  size: number;
}

/** BM25 with the usual constants. Built once per document set; cheap to rebuild. */
export function buildIndex<T extends LexicalDoc>(docs: T[]): LexicalIndex<T> {
  const k1 = 1.2;
  const b = 0.75;
  const termFreqs = docs.map((d) => {
    const tf = new Map<string, number>();
    for (const w of tokens(d.text)) tf.set(w, (tf.get(w) ?? 0) + 1);
    return tf;
  });
  const lengths = termFreqs.map((tf) => [...tf.values()].reduce((a, n) => a + n, 0));
  const avgLength = lengths.reduce((a, n) => a + n, 0) / Math.max(docs.length, 1);
  const docFreq = new Map<string, number>();
  for (const tf of termFreqs) for (const w of tf.keys()) docFreq.set(w, (docFreq.get(w) ?? 0) + 1);
  const idf = (w: string) => {
    const n = docFreq.get(w) ?? 0;
    return Math.log(1 + (docs.length - n + 0.5) / (n + 0.5));
  };

  return {
    size: docs.length,
    search(query, limit = 5) {
      const q = [...new Set(tokens(query))];
      if (q.length === 0) return [];
      const weightTotal = q.reduce((sum, w) => sum + idf(w), 0);
      const hits: Array<LexicalHit<T>> = [];
      docs.forEach((doc, i) => {
        const tf = termFreqs[i];
        let score = 0;
        let matched = 0;
        let weight = 0;
        for (const w of q) {
          const f = tf.get(w);
          if (!f) continue;
          matched++;
          weight += idf(w);
          score += (idf(w) * f * (k1 + 1)) / (f + k1 * (1 - b + (b * lengths[i]) / (avgLength || 1)));
        }
        if (matched > 0) hits.push({ doc, score, matched, coverage: weight / weightTotal });
      });
      return hits.sort((x, y) => y.coverage - x.coverage || y.score - x.score).slice(0, limit);
    },
  };
}

/**
 * Whether two questions are the same question, worded slightly differently.
 *
 * Used to serve a teacher's correction without the embedder. Deliberately
 * strict — Jaccard over content words — because serving a teacher's answer
 * to a DIFFERENT question under a "Verified by a teacher" badge would be the
 * worst kind of wrong: confident, and attributed to a person.
 */
export function sameQuestion(a: string, b: string, threshold = 0.8): boolean {
  const ta = new Set(tokens(a));
  const tb = new Set(tokens(b));
  if (ta.size === 0 || tb.size === 0) return false;
  // Numbers must agree exactly: "area of a circle of radius 7" and "... 5"
  // share every word but are different questions.
  const numsA = a.match(/\d+(?:[.,]\d+)?/g)?.join(" ") ?? "";
  const numsB = b.match(/\d+(?:[.,]\d+)?/g)?.join(" ") ?? "";
  if (numsA !== numsB) return false;
  let inter = 0;
  for (const w of ta) if (tb.has(w)) inter++;
  return inter / (ta.size + tb.size - inter) >= threshold;
}
