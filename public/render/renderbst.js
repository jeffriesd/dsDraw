/** updateExtremes
 *    update extreme descendants 
 *    picking only from immediate children 
 *    (only 4 possible choiceS)
 */
function updateExtremes(node) {
  if (node.isLeaf()) {
    node.xleft = node;
    node.xright = node;
    return;
  }

  var childExtremes = node.children().map(n => n.getExtremes());
  // flatten
  childExtremes = childExtremes.reduce((acc, cur) => acc.concat(cur), []);
  var maxDepth = childExtremes.map(n => n.depth).max();

  var deepestNodes = childExtremes.filter(n => n.depth == maxDepth);
  // choose rightmost and leftmost
  node.xleft = deepestNodes[0];
  node.xright = deepestNodes[deepestNodes.length - 1];
}

function updateChildDepths(node, depth) {
  if (node == null) return;
  node.depth = depth;
  updateChildDepths(node.leftChild(), depth+1);
  updateChildDepths(node.rightChild(), depth+1);
}

function updateExtremesBottomUp(node) {
  if (node == null) return;

  updateExtremesBottomUp(node.leftChild());
  updateExtremesBottomUp(node.rightChild());
  updateExtremes(node);
}

function renderBST(bstCanvasObject, bst) {
  var root = bst.root;
  if (root == null) return;
  updateChildDepths(root, 0);
  updateExtremesBottomUp(root);

  setupTR(root, 0, root.xleft, root.xright, bstCanvasObject.minSep);
  petrifyTR(bstCanvasObject, root, 0);

  // give bstCanvasObject nodes coordinates from 
  // internal BST data structure
  bst.ids.forEach((node, id) => {
    canvasNode = bstCanvasObject.ids.get(id);
    canvasNode.x = node.x;
    canvasNode.y = node.y;
  })
}

function renderHeap(heap) {
  var root = heap.root;
  if (root == null) return;
  updateChildDepths(root, 0);
  updateExtremesBottomUp(root);

  setupTR(root, 0, root.xleft, root.xright, heap.minSep);
  petrifyTR(heap, root, 0);
}

function setupTR(root, depth, rmost, lmost, minSep) {
  var L = null;
  var R = null;
  var LL = null;   
  var LR = null;   
  var RL = null;   
  var RR = null;   

  if (root) {
    L = root.leftChild();
    R = root.rightChild();
    LL = L ? L.xleft : null;
    LR = L ? L.xright : null;
    RL = R ? R.xleft : null;
    RR = R ? R.xright : null;
  }

  var curSep = 0, rootSep = 0;
  var lOffSum = 0, rOffSum = 0;

  if (root == null) {
    if (lmost) lmost.depth = -1;
    if (rmost) rmost.depth = -1;
    return;
  }
  else {
    root.relY = depth;
    L = root.leftChild();
    R = root.rightChild();

    setupTR(L, depth+1, LR, LL, minSep);
    setupTR(R, depth+1, RR, RL, minSep);

    if (root.isLeaf()) {
      rmost = root;
      lmost = root;

      rmost.depth = depth;
      lmost.depth = depth;
      rmost.rootOffset = 0;
      lmost.rootOffset = 0;
      root.parOffset = 0;
    }
    else {
      // superimpose
      curSep = minSep;
      rootSep = minSep;
      lOffSum = 0;
      rOffSum = 0;

      while (L && R) {
        if (curSep < minSep) {
          push = minSep - curSep;
          rootSep += push;
          curSep = minSep;
        }

        if (L.rightChild()) {
          lOffSum += L.parOffset;
          curSep -= L.parOffset;
          L = L.rightChild();
        }
        else {
          lOffSum -= L.parOffset;
          curSep += L.parOffset;
          L = L.leftChild();
        }

        if (R.leftChild()) {
          rOffSum -= R.parOffset;
          curSep -= R.parOffset;
          R = R.leftChild();
        }
        else {
          rOffSum += R.parOffset;
          curSep += R.parOffset;
          R = R.rightChild();
        }
      }

      // set offset in root and include it
      // in accumulated offsets for L and R
      root.parOffset = Math.floor((rootSep + 1) / 2);

      lOffSum -= root.parOffset;
      rOffSum += root.parOffset;

      if ((root.leftChild() == null) || ((RL && LL) && RL.depth > LL.depth)) {
        lmost = RL;
        lmost.rootOffset += root.parOffset;
      }
      else {
        lmost = LL;
        if (lmost !== rmost)
          lmost.rootOffset -= root.parOffset;
      }

      if ((root.rightChild() == null) || (LR && RR) && (LR.depth > RR.depth)) {
        rmost = LR;
        rmost.rootOffset -= root.parOffset;
      }
      else {
        rmost = RR;

        if (lmost !== rmost)
          rmost.rootOffset += root.parOffset;
      }

      // create 'threads'
      if (L && L !== root.leftChild()) {
        RR.hasThread = true;
        RR.parOffset = Math.abs((RR.rootOffset - root.parOffset) - lOffSum);

        if (lOffSum - root.parOffset <= RR.rootOffset)
          RR.left = L;
        else
          RR.right = L;
      }
      else if (R && R !== root.rightChild()) {
        LL.hasThread = true;
        LL.parOffset = Math.abs((LL.rootOffset - root.parOffset) - rOffSum);

        if (rOffSum + root.parOffset >= LL.rootOffset)
          LL.right = R;
        else
          LL.left = R;
      }
    }
  }
}

function petrifyTR(bstCanvasObject, root, x) {
  if (root == null) return;
  root.relX = x;

  // assign absolute coordinates
  root.x = bstCanvasObject.x1 + root.relX * bstCanvasObject.cellSize;
  root.y = bstCanvasObject.y1 + root.relY * (bstCanvasObject.cellSize + bstCanvasObject.depthSep);

  if (root.hasThread) {
    root.hasThread = false;
    root.left = null;
    root.right = null;
  }
  petrifyTR(bstCanvasObject, root.leftChild(), x - root.parOffset);
  petrifyTR(bstCanvasObject, root.rightChild(), x + root.parOffset);
}
