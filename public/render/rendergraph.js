
const startTemp = .9;
const ATTR_CONST = 0.1;
const REP_CONST = 0.08;

// TODO
// figure out how to change repulsion 
// constant based on density of edges
// 

/** 

define circ(n) {
  d = {};
  for (i = 0; i < n; i = i + 1) {
    d[i] = [i+1];
  }
  d[n] = [0];
  return d;
}

*/


const DEFAULT_ITER = 1000;

// input is a Graph object
function renderGraph(g, iterations) {
  iterations = iterations || DEFAULT_ITER;
  
  // make 2-way adjacency
  // where all edges go both ways
  // for cleaner graph layouts
  var adj = new Map();
  g.graph.adjacency.forEach((neighbors, nid) => adj.set(nid, new Set(neighbors)));
  g.graph.adjacency.forEach((neighbors, ni) => {
    neighbors.forEach(nj => adj.get(nj).add(ni));
  });

  var temp = startTemp;
  for (var i = 0; i < iterations; i++) {
    temp = moveNodes(g, adj, g.nodes, temp);
  }
  //  g.snapBoundingBox();

 
  // compute bounds of relX, relY
  var minX = minY = Infinity;
  var maxX = maxY = -Infinity;
  g.nodes.forEach(v => {
    minX = Math.min(v.relX, minX);
    minY = Math.min(v.relY, minY);

    maxX = Math.max(v.relX, maxX);
    maxY = Math.max(v.relY, maxY);
  });

  // map node relX, relY to x, y in bounding box
  var relW = maxX - minX;
  var relH = maxY - minY;

  var bboxW = g.x2 - g.x1;
  var bboxH = g.y2 - g.y1;
  g.nodes.forEach(v => {
    v.x = ((v.relX - minX) / relW) * bboxW + g.x1;
    v.y = ((v.relY - minY) / relH) * bboxH + g.y1;
  });
}

// repulsive force
function repulsion(u, v) {
  var dx = v.relX - u.relX;
  var dy = v.relY - u.relY;

  var norm = (dx ** 2 + dy ** 2) ** .5;

  return { 
    x : (dx / norm) * REP_CONST,
    y : (dy / norm) * REP_CONST,
  };
}

function attraction(u, v) {
  var springLength = 100;
  var dx = v.relX - u.relX;
  var dy = v.relY - u.relY;

  var norm = (dx ** 2 + dy ** 2) ** .5;

  dx /= norm;
  dy /= norm;

  return {
    x : -ATTR_CONST * (norm - springLength) * dx,
    y : -ATTR_CONST * (norm - springLength) * dy,
  };
}

// return temp for cooling
function moveNodes(g, adj, nodes, temperature) {
  var boxw = g.x2 - g.x1;
  var boxh = g.y2 - g.y1;
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
    
    var neighbors = adj.get(v.index);
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

    v.relX += dx;
    v.relY += dy;

    // apply bounding box
    // var maxX, maxY, minX, minY;
    // var r = v.radius;
    // maxX = g.x2 - r;
    // minX = g.x1 + r;
    // maxY = g.y2 - r;
    // minY = g.y1 + r;

    // var reboundX, reboundY; 
    // reboundX = Math.min(Math.abs(v.dx), boxw / 2);
    // reboundY = Math.min(Math.abs(v.dy), boxh / 2);

    // if (v.x > maxX)
    //   v.x -= reboundX;
    
    // if (v.x < minX) 
    //   v.x += reboundX;

    // if (v.y > maxY) 
    //   v.y -= reboundY;

    // if (v.y < minY)
    //   v.y += reboundY;

    // v.x = Math.min(maxX, Math.max(minX, v.x));
    // v.y = Math.min(maxY, Math.max(minY, v.y));
  });

  return temperature * .9995;
}