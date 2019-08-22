const startTemp = 0.2;
const ATTR_CONST = .5;
const REP_CONST = 100;


const DEFAULT_ITER = 500;

// input is a Graph object
function renderGraph(g, iterations) {
  iterations = iterations || DEFAULT_ITER;

  var temp = startTemp;
  for (var i = 0; i < iterations; i++) {
    temp = moveNodes(g, g.nodes, temp);
  }
  g.snapBoundingBox();
}

// repulsive force
function repulsion(u, v) {
  var dx = v.x - u.x;
  var dy = v.y - u.y;

  var norm = (dx ** 2 + dy ** 2) ** .5;
  norm = Math.max(Math.abs(norm), .1);

  return { 
    x : (dx / norm) * REP_CONST,
    y : (dy / norm) * REP_CONST,
  };
}

function attraction(u, v) {
  var springLength = 100;
  var dx = v.x - u.x;
  var dy = v.y - u.y;

  var norm = (dx ** 2 + dy ** 2) ** .5;
  norm = Math.max(Math.abs(norm), .1);

  dx /= norm;
  dy /= norm;

  return {
    x : -ATTR_CONST * (norm - springLength) * dx,
    y : -ATTR_CONST * (norm - springLength) * dy,
  };
}

// return temp for cooling
function moveNodes(g, nodes, temperature) {
  nodes.forEach(v => {
    // repulse all nodes pairwise
    rx = 0;
    ry = 0;

    nodes.forEach(u => {
      if (u === v) return;
      var fr = repulsion(u, v);
      rx += fr.x;
      ry += fr.y;
    })

    // attract connected nodes
    ax = 0;
    ay = 0;
    
    var neighbors = g.adjacency.get(v.index);
    neighbors.forEach(nid => {
      var u = g.ids.get(nid);
      var fa = attraction(u, v);
      ax += fa.x;
      ay += fa.y;
    })

    // sum forces
    v.dx = rx + ax;
    v.dy = ry + ay;
  });

  // apply forces
  nodes.forEach(v => {
    var dx = temperature * v.dx;
    var dy = temperature * v.dy;

    v.x += dx;
    v.y += dy;

    // apply bounding box
    var maxX, maxY, minX, minY;
    var r = v.radius * (1 + Math.random());
    maxX = g.x2 - r;
    minX = g.x1 + r;
    maxY = g.y2 - r;
    minY = g.y1 + r;

    v.x = Math.min(maxX, Math.max(minX, v.x));
    v.y = Math.min(maxY, Math.max(minY, v.y));
  });

  return temperature * .9995;
}