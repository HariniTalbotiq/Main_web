/* =============================================================================
   DEDOODLE — take the hand-drawn marks off the standalone pages
   -----------------------------------------------------------------------------
       node tools/dedoodle.js              # rewrite in place
       node tools/dedoodle.js --dry        # report only, change nothing
       node tools/dedoodle.js --verbose    # list every heading it touches

   WHY THIS EXISTS. index.html and demo.html are generated, so their headings
   changed in build.js and home.js. Every other page — about, contact, sign-in,
   twelve products and four solutions — is a standalone mockup with its own
   inlined <style> and no link to assets/css/talbotiq.css. Eighteen files, sixty
   plus marks, four different mark shapes and slightly different positioning
   numbers on each page. That is a script, not an afternoon of hand-editing, and
   these pages get re-dropped: `tools/fix-pages.js` exists for the same reason.

   WHAT IT DOES, per page:
     1. unwraps every mark  <span class="u-line"><svg/><span>TEXT</span></span>
        down to TEXT, so the heading is a plain sentence again;
     2. colours one or two words of that heading from the table below;
     3. swaps the mark CSS in the page's own <style> for the two keyword rules;
     4. re-aims the `:has()` rule that sized marked headings, so those headings
        keep the size they already had.

   THE TABLE IS THE POINT. Which word carries a heading is an editorial
   decision, so every heading is listed with its own keywords and nothing is
   guessed. A heading in a page but not in the table, or a keyword that does not
   occur in its heading, FAILS THE RUN rather than quietly shipping a heading
   with no emphasis.

   IT IS RE-RUNNABLE AND IDEMPOTENT. A heading that is already coloured is left
   alone, so a second run reports zero changes.

   TWO ROLES, AND WHY YELLOW IS NOT THE BRAND YELLOW. `g` is the subject — the
   technology, the thing being named. `y` is the consequence — the outcome, the
   differentiator. The brand yellow #F3E202 cannot be used as text (1.34:1 on
   white, invisible), so `y` is that yellow taken down to #A87500: 4.03:1 on
   white and 3.66:1 on the grey band, still gold. Green needs no adjustment at
   5.33:1. These two values are duplicated into eighteen self-contained pages,
   which is exactly why they live HERE and not in eighteen places — retune them
   and re-run.
   ========================================================================== */
'use strict';

const fs = require('fs');
const path = require('path');

const DRY = process.argv.includes('--dry');
const VERBOSE = process.argv.includes('--verbose');
const ROOT = path.join(__dirname, '..');

const K_GREEN = 'var(--green)';
const K_YELLOW = '#A87500';

/* ---- the table: every heading that carried a mark, and what carries it now --
   Keyed by the heading's own text with whitespace collapsed, entities left
   exactly as the page writes them (&amp;, &rsquo;, &mdash;). Order within a
   heading does not matter; position in the sentence is found, not assumed. */
