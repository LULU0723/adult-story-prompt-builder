import { DATA_VERSION, validateDataset, validateItem } from './schema.js';
import { deriveProviders } from './providers.js';
import { makeDirectedBinding, makeEgalitarianBinding } from './binding.js';
import { chooseAnchor } from './anchor.js';
import { generateStages } from './stage.js';
import { evaluateEligibility } from './eligibility.js';

const items = await fetch('./data/adult-items.json').then(r => r.json());

function characterProfiles(name) {
  const female = id => ({ id, displayName:id, adult:true, anatomy:['vagina','breasts','anus','mouth','hands'], equipment:[], gender:'female', presentation:'androgynous' });
  const male = id => ({ id, displayName:id, adult:true, anatomy:['penis','anus','mouth','hands'], equipment:[], gender:'male', presentation:'masculine' });
  if (name === 'ff-toy') { const a=female('lin'); a.equipment=['strap_on']; return [a,female('shuang')]; }
  if (name === 'f-mreceiver') return [female('lin'),male('shuang')];
  if (name === 'mm') return [male('lin'),male('shuang')];
  return [female('lin'),female('shuang')];
}

function makeFixtureContext(masterSeed, sourceItems = items, options = {}) {
  const characters = characterProfiles(options.profile ?? 'ff');
  const sceneConfig = { location: options.publicScene ? 'public_space' : 'bedroom', privacy: options.publicScene ? 'public' : 'private', props:['mirror'] };
  const slotsByStage = options.slotsByStage ?? {1:1,2:1,3:1};
  const binding = options.bindingMode === 'egalitarian' ? makeEgalitarianBinding(characters.map(c=>c.id)) : makeDirectedBinding(characters[0].id, characters[1].id);
  return {
    characters, slotsByStage,
    ctx:{
      dataVersion:DATA_VERSION, masterSeed, userMaxIntensity:options.intensity ?? 3,
      providers:deriveProviders(characters,sceneConfig),
      characterState:Object.fromEntries(characters.map(c=>[c.id,{mobility:'free'}])),
      actorId:characters[0].id, receiverId:characters[1].id, participantCount:characters.length,
      binding, minAnchorStage:2, maxAnchorStage:3, slotsByStage,
      selectedIds:new Set(), selectedItems:[], preferredTags:new Set(['control']), permissionByItem:{}, rerollCounts:Array(12).fill(0)
    }
  };
}

function generateForSeed(seed, sourceItems = items, options = {}) {
  const {ctx,slotsByStage,characters}=makeFixtureContext(seed,sourceItems,options);
  const anchorResult=chooseAnchor(sourceItems,ctx);
  if(!anchorResult.chosen)return {error:'no-anchor',characters};
  const generation=generateStages(sourceItems,ctx,anchorResult.chosen,slotsByStage);
  return {anchor:anchorResult.chosen,generation,characters};
}

function signature(result){
  if(result.error)return result.error;
  return JSON.stringify({
    anchor:[result.anchor.item.id,result.anchor.stage,result.anchor.direction?.actorId??null],
    steps:result.generation.results.map(step=>[step.kind,step.item?.id??null,step.direction?.actorId??null,step.direction?.receiverId??null])
  });
}
function assert(condition,message,failures){if(!condition)failures.push(message);}

const MATRIX=[
  {name:'directed-111-i3-ff',bindingMode:'directed',slotsByStage:{1:1,2:1,3:1},intensity:3,profile:'ff'},
  {name:'egal-111-i3-ff',bindingMode:'egalitarian',slotsByStage:{1:1,2:1,3:1},intensity:3,profile:'ff'},
  {name:'directed-222-i3-ff',bindingMode:'directed',slotsByStage:{1:2,2:2,3:2},intensity:3,profile:'ff'},
  {name:'egal-222-i3-ff',bindingMode:'egalitarian',slotsByStage:{1:2,2:2,3:2},intensity:3,profile:'ff'},
  {name:'directed-232-i3-ff',bindingMode:'directed',slotsByStage:{1:2,2:3,3:2},intensity:3,profile:'ff'},
  {name:'egal-232-i3-ff',bindingMode:'egalitarian',slotsByStage:{1:2,2:3,3:2},intensity:3,profile:'ff'},
  {name:'directed-111-i1-ff',bindingMode:'directed',slotsByStage:{1:1,2:1,3:1},intensity:1,profile:'ff'},
  {name:'egal-111-i2-ff',bindingMode:'egalitarian',slotsByStage:{1:1,2:1,3:1},intensity:2,profile:'ff'},
  {name:'directed-111-i2-fftoy',bindingMode:'directed',slotsByStage:{1:1,2:1,3:1},intensity:2,profile:'ff-toy'},
  {name:'egal-111-i3-fftoy',bindingMode:'egalitarian',slotsByStage:{1:1,2:1,3:1},intensity:3,profile:'ff-toy'},
  {name:'directed-111-i3-mreceiver',bindingMode:'directed',slotsByStage:{1:1,2:1,3:1},intensity:3,profile:'f-mreceiver'},
  {name:'egal-111-i3-mm',bindingMode:'egalitarian',slotsByStage:{1:1,2:1,3:1},intensity:3,profile:'mm'},
  {name:'directed-111-i3-public',bindingMode:'directed',slotsByStage:{1:1,2:1,3:1},intensity:3,profile:'ff',publicScene:true}
];

