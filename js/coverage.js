import { DATA_VERSION, validateDataset } from './schema.js';
import { deriveProviders } from './providers.js';
import { makeDirectedBinding, makeEgalitarianBinding } from './binding.js';
import { chooseAnchor } from './anchor.js';
import { generateStages } from './stage.js';

const items = await fetch('./data/adult-items.json').then(r => r.json());
const validation = validateDataset(items);

function female(id){return {id,displayName:id,adult:true,gender:'female',presentation:'androgynous',anatomy:['vagina','breasts','anus','mouth','hands'],equipment:[]};}
function male(id){return {id,displayName:id,adult:true,gender:'male',presentation:'masculine',anatomy:['penis','anus','mouth','hands'],equipment:[]};}
function withToy(character){character.equipment=['strap_on'];return character;}

const S111={1:1,2:1,3:1};
const S232={1:2,2:3,3:2};
const RUNS_PER_CONFIG=100;

const CONFIGS = [
  {name:'directed-ff-111-i3',binding:'directed',chars:[female('a'),female('b')],intensity:3,privacy:'private',slots:S111},
  {name:'egal-ff-111-i3',binding:'egalitarian',chars:[female('a'),female('b')],intensity:3,privacy:'private',slots:S111},
  {name:'directed-ff-232-i3',binding:'directed',chars:[female('a'),female('b')],intensity:3,privacy:'private',slots:S232},
  {name:'egal-ff-232-i3',binding:'egalitarian',chars:[female('a'),female('b')],intensity:3,privacy:'private',slots:S232},
  {name:'directed-ff-232-i2',binding:'directed',chars:[female('a'),female('b')],intensity:2,privacy:'private',slots:S232},
  {name:'egal-ff-232-i2',binding:'egalitarian',chars:[female('a'),female('b')],intensity:2,privacy:'private',slots:S232},
  {name:'directed-ff-232-i1',binding:'directed',chars:[female('a'),female('b')],intensity:1,privacy:'private',slots:S232},
  {name:'egal-ff-232-i1',binding:'egalitarian',chars:[female('a'),female('b')],intensity:1,privacy:'private',slots:S232},
  {name:'directed-ff-toy-a-232',binding:'directed',chars:[withToy(female('a')),female('b')],intensity:3,privacy:'private',slots:S232},
  {name:'directed-ff-toy-b-232',binding:'directed',chars:[female('a'),withToy(female('b'))],intensity:3,privacy:'private',slots:S232},
  {name:'egal-ff-toy-232',binding:'egalitarian',chars:[withToy(female('a')),female('b')],intensity:3,privacy:'private',slots:S232},
  {name:'directed-fm-232',binding:'directed',chars:[female('a'),male('b')],intensity:3,privacy:'private',slots:S232},
  {name:'directed-mm-232',binding:'directed',chars:[male('a'),male('b')],intensity:3,privacy:'private',slots:S232},
  {name:'egal-mm-232',binding:'egalitarian',chars:[male('a'),male('b')],intensity:3,privacy:'private',slots:S232},
  {name:'directed-ff-public-232',binding:'directed',chars:[female('a'),female('b')],intensity:3,privacy:'public',slots:S232},
  {name:'egal-ff-public-232',binding:'egalitarian',chars:[female('a'),female('b')],intensity:3,privacy:'public',slots:S232},
  {name:'directed-ff-semi-232',binding:'directed',chars:[female('a'),female('b')],intensity:3,privacy:'semi',slots:S232},
  {name:'egal-ff-semi-232',binding:'egalitarian',chars:[female('a'),female('b')],intensity:3,privacy:'semi',slots:S232}
];

function buildContext(config, seed){
  const location=config.privacy==='private'?'bedroom':config.privacy==='semi'?'semi_private_space':'public_space';
  const sceneConfig={location,privacy:config.privacy,props:['mirror']};
  const binding=config.binding==='egalitarian'?makeEgalitarianBinding(config.chars.map(c=>c.id)):makeDirectedBinding(config.chars[0].id,config.chars[1].id);
  const slotsByStage=config.slots;
  return {
    slotsByStage,
    ctx:{
      dataVersion:DATA_VERSION,masterSeed:seed,userMaxIntensity:config.intensity,
      providers:deriveProviders(config.chars,sceneConfig),
      characterState:Object.fromEntries(config.chars.map(c=>[c.id,{mobility:'free'}])),
      actorId:config.chars[0].id,receiverId:config.chars[1].id,participantCount:config.chars.length,
      binding,minAnchorStage:2,maxAnchorStage:3,slotsByStage,
      selectedIds:new Set(),selectedItems:[],preferredTags:new Set(['control']),permissionByItem:{},rerollCounts:Array(16).fill(0)
    }
  };
}