const KEYS = {
  'about.html': {
    'Architecting the intelligence layer of modern business.': [['intelligence', 'g'], ['layer', 'y']],
    'Technology is a tool. Intelligence is the edge.': [['Technology', 'g'], ['Intelligence', 'y']],
    'The people behind it': [['people', 'g']],
    'Realistic innovation &amp; leadership': [['innovation', 'g'], ['leadership', 'y']],
    'Key benefits of our approach': [['benefits', 'g'], ['approach', 'y']],
    'What we actually build': [['build', 'g']],
    'Contact us today.': [['Contact', 'g'], ['today', 'y']],
    'It&rsquo;s time to accelerate.': [['time', 'g'], ['accelerate', 'y']],
  },
  'contact.html': {
    'Let&rsquo;s engineer your future.': [['engineer', 'g'], ['future', 'y']],
    'What happens after you send it': [['happens', 'g'], ['send', 'y']],
    'Come and find us': [['find', 'g']],
    'Not sure who to ask for?': [['ask', 'g']],
    'Contact us today.': [['Contact', 'g'], ['today', 'y']],
    'Ready when you are.': [['Ready', 'g']],
  },
  'signin.html': {
    'Sign in to TALBOTIQ.': [['Sign in', 'g'], ['TALBOTIQ', 'y']],
  },
  'products/ats.html': {
    'Six modules are the same. One is not.': [['modules', 'g'], ['not', 'y']],
    'Every record becomes the next one.': [['record', 'g'], ['next', 'y']],
    'What each module gives you': [['module', 'g'], ['gives', 'y']],
    'Nothing lands in the database without a person saying so.': [['database', 'g'], ['person', 'y']],
    'Two ways to recruit. One database.': [['recruit', 'g'], ['database', 'y']],
    'Seven modules, one licence.': [['modules', 'g'], ['licence', 'y']],
    'Ready to see it?': [['see', 'y']],
  },
  'products/avatar-interviewer.html': {
    'The same interview, the fortieth time.': [['interview', 'g'], ['fortieth', 'y']],
    'Your best interviewer is worse at four in the afternoon.': [['interviewer', 'g'], ['worse', 'y']],
    'One script. Every candidate.': [['script', 'g'], ['candidate', 'y']],
    'What the Avatar round does': [['Avatar', 'g'], ['round', 'y']],
    'Consistency is the claim. So is the disclosure.': [['Consistency', 'g'], ['disclosure', 'y']],
    'Ready to see it?': [['see', 'y']],
    'Remove the interviewer variance.': [['interviewer', 'g'], ['variance', 'y']],
  },
  'products/chat-interviewer.html': {
    'Everyone has the same model open in the next tab.': [['model', 'g'], ['tab', 'y']],
    'No scheduling. No camera. No excuses.': [['scheduling', 'g'], ['excuses', 'y']],
    'What the Chat Interview does': [['Chat', 'g'], ['Interview', 'y']],
    'A flag is not a verdict': [['flag', 'g'], ['verdict', 'y']],
    'Blind assessment. And it knows when a model wrote it.': [['assessment', 'g'], ['model', 'y']],
    'Ready to see it?': [['see', 'y']],
    'Screen for the writing.': [['Screen', 'g'], ['writing', 'y']],
  },
  'products/conversational-interview.html': {
    'It reads like a conversation.': [['reads', 'g'], ['conversation', 'y']],
    'A follow-up is where a rehearsed answer breaks.': [['follow-up', 'g'], ['breaks', 'y']],
    'Ask. Read. Ask again.': [['Ask', 'g'], ['again', 'y']],
    'What the Conversational round does': [['Conversational', 'g'], ['round', 'y']],
    'A flag is not a verdict': [['flag', 'g'], ['verdict', 'y']],
    'Ready to see it?': [['see', 'y']],
    'Ask the second question.': [['second', 'g'], ['question', 'y']],
  },
  'products/erp.html': {
    'Selling &mdash; order to cash': [['Selling', 'g'], ['cash', 'y']],
    'Buying &mdash; purchase to pay': [['Buying', 'g'], ['pay', 'y']],
    'Three more lanes': [['lanes', 'g']],
    'Derived, not maintained.': [['Derived', 'g'], ['maintained', 'y']],
    'Order to cash. Purchase to pay.': [['Order', 'g'], ['pay', 'y']],
    'Where this actually is': [['actually', 'g']],
    'One chain, five lanes.': [['chain', 'g'], ['lanes', 'y']],
    'Book a walkthrough.': [['walkthrough', 'y']],
  },
  'products/lexer.html': {
    'It tells you what it is not sure about.': [['tells', 'g'], ['sure', 'y']],
    'Photograph it. Then check five fields.': [['Photograph', 'g'], ['fields', 'y']],
    'What the Intelligent Document Management does': [['Intelligent Document Management', 'g']],
    'Extraction is automatic. The write is not.': [['Extraction', 'g'], ['write', 'y']],
    'Turn documents into structured data.': [['documents', 'g'], ['data', 'y']],
    'Ready to see it?': [['see', 'y']],
    'Bring a card and a receipt.': [['card', 'g'], ['receipt', 'y']],
  },
  'products/mcqs.html': {
    'The one score nobody can argue with.': [['score', 'g'], ['argue', 'y']],
    'No model decides anything here.': [['model', 'g'], ['decides', 'y']],
    'Build the bank once. Then it just runs.': [['bank', 'g'], ['runs', 'y']],
    'What the MCQ round does': [['MCQ', 'g'], ['round', 'y']],
    'It is a knowledge floor, not a knowledge test': [['floor', 'g'], ['test', 'y']],
    'Ready to see it?': [['see', 'y']],
    'Filter on what is knowable.': [['Filter', 'g'], ['knowable', 'y']],
  },
  'products/mimic.html': {
    'Seven ways to run a round. One rubric across all of them.': [['round', 'g'], ['rubric', 'y']],
    'Applied this morning. Scored by lunch.': [['Applied', 'g'], ['Scored', 'y']],
    'What Mimic does': [['Mimic', 'g']],
    'Candidate data is somebody\'s career': [['data', 'g'], ['career', 'y']],
    'Screening intelligence, decided by humans.': [['intelligence', 'g'], ['humans', 'y']],
    'Ready to see it?': [['see', 'y']],
    'Ready to accelerate your hiring?': [['accelerate', 'y']],
  },
  'products/nouscrm.html': {
    'One button. Three ways in.': [['button', 'g'], ['ways', 'y']],
    'First contact to paid invoice.': [['contact', 'g'], ['invoice', 'y']],
    'And the rest of the CRM': [['CRM', 'g']],
    'It shows its work, including where it stops.': [['work', 'g'], ['stops', 'y']],
    'Your CRM should do the typing.': [['CRM', 'g'], ['typing', 'y']],
    'Ready to see it?': [['see', 'y']],
    'Ready to stop re-typing?': [['re-typing', 'y']],
  },
  'products/recapr.html': {
    'See the decisions form while the meeting is still running.': [['decisions', 'g'], ['meeting', 'y']],
    'Capture. Understand. Decipher. Remember. Act.': [['Capture', 'g'], ['Act', 'y']],
    'What the Intelligent Note Taker does': [['Intelligent Note Taker', 'g']],
    'Nothing joins your call. Nothing leaves your account.': [['call', 'g'], ['account', 'y']],
    'Your meetings, with a memory.': [['meetings', 'g'], ['memory', 'y']],
    'Ready to see it?': [['see', 'y']],
    'Free plan, no card.': [['Free', 'g'], ['card', 'y']],
  },
  'products/recorded-interviewer.html': {
    'They record when they can. You review when you can.': [['record', 'g'], ['review', 'y']],
    'Scheduling is the bottleneck. Interviewing never was.': [['Scheduling', 'g'], ['bottleneck', 'y']],
    'Set it once. Then stop touching it.': [['Set', 'g'], ['once', 'y']],
    'What the Recorded round does': [['Recorded', 'g'], ['round', 'y']],
    'A recording of somebody&rsquo;s career': [['recording', 'g'], ['career', 'y']],
    'Ready to see it?': [['see', 'y']],
    'Stop scheduling. Start reviewing.': [['scheduling', 'g'], ['reviewing', 'y']],
  },
  'products/tasca.html': {
    'Paste the meeting. Get the plan.': [['meeting', 'g'], ['plan', 'y']],
    'From a sentence in a room to kept, late or missed.': [['sentence', 'g'], ['missed', 'y']],
    'What the Task &amp; Productivity Manager does': [['Task &amp; Productivity Manager', 'g']],
    'The gate is one door, not a sign on the wall.': [['gate', 'g'], ['door', 'y']],
    'Your meetings create work. The Task &amp; Productivity Manager makes sure it gets done.': [['work', 'g'], ['done', 'y']],
    'Ready to see it?': [['see', 'y']],
    'Free during beta.': [['Free', 'g'], ['beta', 'y']],
  },
  'products/timed-qa.html': {
    'A clock changes what you are measuring.': [['clock', 'g'], ['measuring', 'y']],
    'Sixty seconds and five minutes are different questions.': [['seconds', 'g'], ['questions', 'y']],
    'Set the limits. The clock does the rest.': [['limits', 'g'], ['clock', 'y']],
    'What the Timed round does': [['Timed', 'g'], ['round', 'y']],
    'A clock is a constraint. Not a guarantee.': [['constraint', 'g'], ['guarantee', 'y']],
    'Ready to see it?': [['see', 'y']],
    'Choose the clock deliberately.': [['clock', 'g'], ['deliberately', 'y']],
  },
  'products/two-way-interviewer.html': {
    'A real conversation. Scored like everything else.': [['conversation', 'g'], ['Scored', 'y']],
    'The final round is where the structure usually collapses.': [['structure', 'g'], ['collapses', 'y']],
    'A conversation that leaves a record.': [['conversation', 'g'], ['record', 'y']],
    'What the 2-Way round does': [['2-Way', 'g'], ['round', 'y']],
    'The conversation is human. So is the decision.': [['human', 'g'], ['decision', 'y']],
    'Ready to see it?': [['see', 'y']],
    'Keep the conversation. Keep the record.': [['conversation', 'g'], ['record', 'y']],
  },
  'products/vawlt.html': {
    'Ask for a job. Never for a model.': [['job', 'g'], ['model', 'y']],
    'Five things happen to every request.': [['happen', 'g'], ['request', 'y']],
    'What Vawlt does': [['Vawlt', 'g']],
    'A task that fails testing gets pulled, not shipped.': [['testing', 'g'], ['shipped', 'y']],
    'Private by architecture, not by policy.': [['architecture', 'g'], ['policy', 'y']],
    'Ready to see it?': [['see', 'y']],
    'Want to know where your data goes?': [['data', 'g']],
  },
  'products/video-interviewer.html': {
    'A recording can be re-watched. A phone screen cannot.': [['recording', 'g'], ['re-watched', 'y']],
    'Applied this morning. Scored by lunch.': [['Applied', 'g'], ['Scored', 'y']],
    'What the Video Interview does': [['Video', 'g'], ['Interview', 'y']],
    'A recording of somebody&rsquo;s career': [['recording', 'g'], ['career', 'y']],
    'Every applicant gets an interview. Not just the shortlist.': [['applicant', 'g'], ['shortlist', 'y']],
    'Ready to see it?': [['see', 'y']],
    'Interview all of them.': [['Interview', 'g'], ['all', 'y']],
  },
  'products/voice-interviewer.html': {
    'The camera is the part that loses you people.': [['camera', 'g'], ['people', 'y']],
    'A phone, five minutes, a scored round.': [['phone', 'g'], ['scored', 'y']],
    'What the Voice Interview does': [['Voice', 'g'], ['Interview', 'y']],
    'A recording of somebody&rsquo;s career': [['recording', 'g'], ['career', 'y']],
    'No camera. No app. Just a conversation.': [['camera', 'g'], ['conversation', 'y']],
    'Ready to see it?': [['see', 'y']],
    'Take the camera out of it.': [['camera', 'g']],
  },
  'solutions/ai-agent-bot-development.html': {
    'AI agent &amp; bot development': [['AI', 'g'], ['agent', 'y']],
    'Autonomous execution at scale.': [['Autonomous', 'g'], ['scale', 'y']],
    'Hardening the intelligent infrastructure': [['intelligent', 'g'], ['infrastructure', 'y']],
    'One request, five moves.': [['request', 'g'], ['moves', 'y']],
    'Autonomy is only useful with a stopping rule.': [['Autonomy', 'g'], ['rule', 'y']],
    'Contact us today.': [['Contact', 'g'], ['today', 'y']],
    'Start with one workflow.': [['Start', 'g'], ['workflow', 'y']],
  },
  'solutions/ai-strategy-consulting.html': {
    'AI Strategy &amp; Consulting': [['AI', 'g'], ['Strategy', 'y']],
    'Turn AI complexity into competitive advantage.': [['complexity', 'g'], ['advantage', 'y']],
    'From vision to reality': [['vision', 'g'], ['reality', 'y']],
    'What you actually walk away with': [['actually', 'g']],
    'Why we start with an assessment': [['start', 'g'], ['assessment', 'y']],
    'Contact us today.': [['Contact', 'g'], ['today', 'y']],
    'Start with the assessment.': [['Start', 'g'], ['assessment', 'y']],
  },
  'solutions/embedded-edge-ai.html': {
    'Embedded Edge AI': [['Edge', 'g'], ['AI', 'y']],
    'Bridging the physical and digital frontier.': [['physical', 'g'], ['digital', 'y']],
    'Edge computing expertise': [['Edge', 'g'], ['expertise', 'y']],
    'Our capabilities': [['capabilities', 'g']],
    'Why it belongs on the device': [['belongs', 'g'], ['device', 'y']],
    'Contact us today.': [['Contact', 'g'], ['today', 'y']],
    'Start with a site survey.': [['Start', 'g'], ['survey', 'y']],
  },
  'solutions/full-stack-ai-integration.html': {
    'Full stack development &amp; AI integration': [['AI', 'g'], ['integration', 'y']],
    'Building and integrating scalable digital systems.': [['scalable', 'g'], ['systems', 'y']],
    'How we engineer': [['engineer', 'g']],
    'Nobody turns the old system off on a Friday.': [['system', 'g'], ['Friday', 'y']],
    'Why modular beats monolithic': [['modular', 'g'], ['monolithic', 'y']],
    'Contact us today.': [['Contact', 'g'], ['today', 'y']],
    'Start with the audit.': [['Start', 'g'], ['audit', 'y']],
  },
};


