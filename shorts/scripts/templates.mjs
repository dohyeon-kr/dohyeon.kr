import {getTemplate, listTemplates} from '../src/templates/registry.ts';
const id = process.argv[2];
console.log(JSON.stringify(id ? getTemplate(id) : listTemplates(), null, 2));
