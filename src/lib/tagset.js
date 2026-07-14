// Derives Biber-relevant fine-grained tags from wink-nlp's Universal POS + lemma.
// wink gives UPOS only, so tense / participle / contraction are reconstructed here.

// Irregular verbs: lemma -> { past: [...], pp: [...] }
const IRREG = {
  be:['was','were','been'], have:['had','had'], do:['did','done'], go:['went','gone'],
  say:['said','said'], make:['made','made'], take:['took','taken'], come:['came','come'],
  see:['saw','seen'], know:['knew','known'], get:['got','gotten','got'], give:['gave','given'],
  find:['found','found'], think:['thought','thought'], tell:['told','told'], become:['became','become'],
  show:['showed','shown'], leave:['left','left'], feel:['felt','felt'], put:['put','put'],
  bring:['brought','brought'], begin:['began','begun'], keep:['kept','kept'], hold:['held','held'],
  write:['wrote','written'], stand:['stood','stood'], hear:['heard','heard'], let:['let','let'],
  mean:['meant','meant'], set:['set','set'], meet:['met','met'], run:['ran','run'],
  pay:['paid','paid'], sit:['sat','sat'], speak:['spoke','spoken'], lie:['lay','lain'],
  lead:['led','led'], read:['read','read'], grow:['grew','grown'], lose:['lost','lost'],
  fall:['fell','fallen'], send:['sent','sent'], build:['built','built'], understand:['understood','understood'],
  draw:['drew','drawn'], break:['broke','broken'], spend:['spent','spent'], cut:['cut','cut'],
  rise:['rose','risen'], drive:['drove','driven'], buy:['bought','bought'], wear:['wore','worn'],
  choose:['chose','chosen'], seek:['sought','sought'], throw:['threw','thrown'], catch:['caught','caught'],
  deal:['dealt','dealt'], win:['won','won'], forget:['forgot','forgotten'], sell:['sold','sold'],
  eat:['ate','eaten'], teach:['taught','taught'], fight:['fought','fought'], hide:['hid','hidden'],
  hurt:['hurt','hurt'], cost:['cost','cost'], drink:['drank','drunk'], sing:['sang','sung'],
  sink:['sank','sunk'], swim:['swam','swum'], ring:['rang','rung'], shake:['shook','shaken'],
  steal:['stole','stolen'], strike:['struck','struck'], swear:['swore','sworn'], tear:['tore','torn'],
  wake:['woke','woken'], bear:['bore','borne'], beat:['beat','beaten'], bind:['bound','bound'],
  bite:['bit','bitten'], bleed:['bled','bled'], blow:['blew','blown'], breed:['bred','bred'],
  burst:['burst','burst'], cast:['cast','cast'], cling:['clung','clung'], creep:['crept','crept'],
  dig:['dug','dug'], drag:['dragged','dragged'], fly:['flew','flown'], forbid:['forbade','forbidden'],
  freeze:['froze','frozen'], hang:['hung','hung'], hit:['hit','hit'], lay:['laid','laid'],
  lend:['lent','lent'], light:['lit','lit'], quit:['quit','quit'], ride:['rode','ridden'],
  shine:['shone','shone'], shoot:['shot','shot'], shut:['shut','shut'], sleep:['slept','slept'],
  slide:['slid','slid'], spin:['spun','spun'], split:['split','split'], spread:['spread','spread'],
  spring:['sprang','sprung'], stick:['stuck','stuck'], sting:['stung','stung'], strive:['strove','striven'],
  sweep:['swept','swept'], swing:['swung','swung'], weep:['wept','wept'], wind:['wound','wound'],
  withdraw:['withdrew','withdrawn'], arise:['arose','arisen'], awake:['awoke','awoken'],
  bend:['bent','bent'], bet:['bet','bet'], feed:['fed','fed'], flee:['fled','fled'],
  forgive:['forgave','forgiven'], overcome:['overcame','overcome'], prove:['proved','proven','proved'],
  seek2:[], shrink:['shrank','shrunk'], slay:['slew','slain'], sow:['sowed','sown'],
  weave:['wove','woven'], wet:['wet','wet'], upset:['upset','upset'], undergo:['underwent','undergone']
};

