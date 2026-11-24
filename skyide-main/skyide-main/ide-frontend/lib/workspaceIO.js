import * as Blockly from 'blockly';

const STORAGE_KEY = 'sgk_workspace_v1';

export function saveWorkspace(ws) {
  const json = Blockly.serialization.workspaces.save(ws);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(json));
  console.log('[save] workspace saved');
}

export function loadWorkspace(ws) {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw) {
    Blockly.serialization.workspaces.load(JSON.parse(raw), ws);
    console.log('[load] workspace loaded');
  }
}

export function clearWorkspace(ws) {
  ws.clear();
  console.log('[clear] workspace cleared');
}