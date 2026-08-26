import { compileStoryPrompt } from './compiler-v01.js';

const characters = [
  { id:'A', displayName:'甲', adult:true, gender:'female', presentation:'androgynous', anatomy:['vagina','mouth','hands'], equipment:[], traits:{dominance:'high'} },
  { id:'B', displayName:'乙', adult:true, gender:'female', presentation:'feminine', anatomy:['vagina','mouth','hands'], equipment:[], traits:{dominance:'low'} }
];

const generation = {
  results: [
    {
      stage:1,
      kind:'accent',
      direction:{actorId:'A',receiverId:'B'},
      item:{id:'intro',label:'起始互動',promptTemplate:'{actor} 先靠近 {receiver}。'}
    },
    {
      stage:2,
      kind:'secondary',
      forcedItemId:'enabler',
      direction:{actorId:'A',receiverId:'B'},
      item:{id:'enabler',label:'必要鋪墊',promptTemplate:'{actor} 先調整 {receiver} 的位置。'}
    },
    {
      stage:3,
      kind:'main',
      direction:{actorId:'A',receiverId:'B'},
      item:{id:'anchor',label:'主軸事件',promptTemplate:'{actor} 將主軸事件落在 {receiver} 身上。'}
    }
  ]
};

function count(text, fragment) {
  return text.split(fragment).length - 1;
}

function assert(condition, message, failures) {
  if (!condition) failures.push(message);
}

export function runCompilerSmokeTests() {
  const failures = [];
  const prompt = compileStoryPrompt({
    generation,
    characters,
    sceneConfig:{location:'bedroom',privacy:'private',props:['mirror']}
  });

  assert(prompt.includes('【任務】') && prompt.includes('【角色設定】') && prompt.includes('【敘事控制】') && prompt.includes('【主軸】') && prompt.includes('【互動節點】'), 'required compiler sections missing', failures);
  assert(prompt.includes('甲 先靠近 乙。'), 'actor/receiver placeholders were not rendered', failures);
  assert(!prompt.includes('{actor}') && !prompt.includes('{receiver}'), 'unresolved placeholders remain', failures);
  assert(count(prompt, '甲 將主軸事件落在 乙 身上。') === 1, 'Main Anchor action text should appear exactly once', failures);
  assert(prompt.includes('【起始階段】') && prompt.includes('【推進階段】') && prompt.includes('【深化階段】'), 'stage headings missing', failures);
  assert(prompt.includes('在此階段執行上方主軸'), 'Main Anchor stage marker missing', failures);
  assert(prompt.includes('必要鋪墊：甲 先調整 乙 的位置。'), 'forced enabler should be marked as required setup', failures);
  assert(prompt.includes('自然、清楚的成人用語') && prompt.includes('快速升溫'), 'default story controls missing', failures);
  assert(prompt.includes('身體設定：陰道、口部、雙手'), 'character physical constraints missing or not localized', failures);

  const custom = compileStoryPrompt({
    generation,
    characters,
    sceneConfig:{privacy:'semi'},
    storyConfig:{length:'ultra_short',pace:'slow_burn',lexicalDirectness:'direct',descriptionFocus:'dialogue',adultContentShare:'high'}
  });
  assert(custom.includes('極短篇') && custom.includes('慢熱') && custom.includes('直接明確的成人用語') && custom.includes('優先描寫對話') && custom.includes('成人互動是主要篇幅'), 'custom story controls not applied', failures);

  const noAnchor = compileStoryPrompt({generation:{results:[]},characters});
  assert(noAnchor.includes('沒有可用的主軸事件；不要自行捏造新的核心玩法。'), 'missing-anchor guard text missing', failures);

  const anchorErrorGeneration = {
    results: [
      {
        stage:1,
        kind:'accent',
        direction:{actorId:'A',receiverId:'B'},
        item:{id:'intro',label:'起始互動',promptTemplate:'{actor} 先靠近 {receiver}。'}
      },
      {
        stage:3,
        kind:'anchor-error',
        direction:{actorId:'A',receiverId:'B'},
        item:{id:'failed-anchor',label:'失敗主軸',promptTemplate:'{actor} 執行不應輸出的失敗主軸。'}
      }
    ]
  };
  const anchorErrorPrompt = compileStoryPrompt({generation:anchorErrorGeneration,characters});
  assert(anchorErrorPrompt.includes('沒有可用的主軸事件'), 'anchor-error path should report no usable anchor', failures);
  assert(!anchorErrorPrompt.includes('不應輸出的失敗主軸'), 'anchor-error item leaked into interaction beats', failures);

  return { passed: failures.length === 0, failures, samplePrompt: prompt };
}

const button = document.querySelector('#run-compiler-tests');
if (button) {
  button.addEventListener('click', () => {
    const output = document.querySelector('#compiler-test-output');
    output.textContent = JSON.stringify(runCompilerSmokeTests(), null, 2);
  });
}
