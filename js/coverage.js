import { DATA_VERSION, validateDataset } from './schema.js';
import { deriveProviders } from './providers.js';
import { makeDirectedBinding, makeEgalitarianBinding } from './binding.js';
import { chooseAnchor } from './anchor.js';
import { generateStages } from './stage.js';
import { evaluateEligibility } from './eligibility.js';

const items = await fetch('./data/adult-items.json').then(r => r.json());
const validation = validateDataset(items);

function female(id){return {id,displayName:id,adult:true,gender:'female',presentation:'androgynous',anatomy:['vagina','breasts','anus','mouth','hands'],equipment:[]};}
function male(id){return {id,displayName:id,adult:true,gender:'male',presentation:'masculine',anatomy:['penis','anus','mouth','hands'],equipment:[]};}

const CONFIGS = [
  {name:'directed-ff',binding:'directed',chars:[female('a'),female('b')],intensity:3,privacy:'private'},
  {name:'egal-ff',binding:'egalitarian',chars:[female('a'),female('b')],intensity:3,privacy:'private'},
  {name:'directed-ff-toy',binding:'directed',chars:[Object.assign(female('a'),{equipment:['strap_on']}),female('b')],intensity:3,privacy:'private'},
  {name:'directed-fm',binding:'directed',chars:[female('a'),male('b')],intensity:3,privacy:'private'},
  {name:'directed-mm',binding:'directed',chars:[male('a'),male('b')],intensity:3,privacy:'private'},
  {name:'egal-mm',binding:'egalitarian',chars:[male('a'),male('b')],intensity:3,privacy:'private'},
  {name:'directed-ff-medium',binding:'directed',chars:[female('a'),female('b')],intensity:2,privacy:'private'},
  {name:'directed-ff-light',binding:'directed',chars:[female('a'),female('b')],intensity:1,privacy:'private'},
  {name:'directed-ff-public',binding:'directed',chars:[female('a'),female('b')],intensity:3,privacy:'public'}
];

function buildContext(config, seed){
  const sceneConfig={location:config.privacy==='public'?'public_space':'bedroom',privacy:config.privacy,props:['mirror']};
  const binding=config.binding==='egalitarian'?makeEgalitarianBinding(config.chars.map(c=>c.id)):makeDirectedBinding(config.chars[0].id,config.chars[1].id);
  const slotsByStage={1:1,2:1,3:1};
  return {
    slotsByStage,
    ctx:{
      dataVersion:DATA_VERSION,masterSeed:seed,userMaxIntensity:config.intensity,
      providers:deriveProviders(config.chars,sceneConfig),
      characterState:Object.fromEntries(config.chars.map(c=>[c.id,{mobility:'free'}])),
      actorId:config.chars[0].id,receiverId:config.chars[1].id,participantCount:config.chars.length,
      binding,minAnchorStage:2,maxAnchorStage:3,slotsByStage,
      selectedIds:new Set(),selectedItems:[],preferredTags:new Set(['control']),permissionByItem:{},rerollCounts:Array(12).fill(0)
    }
  };
}

function eligibleAtAnyStage(item, ctx){
  for(const stage of item.stageHints??[]){
    const result=evaluateEligibility(item,{...ctx,stage});
    if(result.eligible)return true;
  }
  return false;
}

export function runCoverage(){
  const selectedCounts=new Map(items.map(i=>[i.id,0]));
  const eligibleCounts=new Map(items.map(i=>[i.id,0]));
  const anchorCounts=new Map(items.map(i=>[i.id,0]));
  const byConfig={};
  let mobilityChangedRuns=0;
  let totalRuns=0;

  for(const config of CONFIGS){
    const base=buildContext(config,`${config.name}-eligibility`).ctx;
    const eligible=items.filter(item=>eligibleAtAnyStage(item,base));
    eligible.forEach(item=>eligibleCounts.set(item.id,eligibleCounts.get(item.id)+1));

    let emptySlots=0;
    let generatedSlots=0;
    let preservationRejects=0;
    let duplicateRejects=0;
    let anchorsFound=0;

    for(let i=0;i<100;i++){
      totalRuns++;
      const {ctx,slotsByStage}=buildContext(config,`${config.name}-${i}`);
      const anchor=chooseAnchor(items,ctx).chosen;
      if(!anchor)continue;
      anchorsFound++;
      anchorCounts.set(anchor.item.id,anchorCounts.get(anchor.item.id)+1);
      const generation=generateStages(items,ctx,anchor,slotsByStage);
      let changed=false;
      for(const step of generation.results){
        generatedSlots++;
        if(step.kind==='empty')emptySlots++;
        if(step.item)selectedCounts.set(step.item.id,(selectedCounts.get(step.item.id)??0)+1);
        for(const rejection of step.diagnostics?.topRejections??[]){
          if(rejection.ruleId==='anchor.preservation')preservationRejects+=rejection.count;
          if(rejection.ruleId==='item.non_repeatable')duplicateRejects+=rejection.count;
        }
        const before=step.diagnostics?.stateBefore??{};
        const after=step.state??{};
        for(const id of Object.keys(after)){
          if(before[id]?.mobility!==after[id]?.mobility)changed=true;
        }
      }
      if(changed)mobilityChangedRuns++;
    }

    const emptyRate=generatedSlots?emptySlots/generatedSlots:0;
    byConfig[config.name]={
      binding:config.binding,
      intensity:config.intensity,
      privacy:config.privacy,
      eligibleItems:eligible.length,
      anchorsFound,
      emptySlots,
      generatedSlots,
      emptyRate,
      emptyLevel:emptyRate>0.15?'warning':'ok',
      nonRepeatableRejections:duplicateRejects,
      preservationRejections:preservationRejects
    };
  }

  const deadItems=items.filter(item=>(eligibleCounts.get(item.id)??0)===0).map(item=>item.id);
  const neverSelected=items.filter(item=>(selectedCounts.get(item.id)??0)===0).map(item=>item.id);
  const neverAnchor=items.filter(item=>item.anchorSuitability>0&&(anchorCounts.get(item.id)??0)===0).map(item=>item.id);
  const mobilityItemCount=items.filter(item=>Object.keys(item.setsMobility??{}).length>0).length;

  return {
    validation,
    totals:{
      items:items.length,
      configs:CONFIGS.length,
      generatedRuns:totalRuns,
      mobilityChangingItems:mobilityItemCount,
      mobilityChangingItemRatio:items.length?mobilityItemCount/items.length:0,
      runsWithMobilityChange:mobilityChangedRuns,
      mobilityRunRatio:totalRuns?mobilityChangedRuns/totalRuns:0
    },
    deadItems,
    neverSelected,
    neverAnchor,
    byConfig,
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
