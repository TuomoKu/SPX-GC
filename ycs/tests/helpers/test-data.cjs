'use strict';
// The test-only round sources that DataSources used to seed at startup.
// Production never seeds data; tests that rely on these values write them.
function testData(stages) {
  const document = { version: 2, revision: 0, sources: {}, connections: {}, mappings: [], defaults: [] };
  for (const stage of stages) {
    const id = `test.${stage.id}.currentRound`;
    document.sources[id] = { label: `${stage.title || stage.id} · Current round`, value: 'SWISS ROUND 11 OF 15' };
    document.mappings.push({ stage: stage.id, graphic: 'ticker', field: 'f5', source: id });
  }
  return document;
}
module.exports = { testData };