const PAST_SET = new Set(), PP_SET = new Set();
for (const k in IRREG) {
  const f = IRREG[k];
  if (f[0]) PAST_SET.add(f[0]);
  for (let i = 1; i < f.length; i++) PP_SET.add(f[i]);
}
// forms that are both
['read','put','set','cut','let','hit','cost','hurt','shut','split','spread','burst','cast','beat','bet','quit','wet','upset'].forEach(w => { PAST_SET.add(w); PP_SET.add(w); });

const BE = new Set(['be','am','is','are','was','were','been','being',"'s","'m","'re"]);
const HAVE = new Set(['have','has','had','having',"'ve","'d"]);
const DO = new Set(['do','does','did','doing','done']);
const MODALS = new Set(['can','could','may','might','must','shall','should','will','would','ought',"'ll","'d",'wo','ca','sha']);
const NEG = new Set(['not',"n't",'nt']);

// Build an enriched token stream. Each token: {t, low, lemma, upos, tag, isWord}
export function tag(tokens) {
  const N = tokens.length;
  for (let i = 0; i < N; i++) {
    const tk = tokens[i];
    const low = tk.low, lem = tk.lemma, u = tk.upos;
    let tag = u;

    if (NEG.has(low)) tag = 'XX0';
    else if (MODALS.has(low) && (u === 'AUX' || u === 'VERB' || u === 'PART')) tag = 'MD';
    else if (u === 'VERB' || u === 'AUX') {
      const irr = IRREG[lem];
      let form = null;
      if (low === lem) form = 'VB';                                  // base / present plural
      else if (irr && irr[0] === low && irr.slice(1).includes(low)) form = 'VBD_OR_VBN';
      else if (irr && irr[0] === low) form = 'VBD';
      else if (irr && irr.slice(1).includes(low)) form = 'VBN';
      else if (/(?:^|[a-z])ing$/.test(low)) form = 'VBG';
      else if (/ed$/.test(low)) form = 'VBD_OR_VBN';
      else if (/s$/.test(low)) form = 'VBZ';
      else if (PAST_SET.has(low)) form = 'VBD';
      else if (PP_SET.has(low)) form = 'VBN';
      else form = 'VB';

      if (low === 'was' || low === 'were' || low === 'had' || low === 'did') form = 'VBD_AUX';
      if (low === 'is' || low === 'am' || low === 'are' || low === 'has' || low === 'does' ||
          low === "'s" || low === "'m" || low === "'re" || low === "'ve") form = 'VBP';

      if (form === 'VBD_OR_VBN' || form === 'VBD_AUX') {
        // participle if a form of BE/HAVE/GET precedes within 3 slots (adverbs/negation skipped)
        let aux = false;
        for (let k = i - 1, hops = 0; k >= 0 && hops < 3; k--, hops++) {
          const p = tokens[k];
          if (p.upos === 'ADV' || NEG.has(p.low)) continue;
          if (BE.has(p.low) || HAVE.has(p.low) || p.lemma === 'get' || p.lemma === 'be' || p.lemma === 'have') aux = true;
          break;
        }
        if (form === 'VBD_AUX') tag = aux && HAVE.has(low) ? 'VBN' : 'VBD';
        else tag = aux ? 'VBN' : 'VBD';
      } else tag = form;
    }
    else if (u === 'NOUN') tag = /(?:tions?|ments?|nesses?|ness|ities|ity)$/.test(low) ? 'NOMZ'
           : /ing$/.test(low) ? 'GER' : 'NN';
    else if (u === 'PROPN') tag = 'NNP';
    else if (u === 'ADJ') tag = 'JJ';
    else if (u === 'ADV') tag = 'RB';
    else if (u === 'ADP') tag = 'IN';
    else if (u === 'PRON') tag = 'PRP';
    else if (u === 'DET') tag = 'DT';
    else if (u === 'SCONJ') tag = 'SC';
    else if (u === 'CCONJ') tag = 'CC';
    else if (u === 'PART') tag = low === 'to' ? 'TO' : 'RP';
    else if (u === 'PUNCT') tag = 'PUNCT';

    tk.tag = tag;
    tk.isWord = u !== 'PUNCT' && u !== 'SYM' && u !== 'SPACE' && /[a-z]/i.test(tk.t);
  }
  return tokens;
}

export { BE, HAVE, DO, MODALS, NEG };
