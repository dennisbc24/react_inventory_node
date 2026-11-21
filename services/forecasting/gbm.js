function mulberry32(seed) {
  let state = seed >>> 0;
  return function random() {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function quantileSorted(sorted, q) {
  if (!sorted.length) return 0;
  if (sorted.length === 1) return sorted[0];
  const position = (sorted.length - 1) * Math.max(0, Math.min(1, q));
  const lower = Math.floor(position);
  const upper = Math.ceil(position);
  if (lower === upper) return sorted[lower];
  const weight = position - lower;
  return sorted[lower] * (1 - weight) + sorted[upper] * weight;
}

function median(values) {
  const sorted = [...values].sort((a, b) => a - b);
  return quantileSorted(sorted, 0.5);
}

function mean(values) {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function upperBound(edges, value) {
  let low = 0;
  let high = edges.length;
  while (low < high) {
    const middle = (low + high) >>> 1;
    if (value <= edges[middle]) high = middle;
    else low = middle + 1;
  }
  return low;
}

function buildBins(X, maxBins) {
  const featureCount = X[0] ? X[0].length : 0;
  const bins = [];
  for (let feature = 0; feature < featureCount; feature += 1) {
    const values = X.map((row) => Number(row[feature])).filter(Number.isFinite);
    if (!values.length) {
      bins.push([]);
      continue;
    }
    values.sort((a, b) => a - b);
    const edges = [];
    for (let index = 1; index < maxBins; index += 1) {
      const position = Math.floor((values.length - 1) * (index / maxBins));
      const edge = values[position];
      if (edges.length === 0 || edge > edges[edges.length - 1]) edges.push(edge);
    }
    bins.push(edges);
  }
  return bins;
}

function binMatrix(X, bins) {
  const featureCount = bins.length;
  const rowCount = X.length;
  const columns = bins.map(() => new Uint16Array(rowCount));
  for (let rowIndex = 0; rowIndex < rowCount; rowIndex += 1) {
    const row = X[rowIndex];
    for (let feature = 0; feature < featureCount; feature += 1) {
      const value = Number(row[feature]);
      columns[feature][rowIndex] = Number.isFinite(value) ? upperBound(bins[feature], value) : 0;
    }
  }
  return columns;
}

class GradientBoostedRegressor {
  constructor(options = {}) {
    this.nEstimators = Number(options.nEstimators) || 50;
    this.learningRate = Number(options.learningRate) || 0.08;
    this.maxDepth = Number(options.maxDepth) || 3;
    this.minSamplesLeaf = Number(options.minSamplesLeaf) || 8;
    this.maxBins = Number(options.maxBins) || 24;
    this.lambda = Number(options.lambda) || 1;
    this.subsample = Number(options.subsample) || 0.8;
    this.objective = options.objective || "l2";
    this.quantile = Number(options.quantile) || 0.5;
    this.tweediePower = Number(options.tweediePower) || 1.5;
    this.seed = Number(options.seed) || 42;
    this.trees = [];
    this.bins = [];
    this.baseRaw = 0;
    this.link = this.objective === "poisson" || this.objective === "tweedie" ? "log" : "identity";
    this.featureImportance = [];
  }

  fit(X, y) {
    if (!Array.isArray(X) || !Array.isArray(y) || X.length !== y.length || X.length === 0) {
      throw new Error("GBM requiere X e y con la misma longitud y al menos una fila");
    }
    const featureCount = X[0].length;
    this.bins = buildBins(X, this.maxBins);
    const Xb = binMatrix(X, this.bins);
    const rng = mulberry32(this.seed);
    const target = y.map((value) => Math.max(0, Number(value) || 0));
    this.featureImportance = new Array(featureCount).fill(0);

    if (this.link === "log") {
      this.baseRaw = Math.log(Math.max(mean(target), 1e-6));
    } else if (this.objective === "quantile") {
      this.baseRaw = median(target);
    } else {
      this.baseRaw = mean(target);
    }

    const raw = new Float64Array(target.length).fill(this.baseRaw);
    const sampleCount = Math.max(1, Math.floor(target.length * Math.max(0.1, Math.min(1, this.subsample))));
    const indices = target.map((_, index) => index);

    for (let iteration = 0; iteration < this.nEstimators; iteration += 1) {
      const prediction = raw.map((value) => this._link(value));
      const gradient = new Float64Array(target.length);
      const hessian = new Float64Array(target.length);
      for (let index = 0; index < target.length; index += 1) {
        const values = this._gradient(prediction[index], target[index]);
        gradient[index] = values.gradient;
        hessian[index] = values.hessian;
      }

      let sampled = indices;
      if (sampleCount < target.length) {
        sampled = [];
        const copy = [...indices];
        for (let count = 0; count < sampleCount; count += 1) {
          const position = Math.floor(rng() * copy.length);
          sampled.push(copy[position]);
          copy[position] = copy[copy.length - 1];
          copy.pop();
        }
      }

      const tree = this._buildTree(sampled, Xb, gradient, hessian, target, prediction, 0);
      this.trees.push(tree);
      for (let index = 0; index < target.length; index += 1) {
        raw[index] += this.learningRate * this._treePredict(tree, X[index]);
      }
    }

    return this;
  }

  predictRow(row) {
    let raw = this.baseRaw;
    for (const tree of this.trees) raw += this.learningRate * this._treePredict(tree, row);
    return Math.max(0, this._link(raw));
  }

  predict(X) {
    return X.map((row) => this.predictRow(row));
  }

  topFeatures(limit = 10) {
    return this.featureImportance
      .map((importance, index) => ({ index, importance }))
      .sort((a, b) => b.importance - a.importance)
      .slice(0, limit);
  }

  _link(raw) {
    if (this.link === "log") return Math.exp(Math.max(-20, Math.min(20, raw)));
    return raw;
  }

  _gradient(prediction, target) {
    if (this.objective === "quantile") {
      const gradient = target > prediction ? -this.quantile : 1 - this.quantile;
      return { gradient, hessian: 1 };
    }
    if (this.objective === "poisson") {
      return { gradient: prediction - target, hessian: Math.max(prediction, 1e-6) };
    }
    if (this.objective === "tweedie") {
      const power = this.tweediePower;
      const mu = Math.max(prediction, 1e-6);
      const gradient = Math.pow(mu, 2 - power) - target * Math.pow(mu, 1 - power);
      const hessian = Math.max((2 - power) * Math.pow(mu, 2 - power), 1e-6);
      return { gradient, hessian };
    }
    return { gradient: prediction - target, hessian: 1 };
  }

  _buildTree(indices, Xb, gradient, hessian, target, prediction, depth) {
    const node = { feature: -1, threshold: 0, value: 0, left: null, right: null };
    let sumGradient = 0;
    let sumHessian = 0;
    for (const index of indices) {
      sumGradient += gradient[index];
      sumHessian += hessian[index];
    }
    const leafValue = this._leafValue(indices, target, prediction, sumGradient, sumHessian);
    node.value = leafValue;
    if (depth >= this.maxDepth || indices.length < this.minSamplesLeaf * 2) return node;

    const featureCount = Xb.length;
    let bestGain = 0;
    let bestFeature = -1;
    let bestBin = -1;
    const binCount = this.maxBins;
    const totalH = sumHessian + this.lambda;

    for (let feature = 0; feature < featureCount; feature += 1) {
      const featureBinCount = this.bins[feature].length;
      if (featureBinCount === 0) continue;
      const column = Xb[feature];
      const gradHist = new Float64Array(binCount);
      const hessHist = new Float64Array(binCount);
      const countHist = new Int32Array(binCount);
      for (let position = 0; position < indices.length; position += 1) {
        const index = indices[position];
        const bin = column[index];
        gradHist[bin] += gradient[index];
        hessHist[bin] += hessian[index];
        countHist[bin] += 1;
      }
      let leftGradient = 0;
      let leftHessian = 0;
      let leftCount = 0;
      for (let bin = 0; bin < featureBinCount; bin += 1) {
        leftGradient += gradHist[bin];
        leftHessian += hessHist[bin];
        leftCount += countHist[bin];
        const rightCount = indices.length - leftCount;
        if (leftCount < this.minSamplesLeaf || rightCount < this.minSamplesLeaf) continue;
        const rightGradient = sumGradient - leftGradient;
        const rightHessian = sumHessian - leftHessian;
        const gain =
          (leftGradient * leftGradient) / (leftHessian + this.lambda) +
          (rightGradient * rightGradient) / (rightHessian + this.lambda) -
          (sumGradient * sumGradient) / totalH;
        if (gain > bestGain) {
          bestGain = gain;
          bestFeature = feature;
          bestBin = bin;
        }
      }
    }

    if (bestFeature < 0 || bestGain <= 1e-12) return node;

    const bestColumn = Xb[bestFeature];
    const leftIndices = [];
    const rightIndices = [];
    for (const index of indices) {
      if (bestColumn[index] <= bestBin) leftIndices.push(index);
      else rightIndices.push(index);
    }
    if (leftIndices.length < this.minSamplesLeaf || rightIndices.length < this.minSamplesLeaf) return node;

    node.feature = bestFeature;
    node.threshold = this.bins[bestFeature][bestBin] ?? 0;
    node.left = this._buildTree(leftIndices, Xb, gradient, hessian, target, prediction, depth + 1);
    node.right = this._buildTree(rightIndices, Xb, gradient, hessian, target, prediction, depth + 1);
    this.featureImportance[bestFeature] += bestGain;
    return node;
  }

  _leafValue(indices, target, prediction, sumGradient, sumHessian) {
    if (this.objective === "quantile") {
      const residuals = indices.map((index) => target[index] - prediction[index]).sort((a, b) => a - b);
      return quantileSorted(residuals, this.quantile);
    }
    return -sumGradient / (sumHessian + this.lambda);
  }

  _treePredict(node, row) {
    if (node.feature < 0) return node.value;
    const value = Number(row[node.feature]);
    return value <= node.threshold ? this._treePredict(node.left, row) : this._treePredict(node.right, row);
  }
}

module.exports = { GradientBoostedRegressor, buildBins, median, quantileSorted };
