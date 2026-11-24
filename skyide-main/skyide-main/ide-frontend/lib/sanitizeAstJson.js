// src/lib/sanitizeAstJson.js
import * as Blockly from 'blockly';

/* Utilities */
const hasBlockType = (t) => !!Blockly.Blocks[t];
const isAst = (t) => typeof t === 'string' && t.startsWith('ast_');
const isSkippableAst = (t) =>
  t === 'ast_Comment' || (isAst(t) && !hasBlockType(t));

/**
 * Return a sanitized block, OR:
 * - another block (if this one is stripped and has a next)
 * - null (if stripped and nothing to splice in)
 *
 * This function preserves the chain by splicing `next.block`
 * when we drop a skippable ast_* node.
 */
function sanitizeBlock(block) {
  if (!block || typeof block !== 'object') return block;

  // 1) If this is a comment or unknown ast_*: strip it
  if (isSkippableAst(block.type)) {
    // splice in its next.block (if it exists); otherwise drop it
    return block.next && block.next.block ? sanitizeBlock(block.next.block) : null;
  }

  // 2) Keep this block and sanitize subtrees

  // inputs
  if (block.inputs && typeof block.inputs === 'object') {
    for (const key of Object.keys(block.inputs)) {
      const input = block.inputs[key];
      if (!input) continue;
      if (input.block) {
        const child = sanitizeBlock(input.block);
        input.block = child || undefined; // remove if null
      }
      if (input.shadow) {
        const shadow = sanitizeBlock(input.shadow);
        input.shadow = shadow || undefined; // remove if null
      }
      // If both were removed, keep the input shell; Blockly tolerates empty inputs.
    }
  }

  // next
  if (block.next && typeof block.next === 'object') {
    const n = block.next.block ? sanitizeBlock(block.next.block) : null;
    if (n) {
      block.next.block = n;
    } else {
      delete block.next; // nothing to point to
    }
  }

  // statements array (rare in serialized JSON, but handle if present)
  if (Array.isArray(block.statements)) {
    block.statements = block.statements
      .map(sanitizeBlock)
      .filter(Boolean);
  }

  return block;
}

/** Top-level workspace JSON sanitizer. */
export function sanitizeAstJson(workspaceJson) {
  if (!workspaceJson || typeof workspaceJson !== 'object') return workspaceJson;

  const cloned = JSON.parse(JSON.stringify(workspaceJson));

  // Typical: { blocks: { blocks: [ ...root blocks... ] } }
  if (cloned.blocks && Array.isArray(cloned.blocks.blocks)) {
    cloned.blocks.blocks = cloned.blocks.blocks
      .map(sanitizeBlock)
      .filter(Boolean);
  } else if (Array.isArray(cloned.blocks)) {
    cloned.blocks = cloned.blocks
      .map(sanitizeBlock)
      .filter(Boolean);
  }

  return cloned;
}