const mathjax = require("mathjax-node");
const connManager = require("./server-connection");

mathjax.start();

mathjax.config({
  MathJax: 
  {
    SVG: 
    {
      // font: "",
      // linebreaks: { automatic: true },
      tex2jax: { 
        inlineMath: [['$','$'], ['\\(','\\)']],
        inline: [["$", "$"]],
        processEscapes: true,
      },
    }
  }
});

/** renderFormula
 *    use mathjax to render formula to svg,
 *    write svg to server and send URL source
 */
function renderFormula(text, callback) {
  mathjax.typeset({
    math: text,
    format: "inline-TeX",
    svg: true,
  }, callback);
}


module.exports = {
  renderFormula: renderFormula,
}
