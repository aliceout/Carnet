// carnet-b-app.jsx — Carnet direction B prototype
// Pages: home / article / archives / pole / about. Clickable nav.
// Tweaks: accent color, sidenotes vs classic, density, lettrine.

const { useTweaks, TweaksPanel, TweakSection, TweakColor, TweakRadio, TweakToggle } = window;

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "accent": "#5a3a7a",
  "bg": "#fdfcf8",
  "notesMode": "classic",
  "density": "serre",
  "lettrine": true,
  "justify": true
}/*EDITMODE-END*/;

// -------- data --------
const POLES = {
  'genre-geopolitique': 'Genre & géopolitique',
  'lgbtqi-international': 'LGBTQI+ & international',
  'humanitaire-genre': 'Humanitaire & genre',
  'migrations-exil': 'Migrations & exil',
  'conflits-minorites': 'Conflits & minorités',
  'theorie-feministe': 'Théorie féministe',
  'queer-theory': 'Queer theory',
  'postcolonial': 'Postcolonial',
};

const POSTS = [
  { num: '042', date: '14 avril 2026', dateY: '2026-04-14', type: 'Analyse', pole: 'genre-geopolitique', read: '38 min', slug: 'homonationalisme-diplomatie',
    title: "L'homonationalisme a-t-il une diplomatie ? Retour sur dix ans de discours sur les droits LGBTQI+ aux Nations unies",
    excerpt: "En 2011, le Conseil des droits de l'homme adoptait sa première résolution sur l'orientation sexuelle. Quinze ans plus tard, l'instrumentalisation de cet acquis dessine une ligne de fracture qui traverse aussi bien le « bloc occidental » que ses contestataires.",
    tags: ['onu', 'pinkwashing', 'cdh'] },
  { num: '041', date: '02 avril 2026', dateY: '2026-04-02', type: 'Analyse', pole: 'migrations-exil', read: '24 min', slug: 'directive-2024-1346',
    title: "Sortir de l'« exception » : le statut de réfugié·e LGBTQI+ après la directive 2024/1346",
    excerpt: "La directive européenne adoptée en décembre 2024 réécrit, sans le dire, les conditions d'examen de la persécution liée au genre. Lecture critique.",
    tags: ['ue', 'asile', 'cjue'] },
  { num: '009', date: '01 avril 2026', dateY: '2026-04-01', type: 'Fiche', pole: 'lgbtqi-international', read: 'fiche', slug: 'pinkwashing',
    title: "Pinkwashing : généalogie, usages, contre-usages",
    excerpt: "Synthèse outillée pour étudiant·es et journalistes. Mise à jour régulière.",
    tags: ['notion', 'lgbtqi'] },
  { num: '017', date: '28 mars 2026', dateY: '2026-03-28', type: 'Note de lecture', pole: 'theorie-feministe', read: '11 min', slug: 'farris-relecture',
    title: "Sara R. Farris, In the Name of Women's Rights (Duke UP, 2017) — relecture",
    excerpt: "Huit ans après sa parution, le concept de fémonationalisme reste l'un des plus opératoires pour penser les usages politiques du féminisme.",
    tags: ['femonationalisme', 'recension'] },
  { num: '040', date: '18 mars 2026', dateY: '2026-03-18', type: 'Analyse', pole: 'humanitaire-genre', read: '31 min', slug: 'wps-1325',
    title: "Femmes, paix, sécurité : la résolution 1325 a vingt-cinq ans, et après ?",
    excerpt: "Ce qu'on a obtenu, ce qu'on a perdu, et ce que la résolution n'a jamais voulu dire.",
    tags: ['onu', 'wps', 'genre'] },
  { num: '016', date: '14 mars 2026', dateY: '2026-03-14', type: 'Note de lecture', pole: 'queer-theory', read: '8 min', slug: 'puar-vingt-ans',
    title: "Jasbir K. Puar, Terrorist Assemblages, vingt ans après",
    excerpt: "Relire Puar à l'âge de la guerre permanente.",
    tags: ['homonationalisme', 'recension'] },
  { num: '007', date: '07 mars 2026', dateY: '2026-03-07', type: 'Fiche', pole: 'migrations-exil', read: 'fiche', slug: 'persecution-genre',
    title: "Persécution liée au genre : cadres juridiques internationaux",
    excerpt: "Convention de Genève, directive qualification, jurisprudence CJUE et CNDA.",
    tags: ['cadre', 'asile'] },
  { num: '039', date: '04 mars 2026', dateY: '2026-03-04', type: 'Analyse', pole: 'humanitaire-genre', read: '19 min', slug: 'centrafrique-terrains',
    title: "Centrafrique 2014–2018 : terrains d'une humanitaire qui ne savait pas encore",
    excerpt: "Note réflexive, à mi-chemin entre carnet de terrain et auto-analyse.",
    tags: ['terrain', 'auto-analyse'] },
  { num: '015', date: '21 février 2026', dateY: '2026-02-21', type: 'Note de lecture', pole: 'postcolonial', read: '9 min', slug: 'massoumi',
    title: "Massoumi & al., Islamophobia, Race and Global Politics (2020)",
    excerpt: "Relecture à l'aune des débats français récents.",
    tags: ['islamophobie', 'recension'] },
  { num: '038', date: '12 février 2026', dateY: '2026-02-12', type: 'Analyse', pole: 'conflits-minorites', read: '42 min', slug: 'ukraine-marges',
    title: "Quand les marges remontent au centre : minorités de genre dans la guerre russo-ukrainienne",
    excerpt: "Notes de terrain et de lecture sur ce que la guerre fait aux minorités de genre.",
    tags: ['ukraine', 'guerre', 'genre'] },
  { num: '014', date: '03 février 2026', dateY: '2026-02-03', type: 'Note de lecture', pole: 'migrations-exil', read: '12 min', slug: 'palomares',
    title: "Élise Palomares & Aurélie Damamme dir., Genre et migrations (PUR, 2025)",
    excerpt: "Une synthèse française très attendue sur la dimension de genre des migrations contemporaines.",
    tags: ['migrations', 'recension'] },
  { num: '006', date: '22 février 2026', dateY: '2026-02-22', type: 'Fiche', pole: 'conflits-minorites', read: 'fiche', slug: 'wps-chronologie',
    title: "Femmes, paix, sécurité — chronologie des résolutions onusiennes",
    excerpt: "Chronologie commentée, mise à jour à chaque session du Conseil.",
    tags: ['cadre', 'onu'] },
  { num: '037', date: '24 janvier 2026', dateY: '2026-01-24', type: 'Analyse', pole: 'genre-geopolitique', read: '22 min', slug: 'antigenre-international',
    title: "L'« anti-genre » a une diplomatie : du Vatican à Budapest, en passant par Genève",
    excerpt: "Cartographie d'un mouvement transnational qui a appris à parler le langage des droits humains.",
    tags: ['anti-genre', 'transnational'] },
];