/* ---- helpers ------------------------------------------------------------- */

const norm = (s) => s.replace(/\s+/g, ' ').trim();
const rxEsc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/* A word boundary that also holds at a hyphen, so "re-watched" matches as one
   keyword and "not" never matches inside "Nothing". \b alone would break
   "re-watched" into two, and a bare indexOf would hit the "not" in "Nothing". */
function wordRx(word) {
  return new RegExp('(^|[^A-Za-z0-9-])(' + rxEsc(word) + ')(?![A-Za-z0-9-])');
}

/* Colour the keywords inside one heading's inner HTML. Only the text between
   tags is eligible, so a keyword can never land inside an attribute, and each
   keyword is applied once — the first time it occurs. */
function colour(inner, keys) {
  for (const [word, tone] of keys) {
    const rx = wordRx(word);
    let done = false;
    inner = inner.replace(/(<[^>]*>)|([^<]+)/g, (m, tag, text) => {
      if (tag || done) return m;
      if (!rx.test(text)) return m;
      done = true;
      return text.replace(rx, (mm, pre, hit) => pre + '<span class="k-' + tone + '">' + hit + '</span>');
    });
    if (!done) return { err: `keyword "${word}" does not occur in it` };
  }
  return { inner };
}

/* ---- the run ------------------------------------------------------------- */

