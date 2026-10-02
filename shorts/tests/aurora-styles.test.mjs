import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import postcss from 'postcss';

const stylesheet = new URL('../hyperframes/aurora-explain/theme.css', import.meta.url);
const css = await readFile(stylesheet, 'utf8');
const parseTheme = () => postcss.parse(css, {from: fileURLToPath(stylesheet)});

function topLevelRule(root, selector) {
  const matches = root.nodes.filter(node => node.type === 'rule' && node.selector === selector);
  assert.equal(matches.length, 1, `Expected one top-level rule for ${selector}`);
  return matches[0];
}

function declaration(rule, property) {
  const matches = rule.nodes.filter(node => node.type === 'decl' && node.prop === property);
  assert.equal(matches.length, 1, `Expected one ${property} declaration in ${rule.selector}`);
  return matches[0].value;
}

test('Aurora stylesheet parses strictly before browser rendering', () => {
  // Regex markup assertions do not detect unclosed CSS blocks.
  assert.doesNotThrow(parseTheme);
});

test('Aurora input state rules cannot swallow subsequent selectors', () => {
  const root = parseTheme();
  const expected = [
    [".ax-object-bg.is-auth[data-role='input']", 'border-color', 'rgba(85,221,255,.38)'],
    [".ax-object-bg.is-normalized[data-role='input']", 'border-color', 'rgba(105,148,255,.52)'],
    [".ax-object-bg.is-success[data-role='input']", 'border-color', 'rgba(76,220,151,.46)'],
    [".ax-object.is-success[data-role='input'] .ax-input-control", 'border-color', 'rgba(76,220,151,.6)'],
    [".ax-object.is-success[data-role='input'] .ax-input-control em", 'color', '#74e3aa'],
  ];
  for (const [selector, property, value] of expected) {
    const rule = topLevelRule(root, selector);
    assert.ok(rule.nodes.every(node => node.type === 'decl'), `${selector} must contain declarations only`);
    assert.equal(declaration(rule, property), value);
  }
  topLevelRule(root, '.ax-checklist-items');
  topLevelRule(root, '.ax-caption-zone');
  topLevelRule(root, '.ax-photo-stage:after');
});

test('Aurora full-bleed stage and fixed text layers retain their own rules', () => {
  const root = parseTheme();
  const stage = topLevelRule(root, '.ax-scene--full-bleed .ax-stage');
  assert.equal(declaration(stage, 'left'), '0');
  assert.equal(declaration(stage, 'right'), '0');
  assert.equal(declaration(stage, 'overflow'), 'visible');
  assert.equal(declaration(topLevelRule(root, '.ax-heading'), 'z-index'), '2');
  assert.equal(declaration(topLevelRule(root, '.ax-caption-zone'), 'z-index'), '8');
});

test('Aurora CSS regression guard rejects the missing-success-brace mutation', () => {
  const closedRule = ".ax-object-bg.is-success[data-role='input']{border-color:rgba(76,220,151,.46)}";
  assert.ok(css.includes(closedRule), 'Mutation must exercise the actual success rule');
  const broken = css.replace(closedRule, closedRule.slice(0, -1));
  assert.throws(() => postcss.parse(broken), error => (
    error.name === 'CssSyntaxError' && error.reason === 'Unclosed block'
  ));
});
