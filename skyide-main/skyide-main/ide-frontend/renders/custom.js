import * as Blockly from 'blockly';

class CustomConstantProvider extends Blockly.blockRendering.ConstantProvider {
  constructor() {
    super();
    this.NOTCH_WIDTH = 20;
    this.NOTCH_HEIGHT = 10;
    this.CORNER_RADIUS = 2;
    this.TAB_WIDTH = 12;
    this.TAB_HEIGHT = 8;
  }
  makeRectPrevNext() {
    const w = this.NOTCH_WIDTH, h = this.NOTCH_HEIGHT;
    const path = (dir) => Blockly.utils.svgPaths.line([
      Blockly.utils.svgPaths.point(0, h),
      Blockly.utils.svgPaths.point(dir * w, 0),
      Blockly.utils.svgPaths.point(0, -h)
    ]);
    return { width: w, height: h, pathLeft: path(1), pathRight: path(-1) };
  }
  makeRectIO() {
    const w = this.TAB_WIDTH, h = this.TAB_HEIGHT;
    const path = (dir) => Blockly.utils.svgPaths.line([
      Blockly.utils.svgPaths.point(-w, 0),
      Blockly.utils.svgPaths.point(0, dir * h),
      Blockly.utils.svgPaths.point(w, 0)
    ]);
    return { width: w, height: h, pathUp: path(-1), pathDown: path(1) };
  }
  init() {
    super.init();
    this.RECT_PREV_NEXT = this.makeRectPrevNext();
    this.RECT_INPUT_OUTPUT = this.makeRectIO();
  }
  shapeFor(connection) {
    const checks = connection.getCheck && connection.getCheck();
    switch (connection.type) {
      case Blockly.ConnectionType.INPUT_VALUE:
      case Blockly.ConnectionType.OUTPUT_VALUE:
        if (checks && (checks.includes('Number') || checks.includes('String'))) return this.RECT_INPUT_OUTPUT;
        return this.PUZZLE_TAB;
      case Blockly.ConnectionType.PREVIOUS_STATEMENT:
      case Blockly.ConnectionType.NEXT_STATEMENT:
        return this.NOTCH;
      default:
        throw new Error('Unknown connection type');
    }
  }
}
class CustomRenderer extends Blockly.blockRendering.Renderer {
  makeConstants_() { return new CustomConstantProvider(); }
}
Blockly.blockRendering.register('custom_renderer', CustomRenderer);