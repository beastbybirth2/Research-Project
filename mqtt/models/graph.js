const mongoose = require('mongoose');

const GraphSchema = new mongoose.Schema({
  statusArr: Array,
  timestampArr: Array
}, { collection: 'graph' });

const Graph = mongoose.model('Graph', GraphSchema);

module.exports = Graph;
