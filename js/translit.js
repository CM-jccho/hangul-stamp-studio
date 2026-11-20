/* ============================================================
   Hangul Stamp Studio — Latin → Hangul names engine
   Dictionary first (natural spellings), sound rules as fallback.
   ============================================================ */
(function () {
  'use strict';

  /* ---------- Hangul building blocks ---------- */
  const CHO = ['ㄱ','ㄲ','ㄴ','ㄷ','ㄸ','ㄹ','ㅁ','ㅂ','ㅃ','ㅅ','ㅆ','ㅇ','ㅈ','ㅉ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ'];
  const JUNG = ['ㅏ','ㅐ','ㅑ','ㅒ','ㅓ','ㅔ','ㅕ','ㅖ','ㅗ','ㅘ','ㅙ','ㅚ','ㅛ','ㅜ','ㅝ','ㅞ','ㅟ','ㅠ','ㅡ','ㅢ','ㅣ'];
  const JONG = ['','ㄱ','ㄲ','ㄳ','ㄴ','ㄵ','ㄶ','ㄷ','ㄹ','ㄺ','ㄻ','ㄼ','ㄽ','ㄾ','ㄿ','ㅀ','ㅁ','ㅂ','ㅄ','ㅅ','ㅆ','ㅇ','ㅈ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ'];
  const VOWELS = new Set(JUNG);
  const CODA_FIX = { 'ㅅ':'ㅅ','ㅆ':'ㅅ','ㅈ':'ㄷ','ㅊ':'ㄷ','ㅋ':'ㄱ','ㅌ':'ㄷ','ㅍ':'ㅂ','ㅎ':'ㄷ','ㅂ':'ㅂ','ㄷ':'ㄷ','ㄱ':'ㄱ','ㄹ':'ㄹ','ㅁ':'ㅁ','ㄴ':'ㄴ','ㅇ':'ㅇ','ㅃ':'ㅂ','ㄸ':'ㄷ','ㅉ':'ㅈ' };

  function compose1(cho, jung, jong) {
    const c = CHO.indexOf(cho), v = JUNG.indexOf(jung), j = JONG.indexOf(jong || '');
    if (c < 0 || v < 0) return '';
    return String.fromCharCode(0xAC00 + c * 588 + v * 28 + Math.max(j, 0));
  }

  function isSyl(ch) {
    const n = ch.charCodeAt(0);
    return ch.length === 1 && n >= 0xAC00 && n <= 0xD7A3;
  }

  /* Assemble a jamo sequence (may contain ready syllables) into hangul. */
  function compose(items) {
    const out = [];
    let i = 0;
    const isCons = (x) => CHO.indexOf(x) >= 0;
    while (i < items.length) {
      const cur = items[i];
      if (isSyl(cur)) { out.push({ syl: cur }); i++; continue; }
      if (cur === '') { i++; continue; }
      if (VOWELS.has(cur)) {
        let jong = '';
        i++;
        if (i < items.length && isCons(items[i]) && !(i + 1 < items.length && VOWELS.has(items[i + 1]))) {
          jong = CODA_FIX[items[i]] || ''; i++;
        }
        out.push({ cho: 'ㅇ', jung: cur, jong: jong });
        continue;
      }
      // consonant
      const cho = cur; i++;
      if (i < items.length && VOWELS.has(items[i])) {
        const jung = items[i]; i++;
        let jong = '';
        if (i < items.length && isCons(items[i])) {
          const nxt = items[i + 1];
          if (!(nxt && VOWELS.has(nxt))) {
            jong = CODA_FIX[items[i]] || ''; i++;
          }
        }
        out.push({ cho: cho, jung: jung, jong: jong });
      } else {
        const prev = out[out.length - 1];
        const coda = CODA_FIX[cho];
        if (prev && prev.cho && !prev.jong && coda) { prev.jong = coda; }
        else { out.push({ cho: cho, jung: 'ㅡ', jong: '' }); }
      }
    }
    return out.map((o) => (o.syl ? o.syl : compose1(o.cho, o.jung, o.jong))).join('');
  }

  /* ---------- Curated names ---------- */
  const N = {};
  function add(entry) { // entry: {es, pt, en, any}
    Object.keys(entry).forEach((k) => {
      if (k === 'es' || k === 'pt' || k === 'en' || k === 'any') {
        const list = Array.isArray(entry[k]) ? entry[k] : [entry[k]];
        list.forEach((v) => {
          const key = normalize(v[0]) + '|' + k;
          if (k === 'any' && N[key]) return; // first neutral spelling wins
          N[key] = { hangul: v[1] || v[0], lang: k === 'any' ? 'generic' : k };
        });
      }
    });
  }
  function norm(s) { return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim(); }
  function normalize(s) { return norm(s); }

  // [latin, hangul] pairs
  add({ any: [
    // Spanish / Latin America
    ['Sofia','소피아'], ['Sofía','소피아'], ['Mateo','마테오'], ['Valentina','발렌티나'],
    ['Gabriel','가브리엘'], ['Camila','카밀라'], ['Santiago','산티아고'], ['Isabella','이사벨라'],
    ['Isabela','이자벨라'], ['Sebastian','세바스티안'], ['Sebastián','세바스티안'], ['Martina','마르티나'],
    ['Diego','디에고'], ['Juan','후안'], ['Jose','호세'], ['José','호세'], ['Maria','마리아'], ['María','마리아'],
    ['Ana','아나'], ['Pedro','페드로'], ['Luisa','루이사'], ['Carlos','카를로스'], ['Lucia','루시아'], ['Lucía','루시아'],
    ['Miguel','미겔'], ['Daniel','다니엘'], ['Daniela','다니엘라'], ['Andres','안드레스'], ['Andrés','안드레스'],
    ['Paula','파울라'], ['Andrea','안드레아'], ['Jorge','호르헤'], ['Alejandro','알레한드로'], ['Fernanda','페르난다'],
    ['Ricardo','리카르도'], ['Javier','하비에르'], ['Nicolas','니콜라스'], ['Nicolás','니콜라스'], ['Agustin','아구스틴'],
    ['Agustín','아구스틴'], ['Benjamin','벤하민'], ['Benjamín','벤하민'], ['Emilia','에밀리아'], ['Renata','레나타'],
    ['Ximena','히메나'], ['Regina','레히나'], ['Julieta','훌리에타'], ['Rodrigo','로드리고'], ['Tomas','토마스'], ['Tomás','토마스'],
    ['Luis','루이스'], ['Antonio','안토니오'], ['Francisco','프란시스코'], ['Manuel','마누엘'], ['Carmen','카르멘'],
    ['Rosa','로사'], ['Elena','엘레나'], ['Pablo','파블로'], ['Raul','라울'], ['Raúl','라울'], ['Ruben','루벤'], ['Rubén','루벤'],
    ['Hugo','우고'], ['Marta','마르타'], ['Eva','에바'], ['Nora','노라'], ['Lara','라라'], ['Marcos','마르코스'],
    ['Lucas','루카스'], ['Cristian','크리스티안'], ['Cristobal','크리스토발'], ['Esteban','에스테반'], ['Felipe','펠리페'],
    ['Ignacio','이그나시오'], ['Matias','마티아스'], ['Matías','마티아스'], ['Joaquin','호아킨'], ['Joaquín','호아킨'],
    ['Facundo','파쿤도'], ['Lautaro','라우타로'], ['Bautista','바우티스타'], ['Maximo','막시모'], ['Máximo','막시모'],
    ['Lorenzo','로렌소'], ['Catalina','카탈리나'], ['Antonella','안토넬라'], ['Guadalupe','과달루페'], ['Mariana','마리아나'],
    ['Adriana','아드리아나'], ['Gabriela','가브리엘라'], ['Veronica','베로니카'], ['Verónica','베로니카'], ['Patricia','파트리시아'],
    ['Monica','모니카'], ['Mónica','모니카'], ['Silvia','실비아'], ['Teresa','테레사'], ['Beatriz','베아트리스'],
    ['Ines','이네스'], ['Inés','이네스'], ['Rocio','로시오'], ['Rocío','로시오'], ['Paloma','팔로마'], ['Soledad','솔레다드'],
    ['Consuelo','콘수엘로'], ['Julián','훌리안'], ['Julian','훌리안'], ['Julia','훌리아'], ['Iker','이케르'], ['Rafael','라파엘'],
    ['Alba','알바'], ['Alonso','알론소'], ['Amparo','암파로'], ['Angel','앙헬'], ['Ángel','앙헬'], ['Beatris','베아트리스'],
    ['Camilo','카밀로'], ['Carolina','카롤리나'], ['Cecilia','세실리아'], ['Clara','클라라'], ['Cristina','크리스티나'],
    ['Diana','디아나'], ['Dolores','돌로레스'], ['Eduardo','에두아르도'], ['Elias','엘리아스'], ['Elías','엘리아스'],
    ['Emiliano','에밀리아노'], ['Enrique','엔리케'], ['Esperanza','에스페란사'], ['Fabian','파비안'], ['Fabiola','파비올라'],
    ['Fernando','페르난도'], ['Gloria','글로리아'], ['Gonzalo','곤살로'], ['Gustavo','구스타보'], ['Hector','엑토르'],
    ['Héctor','엑토르'], ['Irene','이레네'], ['Ivan','이반'], ['Iván','이반'], ['Jaime','하이메'], ['Jazmin','하스민'],
    ['Jesús','헤수스'], ['Jesus','헤수스'], ['Jimena','히메나'], ['Josefina','호세피나'], ['Juana','후아나'], ['Leonardo','레오나르도'],
    ['Leticia','레티시아'], ['Lorena','로레나'], ['Lourdes','루르데스'], ['Mabel','마벨'], ['Magdalena','막달레나'],
    ['Marcela','마르셀라'], ['Marco','마르코'], ['Mateus','마테우스'], ['Mercedes','메르세데스'], ['Miriam','미리암'],
    ['Natalia','나탈리아'], ['Nataly','나탈리'], ['Octavio','옥타비오'], ['Olga','올가'], ['Oscar','오스카르'], ['Óscar','오스카르'],
    ['Pilar','필라르'], ['Ramon','라몬'], ['Ramón','라몬'], ['Raquel','라켈'], ['Rocio','로시오'], ['Rosario','로사리오'],
    ['Salvador','살바도르'], ['Sandra','산드라'], ['Sara','사라'], ['Saul','사울'], ['Saúl','사울'], ['Sergio','세르히오'],
    ['Sonia','소니아'], ['Susana','수사나'], ['Tatiana','타티아나'], ['Valeria','발레리아'], ['Vanessa','바네사'],
    ['Victor','빅토르'], ['Víctor','빅토르'], ['Violeta','비올레타'], ['Yolanda','욜란다'], ['Zoé','소에'], ['Zoe','소에'],

    // Portuguese / Brazil
    ['Joao','주앙'], ['João','주앙'], ['Matheus','마테우스'], ['Guilherme','기예르메'], ['Enzo','엔조'], ['Davi','다비'],
    ['Larissa','라리사'], ['Bruno','브루누'], ['Thiago','티아고'], ['Tiago','티아고'], ['Vinicius','비니시우스'],
    ['Vinícius','비니시우스'], ['Marcelo','마르셀루'], ['Thais','타히스'], ['Thaís','타히스'], ['Leticia','레치시아'],
    ['Letícia','레치시아'], ['Luana','루아나'], ['Bruna','브루나'], ['Amanda','아만다'], ['Jessica','제시카'], ['Jéssica','제시카'],
    ['Douglas','도글라스'], ['Eduarda','에두아르다'], ['Fabio','파비우'], ['Fábio','파비우'], ['Caio','카이우'], ['Murilo','무릴루'],
    ['Otavio','오타비우'], ['Otávio','오타비우'], ['Samuel','사무엘'], ['Vitor','비토르'], ['Raissa','라이사'], ['Raíssa','라이사'],
    ['Heloisa','엘로이자'], ['Heloísa','엘로이자'], ['Yasmin','야스민'], ['Alice','알리세'], ['Laura','라우라'], ['Cecilia','세실리아'],
    ['Cecília','세실리아'], ['Arthur','아르투르'], ['Bernardo','베르나르두'], ['Heitor','에이토르'], ['Theo','테오'], ['Théo','테오'],
    ['Rafaela','라파엘라'], ['Sergio','세르지우'], ['Rodrigo','로드리구'], ['Andre','안드레'], ['André','안드레'], ['Renato','레나투'],
    ['Claudio','클라우지우'], ['Cláudio','클라우지우'], ['Paulo','파울루'], ['Marcio','마르시우'], ['Márcio','마르시우'],
    ['Suzana','수자나'], ['Diego','디에구'], ['Gustavo','구스타부'], ['Felipe','펠리피'], ['Rafael','라파엘'], ['Joana','주아나'],
    ['Mariá','마리아'], ['Ines','이네스'], ['Isaac','이자크'], ['Joaquim','주아킹'], ['Tiago','티아구'],

    // English / international
    ['Michael','마이클'], ['Jennifer','제니퍼'], ['David','데이비드'], ['Sarah','사라'], ['Emily','에밀리'],
    ['James','제임스'], ['Olivia','올리비아'], ['Noah','노아'], ['Emma','엠마'], ['Liam','리암'], ['Mia','미아'],
    ['Chloe','클로이'], ['Grace','그레이스'], ['Ethan','이든'], ['Leo','레오'], ['Maya','마야'], ['Nina','니나'],
    ['Alex','알렉스'], ['Chris','크리스'], ['Anne','앤'], ['Jane','제인'], ['John','존'], ['Peter','피터'], ['Robert','로버트'],
    ['William','윌리엄'], ['Elizabeth','엘리자베스'], ['Hannah','한나'], ['Rachel','레이철'], ['Ryan','라이언'], ['Jason','제이슨'],
    ['Kevin','케빈'], ['Brian','브라이언'], ['Eric','에릭'], ['Adam','아담'], ['Nathan','네이선'], ['Sophie','소피'], ['Sophia','소피아'],
    ['Amelia','아멜리아'], ['Charlotte','샬럿'], ['Henry','헨리'], ['Jack','잭'], ['Lily','릴리'], ['Rose','로즈'], ['Max','맥스'],
    ['Sam','샘'], ['Tom','톰'], ['Ben','벤'], ['Kate','케이트'], ['Ella','엘라'], ['Zoe','조이'], ['Aiden','에이든'], ['Mason','메이슨'],
    ['Lucas','루카스'], ['Leah','레아'], ['Anna','안나'], ['Eva','에바'], ['Ian','이안'], ['Owen','오언'], ['Luke','루크'],
    ['Isaac','아이작'], ['Nora','노라'], ['Mila','밀라'], ['Luna','루나'], ['Aria','아리아'], ['Elena','엘레나'], ['Dylan','딜런'],
    ['Marco','마르코'], ['Nico','니코'], ['Luca','루카'], ['Mila','밀라'], ['Sara','사라'], ['Ruth','루스'], ['Naomi','나오미'],
    ['Julia','줄리아'], ['Daniel','대니얼'], ['Thomas','토머스'], ['Paul','폴'], ['Mark','마크'], ['Anna','안나'], ['Maria','마리아']
  ] });

  /* Language-specific spellings that differ from the neutral list */
  add({ pt: [
    ['Sofia','소피아'], ['Mateo','마테우'], ['Valentina','발렌치나'], ['Gabriel','가브리에우'], ['Camila','카밀라'],
    ['Diego','디에구'], ['Bruno','브루누'], ['Rodrigo','로드리구'], ['Marcelo','마르셀루'], ['Felipe','펠리피'],
    ['Gustavo','구스타부'], ['Rafael','하파엘'], ['Rafaela','하파엘라'], ['Renato','레나투'], ['Claudio','클라우지우'],
    ['Paulo','파울루'], ['Marcio','마르시우'], ['Sergio','세르지우'], ['Julia','줄리아'], ['Juliana','줄리아나'],
    ['Daniel','다니에우'], ['Miguel','미게우'], ['Andre','안드레'], ['André','안드레'], ['Vitor','비토르'],
    ['Tiago','티아고'], ['Thiago','티아고'], ['Joao','주앙'], ['João','주앙'], ['Samuel','사무에우'],
    ['Gabriela','가브리에라'], ['Daniela','다니에라'], ['Beatriz','베아트리스'], ['Lucas','루카스'],
    ['Lorenzo','로렌수'], ['Otavio','오타비우'], ['Otávio','오타비우'], ['Bernardo','베르나르두'], ['Arthur','아르투르'],
    ['Theo','테오'], ['Cecilia','세시리아'], ['Cecília','세시리아'], ['Murilo','무릴루'], ['Caio','카이우'],
    ['Fabio','파비우'], ['Fábio','파비우'], ['Douglas','도글라스'], ['Eduarda','에두아르다'], ['Amanda','아만다'],
    ['Larissa','라리사'], ['Luana','루아나'], ['Bruna','브루나'], ['Heloisa','엘로이자'], ['Heloísa','엘로이자'],
    ['Joana','주아나'], ['Joaquim','주아킹'], ['Isaac','이자크'], ['Laura','라우라'], ['Alice','알리세'],
    ['Isabela','이자벨라'], ['Matheus','마테우스'], ['Vinicius','비니시우스'], ['Vinícius','비니시우스'], ['Rafael','하파엘']
  ] });
  add({ es: [
    ['Julia','훌리아'], ['Julian','훌리안'], ['Julián','훌리안'], ['Jose','호세'], ['José','호세'], ['Julio','훌리오'],
    ['Jesus','헤수스'], ['Jesús','헤수스'], ['Javier','하비에르'], ['Jorge','호르헤'], ['Juan','후안'], ['Jaime','하이메'],
    ['Jimena','히메나'], ['Ximena','히메나'], ['Regina','레히나'], ['Rocio','로시오'], ['Rocío','로시오'], ['Rosa','로사'],
    ['Rodrigo','로드리고'], ['Ricardo','리카르도'], ['Santiago','산티아고'], ['Sebastian','세바스티안'], ['Sebastián','세바스티안'],
    ['Valentina','발렌티나'], ['Mateo','마테오'], ['Camila','카밀라'], ['Sofia','소피아'], ['Sofía','소피아'],
    ['Gabriel','가브리엘'], ['Gabriela','가브리엘라'], ['Diego','디에고'], ['Miguel','미겔'], ['Carlos','카를로스'],
    ['Luisa','루이사'], ['Fernanda','페르난다'], ['Daniela','다니엘라'], ['Andres','안드레스'], ['Andrés','안드레스'],
    ['Agustin','아구스틴'], ['Agustín','아구스틴'], ['Benjamin','벤하민'], ['Benjamín','벤하민'], ['Matias','마티아스'], ['Matías','마티아스'],
    ['Joaquin','호아킨'], ['Joaquín','호아킨'], ['Guadalupe','과달루페'], ['Ximena','히메나'], ['Paloma','팔로마'],
    ['Esteban','에스테반'], ['Ignacio','이그나시오'], ['Maximo','막시모'], ['Máximo','막시모'], ['Catalina','카탈리나'],
    ['Antonella','안토넬라'], ['Bautista','바우티스타'], ['Facundo','파쿤도'], ['Lautaro','라우타로'], ['Emiliano','에밀리아노'],
    ['Valeria','발레리아'], ['Vanessa','바네사'], ['Yolanda','욜란다'], ['Guillermo','기예르모'], ['Alfonso','알폰소'],
    ['Concepcion','콘셉시온'], ['Concepción','콘셉시온'], ['Fernando','페르난도'], ['Gonzalo','곤살로'], ['Hector','엑토르'], ['Héctor','엑토르']
  ] });

  /* ---------- Sound rules ---------- */
  const VOWEL_BASE = { a:'ㅏ', e:'ㅔ', i:'ㅣ', o:'ㅗ', u:'ㅜ', y:'ㅣ', 'ã':'ㅏ', 'õ':'ㅗ', 'â':'ㅏ', 'ê':'ㅔ', 'ô':'ㅗ', 'à':'ㅏ', 'á':'ㅏ', 'é':'ㅔ', 'í':'ㅣ', 'ó':'ㅗ', 'ú':'ㅜ', 'ü':'ㅜ', 'ä':'ㅔ', 'ë':'ㅔ', 'ï':'ㅣ', 'ö':'ㅗ' };
  const CONS_BASE = { b:'ㅂ', c:'ㅋ', d:'ㄷ', f:'ㅍ', g:'ㄱ', h:'ㅎ', j:'ㅎ', k:'ㅋ', l:'ㄹ', m:'ㅁ', n:'ㄴ', p:'ㅍ', q:'ㅋ', r:'ㄹ', s:'ㅅ', t:'ㅌ', v:'ㅂ', w:'ㅜ', x:'ㅅ', z:'ㅅ' };

  function jamos(str) { return str.split(''); }

  function stripAccents(word) {
    return word.replace(/ñ/g, '\u0001').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\u0001/g, 'ñ');
  }

  function convertWord(word, lang) {
    const w = stripAccents(word).toLowerCase();
    if (!w) return '';
    const out = []; // jamo / ready syllables
    let i = 0;
    const push = (s) => { jamos(s).forEach((x) => out.push(x)); };

    while (i < w.length) {
      const ch = w[i];
      const next = w[i + 1] || '';
      const next2 = w[i + 2] || '';

      /* ñ — palatal nasal */
      if (ch === 'ñ') {
        const gl = { a:'냐', e:'녜', i:'니', o:'뇨', u:'뉴' }[next];
        if (gl) { out.push(gl); i += 2; continue; }
        push('ㄴ'); i++; continue;
      }
      /* ão / ãe / õe (Portuguese nasals) */
      if (ch === 'ã') {
        if (next === 'o') { out.push('앙'); i += 2; continue; }
        if (next === 'e') { out.push('앙'); i += 2; continue; }
        push('ㅏ'); i++; continue;
      }
      if (ch === 'õ') {
        if (next === 'e') { out.push('오잉'); i += 2; continue; }
        push('ㅗ'); i++; continue;
      }
      /* ç */
      if (ch === 'ç') { push('ㅅ'); i++; continue; }

      /* digraphs */
      const dg = ch + next;
      const tri = ch + next + next2;

      if (lang === 'pt') {
        if (tri === 'nha' || tri === 'nhe' || tri === 'nhi' || tri === 'nho' || tri === 'nhu') {
          out.push({ nha:'냐', nhe:'녜', nhi:'니', nho:'뇨', nhu:'뉴' }[tri]); i += 3; continue;
        }
        if (tri === 'lha' || tri === 'lhe' || tri === 'lhi' || tri === 'lho' || tri === 'lhu') {
          out.push({ lha:'랴', lhe:'례', lhi:'리', lho:'료', lhu:'류' }[tri]); i += 3; continue;
        }
        if (dg === 'nh') { push('ㄴㅣ'); i += 2; continue; }
        if (dg === 'lh') { push('ㄹㅣ'); i += 2; continue; }
        if (dg === 'ch') { push('ㅅ'); i += 2; continue; }
        if (dg === 'ss') { push('ㅅ'); i += 2; continue; }
        if (dg === 'rr') { push('ㅎ'); i += 2; continue; }
        if (dg === 'qu') { push('ㅋ'); i += 2; continue; }
        if (dg === 'gu' && /[ei]/.test(next2)) { push('ㄱ'); i += 2; continue; }
        if (tri === 'gue' || tri === 'gui') { push('ㄱ'); i += 3; continue; }
        if (dg === 'cc' || dg === 'cç') { push('ㅅ'); i += 2; continue; }
        if (ch === 'x') { push('ㅅ'); i++; continue; }
        if (ch === 'j') { push('ㅈ'); i++; continue; }
        if (ch === 'g' && /[ei]/.test(next)) { push('ㅈ'); i++; continue; }
        if (ch === 'c' && /[ei]/.test(next)) { push('ㅅ'); i++; continue; }
        if (ch === 's' && i > 0 && /[aeiouáéíóúãõâêô]/.test(w[i - 1])) { push('ㅈ'); i++; continue; }
        if (ch === 'z') { push('ㅈ'); i++; continue; }
        if (ch === 'r' && i === 0) { push('ㅎ'); i++; continue; }
        if (ch === 'e' && i === w.length - 1 && i > 2) { push('ㅣ'); i++; continue; }
        if (ch === 'o' && i === w.length - 1 && i > 1) { push('ㅜ'); i++; continue; }
        if (ch === 'm' && i === w.length - 1) { push('ㅇ'); i++; continue; }
      }

      if (lang === 'es') {
        if (dg === 'ch') { push('ㅊ'); i += 2; continue; }
        if (dg === 'll') { push('ㅣ'); i += 2; continue; }
        if (dg === 'rr') { push('ㄹ'); i += 2; continue; }
        if (dg === 'qu') { push('ㅋ'); i += 2; continue; }
        if ((tri === 'gue' || tri === 'gui')) { push('ㄱ'); i += 3; continue; }
        if (dg === 'gu' && /[ei]/.test(next2)) { push('ㄱ'); i += 2; continue; }
        if (ch === 'j') { push('ㅎ'); i++; continue; }
        if (ch === 'h') { i++; continue; }
        if (ch === 'c' && /[ei]/.test(next)) { push('ㅅ'); i++; continue; }
        if (ch === 'z') { push('ㅅ'); i++; continue; }
        if (ch === 'x') { push('ㅎ'); i++; continue; }
        if (ch === 'g' && /[ei]/.test(next)) { push('ㅎ'); i++; continue; }
        if (ch === 'y' && i > 0) { push('ㅣ'); i++; continue; }
        if (ch === 'v') { push('ㅂ'); i++; continue; }
      }

      /* English and generic extras */
      if (lang === 'en' || lang === 'generic') {
        if (dg === 'th') { push('ㅅ'); i += 2; continue; }
        if (dg === 'sh') { push('ㅅ'); i += 2; continue; }
        if (dg === 'ch') { push('ㅊ'); i += 2; continue; }
        if (dg === 'ph') { push('ㅍ'); i += 2; continue; }
        if (dg === 'ck') { push('ㅋ'); i += 2; continue; }
        if (dg === 'ee' || dg === 'ea') { push('ㅣ'); i += 2; continue; }
        if (dg === 'oo') { push('ㅜ'); i += 2; continue; }
        if (dg === 'qu') { push('ㅋㅜ'); i += 2; continue; }
        if (dg === 'll') { push('ㄹ'); i += 2; continue; }
        if (dg === 'ss') { push('ㅅ'); i += 2; continue; }
        if (ch === 'j') { push('ㅈ'); i++; continue; }
        if (ch === 'y') { push('ㅣ'); i++; continue; }
        if (ch === 'c' && /[ei]/.test(next)) { push('ㅅ'); i++; continue; }
        if (ch === 'e' && i === w.length - 1 && i > 2 && !/[aeiou]/.test(w[i - 1])) { i++; continue; }
      } else if (lang === 'pt' || lang === 'es') {
        if (dg === 'th') { push('ㅌ'); i += 2; continue; }
        if (dg === 'ph') { push('ㅍ'); i += 2; continue; }
      }

      /* plain letters */
      if (VOWEL_BASE[ch]) { push(VOWEL_BASE[ch]); i++; continue; }
      if (CONS_BASE[ch]) { push(CONS_BASE[ch]); i++; continue; }
      i++; // skip anything else
    }

    /* word-final consonant handling: -s/-z become 스 */
    const last = out[out.length - 1];
    if (last && 'ㅅ' === last && out.length > 1) {
      const prev = out[out.length - 2];
      if (VOWELS.has(prev) || isSyl(prev)) {
        const tail = out.pop();
        const body = compose(out);
        if (body) return body + '스';
      }
    }
    let res = compose(out);
    /* tidy: word-final ㅎ is dropped by coda map anyway; fix leftover lone vowels */
    return res;
  }

  /* ---------- Detection ---------- */
  function detectLang(plain) {
    if (/[ãõ]/i.test(plain)) return 'pt';
    if (/ç/i.test(plain) && !/[ñ]/.test(plain)) return 'pt';
    if (/[ñ]/i.test(plain)) return 'es';
    if (/[áéíóú]/i.test(plain)) return 'es';
    return null;
  }

  function lookup(part, detected, uiLang) {
    const key = normalize(part);
    if (!key) return null;
    const order = [];
    if (detected) order.push(detected);
    if (uiLang) order.push(uiLang);
    ['es', 'pt', 'en', 'any'].forEach((k) => { if (order.indexOf(k) < 0) order.push(k); });
    for (const k of order) {
      const hit = N[key + '|' + k];
      if (hit) return hit;
    }
    return null;
  }

  /* ---------- Romanisation (Revised Romanization, light) ---------- */
  const ROM_CHO = { 'ㄱ':'g','ㄲ':'kk','ㄴ':'n','ㄷ':'d','ㄸ':'tt','ㄹ':'r','ㅁ':'m','ㅂ':'b','ㅃ':'pp','ㅅ':'s','ㅆ':'ss','ㅇ':'','ㅈ':'j','ㅉ':'jj','ㅊ':'ch','ㅋ':'k','ㅌ':'t','ㅍ':'p','ㅎ':'h' };
  const ROM_JUNG = { 'ㅏ':'a','ㅐ':'ae','ㅑ':'ya','ㅒ':'yae','ㅓ':'eo','ㅔ':'e','ㅕ':'yeo','ㅖ':'ye','ㅗ':'o','ㅘ':'wa','ㅙ':'wae','ㅚ':'oe','ㅛ':'yo','ㅜ':'u','ㅝ':'wo','ㅞ':'we','ㅟ':'wi','ㅠ':'yu','ㅡ':'eu','ㅢ':'ui','ㅣ':'i' };
  const ROM_JONG = { '':'','ㄱ':'k','ㄲ':'k','ㄴ':'n','ㄷ':'t','ㄹ':'l','ㅁ':'m','ㅂ':'p','ㅅ':'t','ㅆ':'t','ㅇ':'ng','ㅈ':'t','ㅊ':'t','ㅋ':'k','ㅌ':'t','ㅍ':'p','ㅎ':'t' };

  function decompose(ch) {
    const n = ch.charCodeAt(0) - 0xAC00;
    if (n < 0 || n > 11171) return null;
    return { cho: CHO[Math.floor(n / 588)], jung: JUNG[Math.floor((n % 588) / 28)], jong: JONG[n % 28] };
  }

  function tidySyllables(s) {
    return s.replace(/eu-r/g, 'r').replace(/l-r/g, 'l-l').replace(/-+/g, '-').replace(/- /g, ' ').replace(/ -/g, ' ');
  }

  function romanize(text) {
    return text.split(' ').map((word) => tidySyllables(word.split('').map((ch) => {
      const d = decompose(ch);
      if (!d) return ch;
      return (ROM_CHO[d.cho] || '') + (ROM_JUNG[d.jung] || '') + (ROM_JONG[d.jong] || '');
    }).join('-'))).join(' ');
  }

  /* Friendly reading for Spanish/Portuguese/English speakers */
  const SAY = {
    es: {
      cho: { 'ㄱ':'g','ㄲ':'k','ㄴ':'n','ㄷ':'d','ㄸ':'t','ㄹ':'r','ㅁ':'m','ㅂ':'b','ㅃ':'p','ㅅ':'s','ㅆ':'s','ㅇ':'','ㅈ':'j','ㅉ':'j','ㅊ':'ch','ㅋ':'k','ㅌ':'t','ㅍ':'p','ㅎ':'j' },
      jung: { 'ㅏ':'a','ㅐ':'e','ㅑ':'ya','ㅒ':'ye','ㅓ':'o','ㅔ':'e','ㅕ':'yo','ㅖ':'ye','ㅗ':'o','ㅘ':'wa','ㅙ':'we','ㅚ':'oe','ㅛ':'yo','ㅜ':'u','ㅝ':'wo','ㅞ':'we','ㅟ':'ui','ㅠ':'yu','ㅡ':'u','ㅢ':'ui','ㅣ':'i' },
      jong: { '':'','ㄱ':'k','ㄴ':'n','ㄷ':'d','ㄹ':'l','ㅁ':'m','ㅂ':'b','ㅅ':'s','ㅇ':'ng','ㅌ':'t','ㅍ':'p','ㅋ':'k','ㅎ':'' }
    },
    pt: {
      cho: { 'ㄱ':'g','ㄲ':'k','ㄴ':'n','ㄷ':'d','ㄸ':'t','ㄹ':'r','ㅁ':'m','ㅂ':'b','ㅃ':'p','ㅅ':'s','ㅆ':'s','ㅇ':'','ㅈ':'j','ㅉ':'j','ㅊ':'ch','ㅋ':'k','ㅌ':'t','ㅍ':'p','ㅎ':'r' },
      jung: { 'ㅏ':'a','ㅐ':'é','ㅑ':'ya','ㅒ':'ye','ㅓ':'ó','ㅔ':'ê','ㅕ':'yó','ㅖ':'ye','ㅗ':'ô','ㅘ':'wa','ㅙ':'wé','ㅚ':'oi','ㅛ':'yô','ㅜ':'u','ㅝ':'wó','ㅞ':'we','ㅟ':'ui','ㅠ':'yu','ㅡ':'u','ㅢ':'ui','ㅣ':'i' },
      jong: { '':'','ㄱ':'k','ㄴ':'n','ㄷ':'d','ㄹ':'l','ㅁ':'m','ㅂ':'b','ㅅ':'s','ㅇ':'ng','ㅌ':'t','ㅍ':'p','ㅋ':'k','ㅎ':'' }
    },
    en: {
      cho: { 'ㄱ':'g','ㄲ':'k','ㄴ':'n','ㄷ':'d','ㄸ':'t','ㄹ':'r','ㅁ':'m','ㅂ':'b','ㅃ':'p','ㅅ':'s','ㅆ':'s','ㅇ':'','ㅈ':'j','ㅉ':'j','ㅊ':'ch','ㅋ':'k','ㅌ':'t','ㅍ':'p','ㅎ':'h' },
      jung: { 'ㅏ':'ah','ㅐ':'eh','ㅑ':'yah','ㅒ':'yeh','ㅓ':'uh','ㅔ':'eh','ㅕ':'yuh','ㅖ':'yeh','ㅗ':'oh','ㅘ':'wah','ㅙ':'weh','ㅚ':'weh','ㅛ':'yoh','ㅜ':'oo','ㅝ':'wuh','ㅞ':'weh','ㅟ':'wee','ㅠ':'yoo','ㅡ':'eu','ㅢ':'eui','ㅣ':'ee' },
      jong: { '':'','ㄱ':'k','ㄴ':'n','ㄷ':'d','ㄹ':'l','ㅁ':'m','ㅂ':'b','ㅅ':'s','ㅇ':'ng','ㅌ':'t','ㅍ':'p','ㅋ':'k','ㅎ':'h' }
    }
  };

  function saySyllable(ch, uiLang) {
    const d = decompose(ch);
    if (!d) return ch;
    const m = SAY[uiLang] || SAY.en;
    return (m.cho[d.cho] || '') + (m.jung[d.jung] || '') + (m.jong[d.jong] || '');
  }

  function sayOf(hangul, uiLang) {
    return hangul.split(' ').map((w) => {
      const items = w.split('').map((c) => ({ txt: saySyllable(c, uiLang), d: decompose(c) }));
      const out = [];
      for (let i = 0; i < items.length; i++) {
        const cur = items[i], nxt = items[i + 1];
        if (cur.d && cur.d.jung === 'ㅡ' && cur.d.jong === '' && nxt && /^r/.test(nxt.txt)) {
          out.push(cur.txt.replace(/u$/, '') + nxt.txt); i++;
        } else out.push(cur.txt);
      }
      return out.join('-').replace(/l-r/g, 'l-l');
    }).join(' ');
  }

  function syllablesOf(hangul) {
    return hangul.split('').filter((c) => isSyl(c) || c === ' ');
  }

  /* ---------- Public API ---------- */
  function convert(rawInput, uiLang) {
    const input = (rawInput || '').replace(/\s+/g, ' ').trim();
    if (!input) return { input: '', hangul: '', roman: '', parts: [], lang: 'generic', fromDict: false, say: '' };

    const detected = detectLang(input);
    const parts = input.split(' ');
    let usedLang = detected;
    let fromDict = true;
    const converted = parts.map((p) => {
      const hit = lookup(p, detected, uiLang);
      let lang = detected || (hit && hit.lang) || 'generic';
      if (lang === 'generic' && hit) lang = hit.lang;
      if (hit) {
        if (!usedLang || usedLang === 'generic') usedLang = hit.lang;
        return hit.hangul;
      }
      fromDict = false;
      return convertWord(p, lang === 'generic' ? 'generic' : lang);
    });
    const hangul = converted.filter(Boolean).join(' ');
    if (!usedLang) usedLang = 'generic';
    if (usedLang === 'generic' && detected) usedLang = detected;
    return {
      input: input,
      hangul: hangul,
      roman: romanize(hangul),
      parts: converted,
      lang: usedLang,
      fromDict: fromDict,
      say: sayOf(hangul, uiLang || 'es')
    };
  }

  window.Translit = {
    convert: convert,
    romanize: romanize,
    syllablesOf: syllablesOf,
    saySyllable: saySyllable,
    convertWord: convertWord,
    dictionarySize: Object.keys(N).length
  };
})();