// -------- router --------
function useRoute() {
  const [route, setRoute] = React.useState(() => parseHash());
  React.useEffect(() => {
    const onHash = () => setRoute(parseHash());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);
  React.useEffect(() => { window.scrollTo({ top: 0 }); }, [route.path, route.id]);
  return [route, (path, id) => { window.location.hash = id ? `${path}/${id}` : path; }];
}
function parseHash() {
  const h = window.location.hash.replace(/^#\/?/, '') || 'home';
  const [path, ...rest] = h.split('/');
  return { path, id: rest.join('/') };
}

// -------- shared chrome --------
const Header = ({ route, go }) => {
  const items = [
    ['home', 'Billets'],
    ['archives', 'Archives'],
    ['pole', 'Pôles'],
    ['about', 'À propos'],
  ];
  return (
    <header className="site">
      <div className="row">
        <a className="brand" href="#/home" onClick={(e) => { e.preventDefault(); go('home'); }}>
          Carnet<span className="dot">.</span>
        </a>
        <nav>
          {items.map(([k, v]) => {
            const active = route.path === k || (k === 'pole' && route.path === 'pole');
            return (
              <a key={k} className={active ? 'active' : ''} href={`#/${k}`}
                onClick={(e) => { e.preventDefault(); go(k); }}>{v}</a>
            );
          })}
          <a href="#" onClick={(e) => e.preventDefault()} style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12 }}>RSS</a>
        </nav>
      </div>
    </header>
  );
};

