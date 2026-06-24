import { registry } from '../src/openapi-registry';

console.log('Registry definitions:', registry.definitions.length);
registry.definitions.forEach((def, i) => {
  console.log(`Definition ${i}:`, JSON.stringify(def, null, 2).substring(0, 200));
});
