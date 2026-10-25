// Symbolic navigation drawings, not measured celestial coordinates.
// Each group uses its one alpha star plus two representative stars.
// Trace only the reference geometry, never its background, lettering or frame.
function chartPoints(points) {
  const xs = points.map(([x]) => x), ys = points.map(([,y]) => y);
  const cx = (Math.min(...xs) + Math.max(...xs)) / 2;
  const cy = (Math.min(...ys) + Math.max(...ys)) / 2;
  const scale = 280 / Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys));
  return points.map(([x,y]) => [+(scale * (x-cx)).toFixed(2), +(scale * (y-cy)).toFixed(2)]);
}
window.COSMIC_TOPICS = [
  { id: 'hanul', name: '한울', kind: '쌍둥이자리 · 네모형', tint: '#c3d8ff',
    points: chartPoints([[90,92],[112,92],[133,98],[222,154],[263,170],[250,198],[225,224],[153,195],[126,188],[74,159],[70,138],[290,167],[215,249]]),
    lines: [[0,1,2,3,4,5,6,7,8,9,10,0],[4,11],[6,12]],
    stars: [{name:'카스토르',latin:'Castor',bayer:'α Gem',anchor:0},{name:'폴룩스',latin:'Pollux',bayer:'β Gem',anchor:4},{name:'알헤나',latin:'Alhena',bayer:'γ Gem',anchor:8}] },
  { id: 'sangmok', name: '상목', kind: '물고기자리', tint: '#a9dedf',
    points: chartPoints([[141,42],[135,51],[135,58],[151,79],[147,119],[150,157],[152,191],[174,167],[189,151],[203,140],[254,110],[276,103],[284,91],[296,91],[301,97],[296,111],[281,115]]),
    lines: [[0,1,2,3,4,5,6,7,8,9,10,11],[11,12,13,14,15,16,11]],
    stars: [{name:'알레샤',latin:'Alrescha',bayer:'α Psc',anchor:6},{name:'푸말사마카',latin:'Fumalsamakah',bayer:'β Psc',anchor:0},{name:'에타 물고기자리',latin:'Eta Piscium',bayer:'η Psc',anchor:13}] },
  { id: 'aigu', name: '소모둠 소개', kind: '우주인자리 · 오리온자리 대표별', tint: '#e3d1af', image: './assets/cosmos/astronaut-constellation-mono.png',
    points: chartPoints([[12,-145],[42,-126],[48,-94],[25,-70],[-10,-73],[-33,-98],[-27,-129],[-50,-46],[48,-42],[52,20],[29,50],[50,112],[75,132],[-35,50],[-61,110],[-82,122],[-54,12],[-90,-16],[-113,-55],[-131,-63],[91,-12],[125,-48],[139,-43],[0,23],[0,-44],[23,-20],[-25,-22],[0,0],[15,22],[-16,30],[0,50],[12,79],[-8,94],[53,75],[-38,79],[-57,88],[73,99],[82,65],[94,-23],[111,-35],[-72,-23],[-98,-38]]),
    lines: [[0,1,2,3,4,5,6,0],[4,7,16,13,10,9,8,3],[7,8],[16,23,9],[7,17,18,19],[8,20,21,22],[13,14,15],[10,11,12],[4,24,25,8],[4,26,24],[24,27,30,31,11],[27,28,9],[27,29,13],[30,32,34,13],[31,33,10],[34,35,14],[31,36,11],[33,37,9],[25,38,39,21],[26,40,41,18]],
    stars: [{name:'베텔게우스',latin:'Betelgeuse',bayer:'α Ori',anchor:8,position:[-2,-139],presentation:{title:'소모둠 소개 · 발표자료',url:'https://canva.link/9fh9vaxdbwepyuu',embedUrl:'https://www.canva.com/design/DAHYogozUbk/cIL4cYgQje-YSgnnOMsTLg/view?embed'}},{name:'리겔',latin:'Rigel',bayer:'β Ori',anchor:15,position:[-80,28]},{name:'벨라트릭스',latin:'Bellatrix',bayer:'γ Ori',anchor:7,position:[70,119]}] },
  { id: 'seungwon', name: '승원', kind: '쌍둥이자리 · 두 사람형', tint: '#d5c6fa',
    points: chartPoints([[149,56],[187,78],[221,55],[123,86],[139,99],[156,93],[122,116],[162,142],[162,187],[221,222],[192,157],[240,197],[233,126],[266,148],[285,150],[255,165]]),
    lines: [[0,1,2],[1,5,4,3],[4,6],[4,7,8,9],[7,10,11],[1,12,13,14],[12,15]],
    stars: [{name:'카스토르',latin:'Castor',bayer:'α Gem',anchor:0},{name:'폴룩스',latin:'Pollux',bayer:'β Gem',anchor:2},{name:'알헤나',latin:'Alhena',bayer:'γ Gem',anchor:9}] },
  { id: 'gyeongchan', name: '경찬', kind: '물병자리', tint: '#a5d2f3',
    points: chartPoints([[310,32],[210,101],[130,159],[122,193],[95,214],[92,239],[162,331],[170,278],[234,279],[254,302],[320,337],[199,205],[254,171]]),
    lines: [[0,1,2,3,4,5,6,7,8,9,10],[2,11,12]],
    stars: [{name:'사달멜리크',latin:'Sadalmelik',bayer:'α Aqr',anchor:2},{name:'사달수드',latin:'Sadalsuud',bayer:'β Aqr',anchor:0},{name:'스카트',latin:'Skat',bayer:'δ Aqr',anchor:10}] },
  { id: 'gyeomseo', name: '겸서', kind: '양자리', tint: '#e9cba9',
    points: chartPoints([[53,143],[82,152],[67,174],[230,127],[250,104],[292,132],[235,169],[94,272],[70,318],[314,176]]),
    lines: [[0,1,2,0],[1,3,4,5,3],[2,7,8],[7,6,9],[3,6]],
    stars: [{name:'하말',latin:'Hamal',bayer:'α Ari',anchor:1,book:{title:'LIT · Lost In Translation',subtitle:'겸서 · 소주제 1',pageCount:28,basePath:'./assets/books/lit',pdfUrl:'./assets/books/lit/LIT.pdf'}},{name:'셰라탄',latin:'Sheratan',bayer:'β Ari',anchor:3},{name:'메사르팀',latin:'Mesarthim',bayer:'γ Ari',anchor:7}] },
  { id: 'woohui', name: '우희', kind: '황소자리', tint: '#e5b7a8',
    points: chartPoints([[93,173],[241,240],[286,269],[323,292],[357,269],[365,339],[109,310],[256,354],[313,347],[455,379],[544,399]]),
    lines: [[0,1,2,3,4,5],[6,7,8,5,9,10]],
    stars: [{name:'알데바란',latin:'Aldebaran',bayer:'α Tau',anchor:5},{name:'엘나스',latin:'Elnath',bayer:'β Tau',anchor:0},{name:'알키오네',latin:'Alcyone',bayer:'η Tau',anchor:6}] },
];