const Footer = ({ go }) => (
  <footer className="site">
    <div className="container">
      <div className="grid">
        <div>
          <div style={{ fontFamily: 'Source Serif 4, serif', fontSize: 22, fontWeight: 600, marginBottom: 8 }}>
            Carnet<span style={{ color: 'var(--b-accent)' }}>.</span>
          </div>
          <p style={{ fontFamily: 'Source Serif 4, serif', fontSize: 15, lineHeight: 1.55, color: 'var(--b-muted)', margin: 0, maxWidth: 460 }}>
            Carnet de recherche d'Alice Aussel Delamaide. Genre, géopolitique, droits LGBTQI+,
            humanitaire, migrations. Auto-hébergé. Sans pisteur.
          </p>
          <div className="mono" style={{ fontSize: 11, color: 'var(--b-muted)', marginTop: 24 }}>
            carnet.aliceosdel.org · CC&nbsp;BY-NC-SA&nbsp;4.0
          </div>
        </div>
        <div>
          <h4>Naviguer</h4>
          <div className="links">
            <a href="#/home" onClick={(e) => { e.preventDefault(); go('home'); }}>Tous les billets</a>
            <a href="#/pole" onClick={(e) => { e.preventDefault(); go('pole'); }}>Pôles thématiques</a>
            <a href="#/archives" onClick={(e) => { e.preventDefault(); go('archives'); }}>Archives</a>
            <a href="#" onClick={(e) => e.preventDefault()}>Index des mots-clés</a>
          </div>
        </div>
        <div>
          <h4>Suivre</h4>
          <div className="links">
            <a href="#" onClick={(e) => e.preventDefault()}>Flux RSS</a>
            <a href="#" onClick={(e) => e.preventDefault()}>Mastodon</a>
            <a href="#" onClick={(e) => e.preventDefault()}>Bluesky</a>
            <a href="#/about" onClick={(e) => { e.preventDefault(); go('about'); }}>Colophon</a>
          </div>
        </div>
      </div>
    </div>
  </footer>
);