const MARK = /<span class="(?:mark-hl|u-line|u-squig|u-lasso)">\s*<svg[\s\S]*?<\/svg>\s*<span>([\s\S]*?)<\/span>\s*<\/span>/g;
const HEADING = /<(h[123])([^>]*)>([\s\S]*?)<\/\1>/g;

let totalMarks = 0, totalHeadings = 0, changed = 0;
const problems = [];

for (const rel of Object.keys(KEYS)) {
  const file = path.join(ROOT, rel);
  if (!fs.existsSync(file)) { problems.push(`${rel}: no such file`); continue; }

  const before = fs.readFileSync(file, 'utf8');
  let s = before;

  /* 1 ── unwrap the marks */
  const marks = (s.match(MARK) || []).length;
  s = s.replace(MARK, (m, text) => text);
  totalMarks += marks;

  /* 2 ── colour the headings the table names */
  const table = KEYS[rel];
  const seen = new Set();
  s = s.replace(HEADING, (m, tag, attrs, inner) => {
    /* ONLY <br> BECOMES A SPACE. Several of these headings break with one, and
       dropping it would join "Paste the meeting." to "Get the plan." as a
       single word that matches no table entry. Every other tag is removed with
       NO space, because once a heading has been coloured its own
       `<span class="k-y">advantage</span>.` would otherwise normalise to
       "advantage ." — a key that no longer matches, which is what stopped this
       script being re-runnable the first time. */
    const key = norm(inner.replace(/<br\s*\/?>/gi, ' ').replace(/<[^>]+>/g, ''));
    if (!(key in table)) return m;
    seen.add(key);
    if (/class="k-/.test(inner)) return m;                 /* already done */
    const r = colour(inner, table[key]);
    if (r.err) { problems.push(`${rel}: heading "${key}" — ${r.err}`); return m; }
    totalHeadings++;
    return `<${tag}${attrs}>${r.inner}</${tag}>`;
  });

  /* Every heading in the table must exist in the page, or the table has drifted
     from the markup and some heading is silently shipping with no emphasis. */
  for (const key of Object.keys(table)) {
    if (!seen.has(key)) problems.push(`${rel}: table names "${key}" but the page has no such heading`);
  }

  /* 3 ── the page's own <style>: mark rules out, keyword rules in */
  s = s
    /* the wrapper rules, in whichever of their per-page variants */
    .replace(/^\.u-line,\.u-squig,\.u-lasso,\.mark-hl\{[^}]*\}\n?/m, '')
    .replace(/^\.u-line svg,\.u-squig svg\{[^}]*\}\n?/m, '')
    .replace(/^\.u-lasso svg\{[^}]*\}\n?/m, '')
    .replace(/^\.mark-hl > span\{[^}]*\}\n?/m, '')
    .replace(/^\.mark-hl svg\{[^}]*\}\n?/m, '')
    /* 4 ── and the rule that sized a marked heading keeps sizing the same ones */
    .replace(/h2\.hand:has\(\.u-line,\.u-squig,\.u-lasso,\.mark-hl\)/g, 'h2.hand:has(.k-g,.k-y)');

  /* the two keyword rules, once, next to the display face they colour */
  if (!/\.k-g\{/.test(s)) {
    const anchor = s.match(/^\.hand\{[^}]*\}\n/m);
    const rules = `/* one or two words of a heading carry it; the rest is ink */\n`
      + `.k-g{color:${K_GREEN}}\n.k-y{color:${K_YELLOW}}\n`;
    if (anchor) s = s.replace(anchor[0], anchor[0] + rules);
    else problems.push(`${rel}: found no .hand{} rule to put the keyword classes after`);
  }

  if (s !== before) {
    changed++;
    if (!DRY) fs.writeFileSync(file, s, 'utf8');
    if (VERBOSE) console.log(`  ${rel}: ${marks} marks unwrapped`);
  } else if (VERBOSE) {
    console.log(`  ${rel}: nothing to do`);
  }
}

console.log(`${DRY ? 'DRY — ' : ''}${changed} page(s) ${DRY ? 'would change' : 'rewritten'} · `
  + `${totalMarks} marks unwrapped · ${totalHeadings} headings coloured`);

if (problems.length) {
  console.error('\nPROBLEMS — nothing about these was guessed at:');
  for (const p of problems) console.error('  · ' + p);
  process.exit(1);
}