export function runRegressionSuite(){
  const failures=[];
  const validation=validateDataset(items);
  assert(validation.errors.length===0,`dataset has ${validation.errors.length} validation error(s)`,failures);

  const summary={configs:MATRIX.length,seedsPerConfig:300,generations:0,anchorFailures:0,anchorErrors:0,orderFailures:0,ghostKeys:0,runtimeExceptions:0,emptySlots:0,allNonAnchorEmpty:0,validationErrors:validation.errors.length,byConfig:{}};

  for(const config of MATRIX){
    const stats={anchorFailures:0,anchorErrors:0,orderFailures:0,ghostKeys:0,runtimeExceptions:0,emptySlots:0,allNonAnchorEmpty:0};
    for(let i=0;i<300;i++){
      const seed=`${config.name}-${i}`;
      summary.generations++;
      try{
        const normal=generateForSeed(seed,items,config);
        const reversed=generateForSeed(seed,[...items].reverse(),config);
        if(normal.error){stats.anchorFailures++;failures.push(`${seed}: ${normal.error}`);continue;}

        const anchorId=normal.anchor.item.id;
        const mainAnchorSteps=normal.generation.results.filter(step=>step.kind==='main'&&step.item?.id===anchorId);
        const errors=normal.generation.results.filter(step=>step.kind==='anchor-error');
        const empty=normal.generation.results.filter(step=>step.kind==='empty');
        const nonAnchorEmitted=normal.generation.results.filter(step=>step.item&&step.kind!=='main'&&step.kind!=='anchor-error');

        if(mainAnchorSteps.length!==1){stats.anchorFailures++;failures.push(`${seed}: anchor ${anchorId} emitted as main ${mainAnchorSteps.length} times`);}
        if(errors.length>0){stats.anchorErrors+=errors.length;failures.push(`${seed}: ${errors.length} anchor-error step(s)`);}
        stats.emptySlots+=empty.length;
        if(normal.generation.results.length>1&&nonAnchorEmitted.length===0){stats.allNonAnchorEmpty++;failures.push(`${seed}: every non-anchor slot was empty`);}
        if(signature(normal)!==signature(reversed)){stats.orderFailures++;failures.push(`${seed}: result changed when fixture JSON order was reversed`);}

        const realIds=new Set(normal.characters.map(c=>c.id));
        const ghosts=Object.keys(normal.generation.finalState??{}).filter(id=>!realIds.has(id));
        if(ghosts.length>0){stats.ghostKeys+=ghosts.length;failures.push(`${seed}: ghost characterState key(s): ${ghosts.join(', ')}`);}

        if(normal.anchor.direction){
          const main=mainAnchorSteps[0];
          if(main&&(main.direction.actorId!==normal.anchor.direction.actorId||main.direction.receiverId!==normal.anchor.direction.receiverId)){
            stats.anchorFailures++;failures.push(`${seed}: pinned egalitarian anchor direction was not executed`);
          }
        }

        if(normal.anchor.reachability?.direct===false){
          const enablerId=normal.anchor.reachability.enabler;
          const enablerSteps=normal.generation.results.filter(step=>step.item?.id===enablerId);
          if(enablerSteps.length!==1){stats.anchorFailures++;failures.push(`${seed}: required enabler ${enablerId} emitted ${enablerSteps.length} times`);}
          const enablerStep=enablerSteps[0];
          const expected=normal.anchor.reachability?.enablerDirection;
          if(expected&&enablerStep&&(enablerStep.direction.actorId!==expected.actorId||enablerStep.direction.receiverId!==expected.receiverId)){
            stats.anchorFailures++;failures.push(`${seed}: required enabler direction did not match pinned direction`);
          }
        }
      }catch(error){stats.runtimeExceptions++;failures.push(`${seed}: runtime exception: ${error?.stack??error}`);}
    }
    summary.byConfig[config.name]=stats;
    for(const key of ['anchorFailures','anchorErrors','orderFailures','ghostKeys','runtimeExceptions','emptySlots','allNonAnchorEmpty'])summary[key]+=stats[key];
  }

  try{
    const {ctx}=makeFixtureContext('eligibility-check');
    const base=items[0];
    const needsThree={...base,id:'test_needs_three',minParticipants:3};
    const threeResult=evaluateEligibility(needsThree,{...ctx,stage:1});
    assert(!threeResult.eligible&&threeResult.rejections.some(r=>r.ruleId==='participants.min'),'minParticipants regression',failures);

    const unsupported={...base,id:'test_group_shape',roleShape:'group'};
    const groupResult=evaluateEligibility(unsupported,{...ctx,stage:1});
    assert(!groupResult.eligible&&groupResult.rejections.some(r=>r.ruleId==='roleShape.unsupported'),'roleShape regression',failures);

    const badSwitch={...base,id:'test_switch_anchor',roleSwitch:true,anchorSuitability:1,stageHints:[2],roleShape:'directed'};
    assert(validateItem(badSwitch).errors.some(e=>e.includes('roleSwitch items cannot be anchors')),'schema must reject roleSwitch anchor',failures);

    const badMutualState={...base,id:'test_mutual_state',roleShape:'mutual',anchorSuitability:0,promptTemplate:'雙方互動',setsMobility:{receiver:'restricted'}};
    assert(validateItem(badMutualState).errors.some(e=>e.includes('mutual items cannot set asymmetric mobility')),'schema must reject mutual asymmetric mobility',failures);
  }catch(error){summary.runtimeExceptions++;failures.push(`eligibility/schema regression exception: ${error?.stack??error}`);}

  return {passed:failures.length===0,summary,failures:failures.slice(0,200)};
}

const button=document.querySelector('#run-tests');
if(button){button.addEventListener('click',()=>{const output=document.querySelector('#test-output');try{output.textContent=JSON.stringify(runRegressionSuite(),null,2);}catch(error){output.textContent=JSON.stringify({passed:false,fatal:String(error?.stack??error)},null,2);}});}