// -------- pages --------
const Home = ({ go }) => {
  const [type, setType] = React.useState('Tous');
  const [pole, setPole] = React.useState('Tous');
  const filtered = POSTS.filter((p) => {
    if (type !== 'Tous') {
      const m = { 'Analyses': 'Analyse', 'Notes': 'Note de lecture', 'Fiches': 'Fiche' }[type];
      if (p.type !== m) return false;
    }
    if (pole !== 'Tous' && POLES[p.pole] !== pole) return false;
    return true;
  });
  return (
    <div className="page">
      <section className="hero">
        <div className="container">
          <div className="meta">Carnet · 47 billets · depuis novembre 2024</div>
          <h1>Notes de recherche en <em>études de genre</em> et en relations internationales.</h1>
          <p className="lede">
            Analyses longues, notes de lecture et fiches thématiques sur le genre, la géopolitique
            et les droits LGBTQI+ dans les rapports internationaux. Principalement en français.
          </p>
          <div className="stats">
            <div><span className="n">28</span>analyses</div>
            <div><span className="n">17</span>notes de lecture</div>
            <div><span className="n">9</span>fiches thématiques</div>
            <div><span className="n">5</span>pôles</div>
          </div>
        </div>
      </section>

      <section className="filters">
        <div className="container">
          <div className="row">
            <div className="grp">
              <span className="lbl">Type</span>
              {['Tous', 'Analyses', 'Notes', 'Fiches'].map((t) => (
                <button key={t} className={'chip ' + (t === type ? 'on' : '')} onClick={() => setType(t)}>{t}</button>
              ))}
            </div>
            <div className="sep" />
            <div className="grp">
              <span className="lbl">Pôle</span>
              {['Tous', 'Genre & géopolitique', 'LGBTQI+ & international', 'Humanitaire & genre', 'Migrations & exil', 'Conflits & minorités'].map((t) => (
                <button key={t} className={'chip ' + (t === pole ? 'on' : '')} onClick={() => setPole(t)}>{t}</button>
              ))}
            </div>
            <div className="count">{filtered.length} billet{filtered.length > 1 ? 's' : ''} · tri : récent</div>
          </div>
        </div>
      </section>

      <section className="container">
        {filtered.map((p) => (
          <article key={p.num} className="item" onClick={() => go('article', p.slug)}>
            <div className="lcol">
              <div className="num">n°&nbsp;{p.num}</div>
              <div className="date">{p.date.split(' ').slice(0, 2).join(' ')}</div>
              <div>{p.date.split(' ').slice(2).join(' ')}</div>
              <div className="read">{p.read}</div>
            </div>
            <div>
              <div className="kicker">{p.type}<span className="pole"> · {POLES[p.pole]}</span></div>
              <h2>{p.title}</h2>
              <p>{p.excerpt}</p>
            </div>
            <div className="rcol">
              <div className="lk">Lire →</div>
              <div className="tags">{p.tags.map((t) => <span key={t} className="tag">#{t}</span>)}</div>
            </div>
          </article>
        ))}
        <div style={{ padding: '32px 0', textAlign: 'center' }}>
          <button className="chip" style={{ padding: '10px 24px', borderColor: 'var(--b-ink)', color: 'var(--b-ink)' }}
            onClick={() => go('archives')}>Voir toutes les archives</button>
        </div>
      </section>
    </div>
  );
};

const Article = ({ go, t }) => {
  // progress + active TOC anchor
  const [progress, setProgress] = React.useState(0);
  const [active, setActive] = React.useState('intro');
  React.useEffect(() => {
    const onScroll = () => {
      const h = document.documentElement;
      const max = h.scrollHeight - h.clientHeight;
      setProgress(max > 0 ? Math.min(100, (h.scrollTop / max) * 100) : 0);
      const sects = ['intro', 's1', 's2', 's3', 'notes', 'biblio', 'cite'];
      let cur = 'intro';
      for (const id of sects) {
        const el = document.getElementById(id);
        if (el && el.getBoundingClientRect().top < 200) cur = id;
      }
      setActive(cur);
    };
    document.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => document.removeEventListener('scroll', onScroll);
  }, []);

  const Sn = ({ n, children, marg }) => (
    <sup>
      <a href={'#fn' + n} onClick={(e) => { if (t.notesMode === 'sidenotes') e.preventDefault(); }}>{n}</a>
    </sup>
  );

  return (
    <div className="page">
      <div className="progress"><div style={{ width: progress + '%' }} /></div>

      {/* TOC flottant — dependent on viewport width */}
      <aside className="toc">
        <div className="lbl">Sommaire</div>
        {[
          ['intro', 'Introduction'],
          ['s1', 'I — La résolution comme acte fondateur'],
          ['s2', 'II — Trois discours, trois États'],
          ['s3', 'III — La fracture sud-américaine'],
          ['notes', 'Notes'],
          ['biblio', 'Bibliographie'],
          ['cite', 'Pour citer'],
        ].map(([id, label]) => (
          <a key={id} className={active === id ? 'on' : ''} href={'#' + id}
            onClick={(e) => { e.preventDefault(); document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }}>
            {label}
          </a>
        ))}
      </aside>

      <article className="post container" style={{ padding: '48px 80px 0' }}>
        <div className="crumbs">
          <a href="#/home" onClick={(e) => { e.preventDefault(); go('home'); }}>Carnet</a> &nbsp;/&nbsp;
          <a href="#/pole" onClick={(e) => { e.preventDefault(); go('pole'); }}>Genre &amp; géopolitique</a> &nbsp;/&nbsp; n°&nbsp;042
        </div>
        <div className="kicker">Analyse · Genre &amp; géopolitique</div>
        <h1>L'<em>homonationalisme</em> a-t-il une diplomatie&nbsp;?</h1>
        <p className="deck">
          Retour sur dix ans de discours sur les droits LGBTQI+ aux Nations&nbsp;unies — et sur ce qu'ils
          font à la diplomatie occidentale comme à ses contestataires.
        </p>
        <div className="meta-strip">
          <div><div className="lbl">Publié</div>14 avril 2026</div>
          <div><div className="lbl">Lecture</div>≈ 38 min · 7&nbsp;842 mots</div>
          <div><div className="lbl">Pôle</div>Genre &amp; géopolitique</div>
          <div><div className="lbl">ID</div><span className="mono">carnet:2026-042</span></div>
        </div>

        <div className="body-grid">
          <div className="col" id="intro">
            <p>
              <span className="lettrine">L</span>orsque le Conseil des droits de l'homme des Nations&nbsp;unies adopte, en juin 2011, sa résolution&nbsp;17/19
              sur l'orientation sexuelle et l'identité de genre, le geste paraît modeste : un texte court, voté
              à une majorité étroite (23 voix contre 19), demandant un rapport au Haut-Commissariat. Ce vote
              constitue pourtant <em>le</em> précédent ; tout ce que je veux examiner ici en découle ou s'y oppose<Sn n={1}/>.
            </p>
            <p>
              Quinze ans plus tard, le paysage diplomatique a basculé. La défense des droits LGBTQI+ est devenue,
              tour à tour, un marqueur d'identité occidentale, une <em>monnaie</em> dans les rapports Nord-Sud,
              un enjeu de polarisation interne dans les démocraties libérales, et un vecteur d'instrumentalisation
              tant par certains États « progressistes » que par leurs adversaires déclarés<Sn n={2}/>.
            </p>

            <h2 id="s1">I — La résolution comme acte fondateur</h2>
            <p>
              Il faut revenir à la séquence elle-même. Le projet sud-africain, soutenu par le Brésil, prend
              forme dans un contexte où l'Afrique du Sud post-apartheid se rêve médiatrice morale du Sud
              global. La résolution n'aurait pas la même portée si elle avait été portée par la France ou
              les Pays-Bas&nbsp;: c'est précisément l'origine non occidentale du texte qui rend son adoption
              politiquement coûteuse pour les opposants.
            </p>
            <p>
              On peut objecter que cette généalogie a été rapidement effacée. Dès 2013, le <em>Free&nbsp;and Equal</em>
              campaign du Haut-Commissariat est porté par des voix essentiellement anglo-saxonnes. La diplomatie
              américaine, sous Obama puis Biden, fait des droits LGBTQI+ un axe explicite de sa politique
              étrangère<Sn n={3}/>. La France, plus tardivement et plus discrètement, lui emboîte le pas.
            </p>

            <blockquote>
              « Le pinkwashing n'est pas le mensonge d'un État qui maquillerait sa violence ; c'est le travail
              quotidien de redéfinition de ce que vaut, internationalement, la qualité d'État de droit. »
            </blockquote>

            <h2 id="s2">II — Trois discours, trois États</h2>
            <p>
              Pour rendre tangible cette mécanique, il faut comparer trois cas. Le premier est celui d'Israël,
              qui a fait des droits LGBTQI+ un argument central de sa <em>brand identity</em> internationale
              dès le milieu des années 2000. Le deuxième est celui des Pays-Bas, dont la diplomatie
              gay-friendly est plus ancienne et plus institutionnalisée mais infléchie depuis 2024. Le troisième
              est celui de la Fédération de Russie, qui mobilise depuis 2013 le rejet des « valeurs LGBTQ »
              comme étendard d'une diplomatie « anti-impérialiste » à destination du Sud global<Sn n={4}/>.
            </p>
            <p>
              Ce dernier point mérite qu'on s'y arrête. Le récit russe est efficace précisément parce qu'il
              s'appuie sur l'asymétrie hégémonique du discours pro-LGBTQI+ : si ce discours apparaît
              comme un produit d'exportation occidental, son rejet apparaît comme un acte de souveraineté.
              C'est cette ambiguïté que mes terrains en Centrafrique et en RDC m'ont forcée à prendre au
              sérieux.
            </p>

            <h2 id="s3">III — La fracture sud-américaine</h2>
            <p>
              Reste un cas qui ne rentre dans aucune des deux cases précédentes : celui de l'Amérique latine,
              où des États au profil très différent (Argentine, Brésil, Chili, Colombie, Mexique) ont, à des
              moments différents, porté les mêmes textes au Conseil des droits de l'homme — sans qu'on puisse
              parler d'un « bloc » homogène, ni d'un alignement net sur l'agenda nord-américain.
            </p>
          </div>

          {/* Sidenotes */}
          <div className="marg">
            <div className="sn"><span className="n">1</span>Sur le contexte du vote, voir Saiz (2014), p.&nbsp;47 sq. — référence essentielle pour comprendre la stratégie sud-africaine.</div>
            <div className="sn"><span className="n">2</span>Je reprends, en la déplaçant, la formule de Puar (2007) sur l'« assemblage » homonationaliste.</div>
            <div className="sn"><span className="n">3</span>Voir le <em>Presidential Memorandum on International Initiatives to Advance the Human Rights of LGBT Persons</em>, 6&nbsp;décembre 2011.</div>
            <div className="sn"><span className="n">4</span>Sur la séquence russe, voir l'analyse en cours dans le billet <a href="#/article/ukraine-marges" onClick={(e) => { e.preventDefault(); go('article', 'ukraine-marges'); }} style={{ borderBottom: '1px dotted', color: 'inherit' }}>« Quand les marges remontent au centre »</a>.</div>
          </div>
        </div>

        {/* Notes classiques (mode bascule) */}
        <div className="footnotes-classic" id="notes">
          <h3>Notes</h3>
          <ol>
            <li id="fn1">Sur le contexte du vote, voir Saiz (2014), p.&nbsp;47 sq.</li>
            <li id="fn2">Je reprends, en la déplaçant, la formule de Puar (2007).</li>
            <li id="fn3">Voir le <em>Presidential Memorandum on International Initiatives to Advance the Human Rights of LGBT Persons</em>, 6&nbsp;décembre 2011.</li>
            <li id="fn4">Sur la séquence russe, voir le billet « Quand les marges remontent au centre ».</li>
          </ol>
        </div>

        <div className="tail" id="biblio">
          <h3>Bibliographie</h3>
          <ul className="biblio">
            <li>Farris, Sara R., 2017, <em>In the Name of Women's Rights. The Rise of Femonationalism</em>, Durham, Duke University Press.</li>
            <li>Massad, Joseph, 2007, <em>Desiring Arabs</em>, Chicago, University of Chicago Press.</li>
            <li>Puar, Jasbir K., 2007, <em>Terrorist Assemblages. Homonationalism in Queer Times</em>, Durham, Duke University Press.</li>
            <li>Saiz, Ignacio, 2014, « Bracketing Sexuality », <em>Health and Human Rights</em>, vol.&nbsp;6, n°&nbsp;2, p.&nbsp;43&#x2011;82.</li>
          </ul>

          <div className="citation" id="cite">
            <div className="lbl">Pour citer cet article</div>
            <div className="body">
              Aussel Delamaide, Alice. « L'<em>homonationalisme</em> a-t-il une diplomatie&nbsp;? Retour sur dix ans
              de discours sur les droits LGBTQI+ aux Nations&nbsp;unies », <em>Carnet</em>, n°&nbsp;42, 14&nbsp;avril 2026,
              <span className="url">&nbsp;https://carnet.aliceosdel.org/2026/04/homonationalisme-diplomatie</span>.
            </div>
            <div className="acts">
              <a onClick={() => navigator.clipboard?.writeText("Aussel Delamaide, Alice. « L'homonationalisme a-t-il une diplomatie ? », Carnet, 14 avril 2026.")}>Copier</a>
              <a>BibTeX</a>
              <a>RIS</a>
              <a>Zotero</a>
            </div>
          </div>

          <div className="related">
            <h3>Dans le même pôle</h3>
            <div className="grid">
              {POSTS.filter((p) => p.pole === 'genre-geopolitique' && p.slug !== 'homonationalisme-diplomatie').slice(0, 2)
                .concat(POSTS.filter((p) => p.slug === 'puar-vingt-ans' || p.slug === 'pinkwashing'))
                .slice(0, 4).map((p) => (
                <a key={p.slug} href={'#/article/' + p.slug} onClick={(e) => { e.preventDefault(); go('article', p.slug); }}>
                  <div className="d">{p.date}</div>
                  <div className="t">{p.title}</div>
                </a>
              ))}
            </div>
          </div>
        </div>
      </article>
    </div>
  );
};

const Archives = ({ go }) => {
  const byYear = {};
  POSTS.slice().sort((a, b) => b.dateY.localeCompare(a.dateY)).forEach((p) => {
    const y = p.dateY.slice(0, 4);
    (byYear[y] = byYear[y] || []).push(p);
  });
  return (
    <div className="page">
      <section className="hero" style={{ paddingBottom: 32 }}>
        <div className="container">
          <div className="meta">Archives</div>
          <h1>Tous les billets, par&nbsp;année.</h1>
          <p className="lede">Le carnet est versionné : chaque billet a un numéro, une date de publication et,
            le cas échéant, une date de mise à jour. Les fiches thématiques sont régulièrement révisées.</p>
        </div>
      </section>
      <section className="container" style={{ paddingTop: 24 }}>
        {Object.keys(byYear).sort().reverse().map((y) => (
          <div key={y} className="arch-year">
            <h2>{y} <span className="mono" style={{ fontSize: 14, color: 'var(--b-muted)', fontWeight: 400 }}>· {byYear[y].length} billet{byYear[y].length > 1 ? 's' : ''}</span></h2>
            {byYear[y].map((p) => (
              <div key={p.num} className="arch-row" onClick={() => go('article', p.slug)}>
                <div className="d">{p.dateY}</div>
                <div className="ty">{p.type}</div>
                <div className="t">{p.title}</div>
                <div className="p">{POLES[p.pole]}</div>
              </div>
            ))}
          </div>
        ))}
      </section>
    </div>
  );
};

const PolePage = ({ go, slug }) => {
  // overview if no slug, else single pole
  if (!slug) {
    return (
      <div className="page">
        <section className="hero">
          <div className="container">
            <div className="meta">Pôles thématiques</div>
            <h1>Cinq <em>pôles</em> de recherche.</h1>
            <p className="lede">Chaque billet appartient à un pôle. Les pôles sont stables ; ils dessinent
              le programme du carnet et de la thèse en construction.</p>
          </div>
        </section>
        <section className="container" style={{ padding: '40px 80px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
            {Object.entries(POLES).slice(0, 5).map(([s, n]) => {
              const count = POSTS.filter((p) => p.pole === s).length;
              return (
                <a key={s} className="arch-row" style={{ gridTemplateColumns: '1fr 80px', cursor: 'pointer' }}
                  href={'#/pole/' + s} onClick={(e) => { e.preventDefault(); go('pole', s); }}>
                  <div>
                    <div className="ty">#{s}</div>
                    <div className="t" style={{ fontSize: 24, marginTop: 8 }}>{n}</div>
                  </div>
                  <div className="p" style={{ fontSize: 14 }}>{count} billet{count > 1 ? 's' : ''}</div>
                </a>
              );
            })}
          </div>
        </section>
      </div>
    );
  }
  const posts = POSTS.filter((p) => p.pole === slug);
  return (
    <div className="page">
      <section className="pole-hero">
        <div className="container">
          <div className="kicker mono">Pôle · #{slug}</div>
          <h1>{POLES[slug]}</h1>
          <p>
            {{
              'genre-geopolitique': "Comment le genre devient un opérateur de la politique internationale — et inversement.",
              'lgbtqi-international': "Vingt ans de diplomatie autour de l'orientation sexuelle et de l'identité de genre, lus depuis le Sud.",
              'humanitaire-genre': "Ce que mes années de coordination humanitaire m'ont enseigné sur les angles morts de l'aide internationale.",
              'migrations-exil': "Persécutions liées au genre, statut de réfugié·e LGBTQI+, jurisprudence en mouvement.",
              'conflits-minorites': "Les minorités de genre dans la guerre — Ukraine, RDC, Centrafrique, ailleurs.",
            }[slug]}
          </p>
          <div className="meta">
            <span>{posts.length} billet{posts.length > 1 ? 's' : ''}</span>
            <span>·</span>
            <a className="mono" style={{ color: 'var(--b-accent)', cursor: 'pointer' }} onClick={() => go('pole')}>← tous les pôles</a>
          </div>
        </div>
      </section>
      <section className="container">
        {posts.map((p) => (
          <article key={p.num} className="item" onClick={() => go('article', p.slug)}>
            <div className="lcol">
              <div className="num">n°&nbsp;{p.num}</div>
              <div className="date">{p.date.split(' ').slice(0, 2).join(' ')}</div>
              <div>{p.date.split(' ').slice(2).join(' ')}</div>
              <div className="read">{p.read}</div>
            </div>
            <div>
              <div className="kicker">{p.type}</div>
              <h2>{p.title}</h2>
              <p>{p.excerpt}</p>
            </div>
            <div className="rcol">
              <div className="lk">Lire →</div>
            </div>
          </article>
        ))}
      </section>
    </div>
  );
};

const About = () => (
  <div className="page about">
    <section style={{ padding: '80px 0 0' }}>
      <div className="narrow">
        <div className="sans" style={{ fontSize: 11, letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--b-accent)', marginBottom: 14 }}>À propos</div>
        <h1>Alice <em>Aussel Delamaide</em></h1>
        <p className="lede">
          Coordinatrice humanitaire en reconversion vers la recherche en études de genre.
          Ce carnet rassemble mes notes de travail.
        </p>
        <p>
          J'ai passé dix ans en zones de conflit et de crise — Ukraine, Centrafrique, République démocratique
          du Congo, Madagascar — comme coordinatrice humanitaire. Je termine cette année un master 1 en
          études de genre à l'EHESS, j'entame un M2 en septembre 2026, et un projet doctoral prend
          forme autour de l'instrumentalisation politique des droits LGBTQI+ dans les rapports
          internationaux.
        </p>
        <p>
          J'écris pour Le Cavalier Bleu, dans la collection <em>Convergences</em>, un livre sur le sujet.
          Le carnet en est l'atelier visible : notes datées, citables, ouvertes. Il prend la suite,
          d'une certaine manière, du modèle <em>Hypothèses</em>, qui a suspendu les nouvelles ouvertures
          fin 2024.
        </p>
      </div>
    </section>

    <section style={{ padding: '64px 0 0' }}>
      <div className="narrow">
        <h2 className="sec">Terrains</h2>
        {[
          ['2023 — 2025', 'Ukraine', "Coordinatrice terrain · Mykolaïv, Kherson. Programmes d'urgence et de protection."],
          ['2020 — 2023', 'République centrafricaine', 'Coordination de mission · supervision de cinq bases.'],
          ['2018 — 2020', 'Rép. dém. du Congo', 'Nord-Kivu et Ituri. Prévention des violences basées sur le genre.'],
          ['2016 — 2018', 'Madagascar', 'Coordination régionale · ONG de développement.'],
          ['2014 — 2016', 'France', 'Plaidoyer humanitaire · Médecins du Monde, Action contre la Faim.'],
        ].map(([d, p, n], i) => (
          <div key={i} className="row">
            <div className="d">{d}</div>
            <div className="p">{p}</div>
            <div className="n">{n}</div>
          </div>
        ))}
      </div>
    </section>

    <section style={{ padding: '64px 0 0' }}>
      <div className="narrow">
        <h2 className="sec">Recherche</h2>
        {[
          ['2026 →', 'M2 Études de genre · EHESS', 'Mémoire : « Géopolitique des droits LGBTQI+ : entre instrumentalisation et émancipation ».'],
          ['2025 — 26', 'M1 Études de genre · EHESS', 'Soutenu en juin 2026 (mention TB).'],
          ['Doctorat', 'Projet en construction · EHESS', 'Direction pressentie. Inscription envisagée à la rentrée 2027.'],
        ].map(([d, p, n], i) => (
          <div key={i} className="row">
            <div className="d">{d}</div>
            <div className="p">{p}</div>
            <div className="n">{n}</div>
          </div>
        ))}
      </div>
    </section>

    <section style={{ padding: '64px 0 0' }}>
      <div className="narrow">
        <h2 className="sec">Publications</h2>
        <div className="row" style={{ gridTemplateColumns: '160px 1fr' }}>
          <div className="d">2027 · à paraître</div>
          <div>
            <div className="p">L'instrumentalisation politique des droits LGBTQI+</div>
            <div className="n" style={{ marginTop: 6 }}>Le Cavalier Bleu, coll. <em>Convergences</em>. Manuscrit en cours.</div>
          </div>
        </div>
      </div>
    </section>

    <section style={{ padding: '64px 0 0' }}>
      <div className="narrow">
        <h2 className="sec">Colophon</h2>
        <p style={{ maxWidth: 720 }}>
          Site auto-hébergé via Ghost dockerisé, thème custom Handlebars. Polices Source Serif&nbsp;4
          et Inter, servies depuis Bunny Fonts (équivalent de Google Fonts sans tracking). Aucun
          pisteur. Aucune dépendance JavaScript externe pour la lecture. Code source ouvert,
          contenu sous licence CC BY-NC-SA&nbsp;4.0.
        </p>
      </div>
    </section>
  </div>
);

// -------- App --------
const App = () => {
  const [route, go] = useRoute();
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);

  // apply tweaks to the document
  React.useEffect(() => {
    document.documentElement.style.setProperty('--b-accent', t.accent);
    document.documentElement.style.setProperty('--b-density', t.density === 'serre' ? '0.7' : '1');
    // Background: also derive a slightly warmer/cooler "paper" tone for citation block etc.
    document.documentElement.style.setProperty('--b-bg', t.bg);
    const paperMap = {
      '#f6f5f1': '#fbfaf6', // ivoire chaud (défaut)
      '#fdfcf8': '#ffffff', // presque blanc
      '#ffffff': '#fafafa', // blanc pur
      '#f1efe8': '#f7f5ee', // craie
      '#eee9dd': '#f4efe2', // parchemin
      '#e9eaec': '#f2f2f4', // froid pâle
    };
    document.documentElement.style.setProperty('--b-paper', paperMap[t.bg] || t.bg);
    document.body.classList.toggle('notes-classic', t.notesMode === 'classic');
    document.body.classList.toggle('no-lettrine', !t.lettrine);
    document.body.classList.toggle('justify', !!t.justify);
  }, [t.accent, t.bg, t.density, t.notesMode, t.lettrine, t.justify]);

  let page;
  if (route.path === 'article') page = <Article go={go} t={t} />;
  else if (route.path === 'archives') page = <Archives go={go} />;
  else if (route.path === 'pole') page = <PolePage go={go} slug={route.id} />;
  else if (route.path === 'about') page = <About />;
  else page = <Home go={go} />;

  return (
    <>
      <Header route={route} go={go} />
      {page}
      <Footer go={go} />

      <TweaksPanel title="Tweaks">
        <TweakSection title="Identité visuelle">
          <TweakColor label="Couleur d'accent" value={t.accent}
            options={['#5a3a7a', '#8a3a3a', '#1f3a5a', '#3a3a3a', '#2d5a3d']}
            onChange={(v) => setTweak('accent', v)} />
          <TweakColor label="Fond" value={t.bg}
            options={['#f6f5f1', '#fdfcf8', '#ffffff', '#f1efe8', '#eee9dd', '#e9eaec']}
            onChange={(v) => setTweak('bg', v)} />
        </TweakSection>
        <TweakSection title="Article">
          <TweakRadio label="Notes" value={t.notesMode}
            options={[{ value: 'sidenotes', label: 'En marge' }, { value: 'classic', label: 'Classiques' }]}
            onChange={(v) => setTweak('notesMode', v)} />
          <TweakToggle label="Lettrine en ouverture" value={t.lettrine}
            onChange={(v) => setTweak('lettrine', v)} />
          <TweakToggle label="Texte justifié" value={t.justify}
            onChange={(v) => setTweak('justify', v)} />
        </TweakSection>
        <TweakSection title="Flux d'accueil">
          <TweakRadio label="Densité" value={t.density}
            options={[{ value: 'aere', label: 'Aéré' }, { value: 'serre', label: 'Serré' }]}
            onChange={(v) => setTweak('density', v)} />
        </TweakSection>
      </TweaksPanel>
    </>
  );
};

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
