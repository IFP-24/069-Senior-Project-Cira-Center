// src/blocks/astShims.js
import * as Blockly from 'blockly';

// Only define if BlockMirror's AST pack didn't already register it.
if (!Blockly.Blocks['ast_Comment']) {
  Blockly.Blocks['ast_Comment'] = {
    init() {
      // BlockMirror’s JSON expects an input named VALUE
      this.appendValueInput('VALUE')
        .setCheck(null)
        .appendField('🗒 comment');
      this.setPreviousStatement(true);
      this.setNextStatement(true);
      this.setColour(160);
      this.setTooltip('Python comment');
    }
  };
}