export function runCoverage(){
  const selectedCounts=new Map(items.map(i=>[i.id,0]));
  const anchorCounts=new Map(items.map(i=>[i.id,0]));
  const observedEligibleCounts=new Map(items.map(i=>[i.id,0]));
  const globallyReachable=new Set();
  const byConfig={};
  let totalRuns=0;

  for(const config of CONFIGS){
    const eligibleSeen=new Set();
    let emptySlots=0;
    let drawableSlots=0;
    let preservationRejects=0;
    let duplicateRejects=0;
    let anchorsFound=0;
    let mobilityChangedRuns=0;
    let eligiblePoolTotal=0;
    const stagePool={1:{total:0,slots:0},2:{total:0,slots:0},3:{total:0,slots:0}};

    for(let i=0;i<RUNS_PER_CONFIG;i++){
      totalRuns++;
      const {ctx,slotsByStage}=buildContext(config,`${config.name}-${i}`);
      const anchorResult=chooseAnchor(items,ctx);
      for(const candidate of anchorResult.candidates??[]){
        eligibleSeen.add(candidate.item.id);
        globallyReachable.add(candidate.item.id);
      }
      const anchor=anchorResult.chosen;
      if(!anchor)continue;
      anchorsFound++;
      anchorCounts.set(anchor.item.id,anchorCounts.get(anchor.item.id)+1);
      globallyReachable.add(anchor.item.id);
      eligibleSeen.add(anchor.item.id);

      const generation=generateStages(items,ctx,anchor,slotsByStage);
      let changed=false;
      for(const step of generation.results){
        if(step.kind!=='main'&&step.kind!=='anchor-error'){
          drawableSlots++;
          if(step.kind==='empty')emptySlots++;
          const pool=step.diagnostics?.eligiblePool??step.candidates?.length??0;
          eligiblePoolTotal+=pool;
          stagePool[step.stage].total+=pool;
          stagePool[step.stage].slots++;
        }
        if(step.item){
          selectedCounts.set(step.item.id,(selectedCounts.get(step.item.id)??0)+1);
          globallyReachable.add(step.item.id);
          eligibleSeen.add(step.item.id);
        }
        for(const candidate of step.candidates??[]){
          eligibleSeen.add(candidate.item.id);
          globallyReachable.add(candidate.item.id);
        }
        for(const entry of step.excluded??[]){
          for(const rejection of entry.rejections??[]){
            if(rejection.ruleId==='anchor.preservation')preservationRejects++;
            if(rejection.ruleId==='item.non_repeatable')duplicateRejects++;
          }
        }
        const before=step.diagnostics?.stateBefore??{};
        const after=step.state??{};
        for(const id of Object.keys(after)){
          if(before[id]?.mobility!==after[id]?.mobility)changed=true;
        }
      }
      if(changed)mobilityChangedRuns++;
    }

    eligibleSeen.forEach(id=>observedEligibleCounts.set(id,(observedEligibleCounts.get(id)??0)+1));
    const emptyRate=drawableSlots?emptySlots/drawableSlots:0;
    byConfig[config.name]={
      binding:config.binding,
      intensity:config.intensity,
      privacy:config.privacy,
      slotsByStage:config.slots,
      runs:RUNS_PER_CONFIG,
      eligibleItems:eligibleSeen.size,
      anchorsFound,
      emptySlots,
      drawableSlots,
      emptyRate,
      emptyLevel:emptyRate>0.15?'warning':'ok',
      avgEligiblePool:drawableSlots?eligiblePoolTotal/drawableSlots:0,
      avgEligiblePoolByStage:Object.fromEntries(Object.entries(stagePool).map(([stage,value])=>[stage,value.slots?value.total/value.slots:0])),
      mobilityChangedRuns,
      mobilityRunRatio:anchorsFound?mobilityChangedRuns/anchorsFound:0,
      nonRepeatableRejections:duplicateRejects,
      preservationRejections:preservationRejects
    };
  }

  const deadItems=items.filter(item=>!globallyReachable.has(item.id)).map(item=>item.id);
  const neverSelected=items.filter(item=>(selectedCounts.get(item.id)??0)===0).map(item=>item.id);
  const neverAnchor=items.filter(item=>item.anchorSuitability>0&&(anchorCounts.get(item.id)??0)===0).map(item=>item.id);
  const mobilityItemCount=items.filter(item=>Object.keys(item.setsMobility??{}).length>0).length;

  return {
    validation,
    totals:{
      items:items.length,
      configs:CONFIGS.length,
      runsPerConfig:RUNS_PER_CONFIG,
      generatedRuns:totalRuns,
      mobilityChangingItems:mobilityItemCount,
      mobilityChangingItemRatio:items.length?mobilityItemCount/items.length:0
    },
    metricNotes:{
      deadItems:'Never observed as an anchor candidate, normal draw candidate, or selected item in any canonical run.',
      avgEligiblePool:'Mean normal-slot candidate count after hard eligibility and anchor preservation. Read per-stage values to detect stage-specific pool collapse.',
      mobility:'Compare mobilityRunRatio only between configs with the same slotsByStage. The denominator is anchorsFound so no-anchor runs do not dilute the ratio. Reassess mobility only if changing-item ratio <10%, fixed-slot run ratio <20%, and preservation rejections are approximately zero.',
      nonRepeatableRejections:'Counts duplicate-rule rejections for items already selected earlier in the same generation. This reflects filled-slot history and is not a candidate-pool health metric; use avgEligiblePool for pool health.',
      selectionCounts:'Absolute selections across the current canonical config set. Do not compare raw counts across revisions that add, remove, or materially change configs; compare within the same config set instead.'
    },
    deadItems,
    neverSelected,
    neverAnchor,
    byConfig,
    observedEligibleConfigCounts:Object.fromEntries([...observedEligibleCounts.entries()].sort((a,b)=>b[1]-a[1])),
    selectionCounts:Object.fromEntries([...selectedCounts.entries()].sort((a,b)=>b[1]-a[1])),
    anchorCounts:Object.fromEntries([...anchorCounts.entries()].sort((a,b)=>b[1]-a[1]))
  };
}

const button=document.querySelector('#run');
if(button){
  button.addEventListener('click',()=>{
    const output=document.querySelector('#output');
    try{output.textContent=JSON.stringify(runCoverage(),null,2);}catch(error){output.textContent=JSON.stringify({error:String(error?.stack??error)},null,2);}
  });
}
