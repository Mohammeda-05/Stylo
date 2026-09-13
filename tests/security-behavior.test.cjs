const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

// Exercise service code without loading React Native or contacting production services.
function load(file, stubs = {}, globals = {}) {
  const filename = path.resolve(file);
  const output = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  const module = { exports: {} };
  vm.runInNewContext(output, {
    module, exports: module.exports, console: { error() {}, warn() {} },
    setTimeout, clearTimeout, AbortController,
    require(name) {
      if (name in stubs) return stubs[name];
      if (name.startsWith('.')) return load(path.resolve(path.dirname(filename), name + '.ts'), stubs, globals);
      throw new Error('Unexpected dependency: ' + name);
    }, ...globals,
  }, { filename });
  return module.exports;
}
const valid = {
  overallScore: 0, occasionScore: 80, styleArchetype: 'Classic', feedback: 'Feedback',
  strengths: ['A strength'], improvements: ['An improvement'],
};
const validation = load('services/aiValidation.ts');
test('accepts legitimate zero scores and fenced JSON', () => {
  assert.equal(validation.parseEvaluation('```json\n' + JSON.stringify(valid) + '\n```').overallScore, 0);
});
test('rejects malformed, missing, string and out-of-range scores without fabrication', () => {
  for (const value of ['not JSON', '{}', 'null', JSON.stringify({...valid, overallScore: '85'}),
    JSON.stringify({...valid, overallScore: 101}), JSON.stringify({...valid, strengths: []})]) {
    assert.throws(() => validation.parseEvaluation(value));
  }
});
test('positive language does not manufacture a wardrobe score', () => {
  assert.equal(validation.extractWardrobeScore('Excellent, great, beautiful!'), null);
  assert.equal(validation.extractWardrobeScore('OVERALL SCORE: 8.5/10'), 8.5);
  assert.equal(validation.extractWardrobeScore('SCORE: 85/10'), null);
});
test('AI provider failure rejects every user-facing operation', async () => {
  const service = load('services/aiService.ts', {'./aiTransport': {
    requestAIText: async () => { throw new Error('upstream unavailable'); },
  }});
  const items = [{id:'1', name:'Shirt', category:'Shirt'}];
  for (const call of [() => service.generateAIResponse('hello', []),
    () => service.generateOutfitSuggestions(items),
    () => service.evaluateOutfitForOccasion('evaluate', [], 'image'),
    () => service.generateStyleJourneyInsights('journey', []),
    () => service.generateStyleAssistantResponse('help', [])]) await assert.rejects(call);
});
test('outfits with unknown items cannot become successful suggestions', async () => {
  const service = load('services/aiService.ts', {'./aiTransport': {
    requestAIText: async () => ({text: JSON.stringify({outfits:[{
      name:'Look', description:'Look description', items:['Unknown'], confidence:90,
    }]})}),
  }});
  await assert.rejects(() => service.generateOutfitSuggestions([{id:'1',name:'Shirt',category:'Shirt'}]));
});
test('transport refuses guests before invoking the backend', async () => {
  let called = false;
  const { requestAIText } = load('services/aiTransport.ts', {'../src/lib/supabase': {supabase:{
    auth:{getSession:async()=>({data:{session:null},error:null})},
    functions:{invoke:async()=>{called=true;}},
  }}});
  await assert.rejects(() => requestAIText({messages:[]}));
  assert.equal(called,false);
});
test('transport propagates outages without exposing upstream details', async () => {
  const { requestAIText } = load('services/aiTransport.ts', {'../src/lib/supabase': {supabase:{
    auth:{getSession:async()=>({data:{session:{access_token:'test-only'}},error:null})},
    functions:{invoke:async()=>({data:null,error:new Error('sensitive upstream details')})},
  }}});
  await assert.rejects(() => requestAIText({messages:[]}), error => !error.message.includes('sensitive'));
});
test('production store outages cannot grant mock subscriptions', async () => {
  let storageWrites=0;
  const service = load('services/paymentService.ts', {
    'react-native':{Platform:{OS:'ios'}},
    'expo-constants':{default:{appOwnership:'standalone'}},
    '@react-native-async-storage/async-storage':{default:{setItem:async()=>storageWrites++}},
    'react-native-purchases':{default:{setLogLevel(){},configure:async()=>{},getOfferings:async()=>({current:null})},LOG_LEVEL:{ERROR:0}},
  }, {__DEV__:false, process:{env:{EXPO_PUBLIC_REVENUECAT_API_KEY:'public-test-key'}}}).default;
  await assert.rejects(() => service.getProducts());
  const result = await service.purchaseProduct('monthly');
  assert.equal(result.success,false);
  assert.equal(storageWrites,0);
});
